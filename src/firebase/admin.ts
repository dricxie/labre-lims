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
 * It tries to load credentials from 'serviceAccountKey.json' in the project root.
 * If not found, it falls back to default credentials (ADC).
 *
 * @returns {App} The initialized Firebase Admin App instance.
 */
export function initializeAdminApp(): App {
  // If the default app is already initialized, return it.
  if (getApps().find(app => app.name === '[DEFAULT]')) {
    return getApp();
  }

  // Try to load service account from file if available locally
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

  console.log('Falling back to ADC for Firebase Admin');
  // Otherwise, initialize the default app and return it.
  return initializeApp();
}
