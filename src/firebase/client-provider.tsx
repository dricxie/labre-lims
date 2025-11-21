'use client';

import React, { type ReactNode } from 'react';
import { FirebaseProvider, FirebaseUserProvider } from '@/firebase/provider';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

/**
 * This component ensures that the FirebaseProvider, which contains client-side
 * logic for initialization and authentication, is only rendered on the client.
 */
export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  return (
    <FirebaseProvider>
      <FirebaseUserProvider>{children}</FirebaseUserProvider>
    </FirebaseProvider>
  );
}
