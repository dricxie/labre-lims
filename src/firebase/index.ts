'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

interface FirebaseSdks {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
}

// This variable will hold the singleton instances of the Firebase services.
let firebaseSdks: FirebaseSdks | null = null;

/**
 * Initializes the Firebase application and SDKs if they haven't been already.
 * This function is designed to be called safely from anywhere in the client-side
 * application, ensuring that Firebase is only initialized once.
 *
 * It prioritizes initialization via Firebase App Hosting's automatic environment
 * variables but falls back to the local `firebaseConfig` object for development
 * and other environments.
 *
 * @returns {FirebaseSdks} An object containing the initialized FirebaseApp, Auth, and Firestore instances.
 */
export function initializeFirebase(): FirebaseSdks {
  // If the SDKs are already initialized, return the existing instances.
  if (firebaseSdks) {
    return firebaseSdks;
  }

  let app: FirebaseApp;
  if (!getApps().length) {
    try {
      // Recommended for Firebase App Hosting: auto-initialization from env vars.
      app = initializeApp();
    } catch (e) {
      // Fallback for local development or other hosting environments.
      if (process.env.NODE_ENV === 'production') {
        console.warn('Automatic Firebase initialization failed. Falling back to local firebaseConfig.', e);
      }
      app = initializeApp(firebaseConfig);
    }
  } else {
    // If an app is already initialized, get the existing instance.
    app = getApp();
  }

  // Create the SDK instances and store them in the singleton variable.
  firebaseSdks = {
    firebaseApp: app,
    auth: getAuth(app),
    firestore: getFirestore(app),
  };

  return firebaseSdks;
}


// Export the core providers, hooks, and utilities for easy consumption.
export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './auth/use-user';
export * from './errors';
export * from './error-emitter';
