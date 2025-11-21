'use client';

import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { Auth } from 'firebase/auth';

import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { initializeFirebase } from '@/firebase/index';
import { useFirebaseAuthState, type UserState } from '@/firebase/auth/use-user';

// Define the shape of the core SDK context
interface FirebaseSDKs {
    firebaseApp: FirebaseApp;
    auth: Auth;
    firestore: Firestore;
}

// Internal context for SDKs only
const FirebaseSDKContext = createContext<FirebaseSDKs | undefined>(undefined);

// Define the shape of the full context state, combining SDKs and user state.
export interface FirebaseContextState extends UserState, FirebaseSDKs {}

// Public context that includes user state
export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

/**
 * Hook to access the full Firebase context, including SDKs and user state.
 * Throws an error if used outside of a FirebaseUserProvider.
 */
export const useFirebase = (): FirebaseContextState => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseUserProvider, which should be wrapped in a FirebaseProvider.');
  }
  return context;
};

/** Hook to access the Firebase Auth instance directly. */
export const useAuth = (): Auth => {
  const sdkContext = useContext(FirebaseSDKContext);
  if(sdkContext === undefined) {
    throw new Error('useAuth must be used within a FirebaseProvider');
  }
  return sdkContext.auth;
};

/** Hook to access the Firestore instance directly. */
export const useFirestore = (): Firestore => {
  const sdkContext = useContext(FirebaseSDKContext);
  if(sdkContext === undefined) {
    throw new Error('useFirestore must be used within a FirebaseProvider');
  }
  return sdkContext.firestore;
};

/** Hook to access the Firebase App instance directly. */
export const useFirebaseApp = (): FirebaseApp => {
  const sdkContext = useContext(FirebaseSDKContext);
  if(sdkContext === undefined) {
    throw new Error('useFirebaseApp must be used within a FirebaseProvider');
  }
  return sdkContext.firebaseApp;
};

/**
 * A client-side component that initializes and provides only the Firebase SDKs.
 * This should be the top-level provider.
 */
export const FirebaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const sdks = useMemo(() => initializeFirebase(), []);

  return (
    <FirebaseSDKContext.Provider value={sdks}>
      {children}
    </FirebaseSDKContext.Provider>
  );
};


/**
 * A client-side component that consumes the SDK context, adds user state,
 * and provides the complete, enriched context.
 */
export const FirebaseUserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const sdks = useContext(FirebaseSDKContext);
  const userState = useFirebaseAuthState();

  if (!sdks) {
    throw new Error("FirebaseUserProvider must be wrapped by FirebaseProvider.");
  }

  const contextValue = useMemo<FirebaseContextState>(() => ({
    ...sdks,
    ...userState,
  }), [sdks, userState]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};
