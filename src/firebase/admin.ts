import { initializeApp, getApps, getApp, App, cert } from 'firebase-admin/app';
import * as fs from 'fs';
import * as path from 'path';

// This is a server-only file.

/**
 * Initializes and returns a Firebase Admin App instance.
 *
 * This function ensures that the Firebase Admin SDK is initialized only once
 * (singleton pattern) on the server, making it safe to call from multiple
 * server actions or API routes.
 *
 * Priority order for credentials:
 * 1. Environment variables (for Vercel/production)
 * 2. serviceAccountKey.json file (for local development)
 * 3. Application Default Credentials (ADC)
 *
 * @returns {App} The initialized Firebase Admin App instance.
 */
export function initializeAdminApp(): App {
  // If the default app is already initialized, return it.
  if (getApps().find(app => app.name === '[DEFAULT]')) {
    return getApp();
  }

  // 1. Try to use environment variables (for Vercel/production)
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    console.log('Initializing Firebase Admin with environment variables');
    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'), // Handle escaped newlines
      })
    });
  }

  // 2. Try to load service account from file if available locally
  try {
    const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      console.log('Initializing Firebase Admin with serviceAccountKey.json');
      return initializeApp({
        credential: cert(serviceAccount)
      });
    }
  } catch (error) {
    console.warn('Failed to load serviceAccountKey.json:', error);
  }

  // 3. Fall back to ADC (Application Default Credentials)
  console.log('Falling back to ADC for Firebase Admin');
  return initializeApp();
}
