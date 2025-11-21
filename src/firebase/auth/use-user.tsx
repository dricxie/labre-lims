// src/firebase/auth/use-user.tsx
'use client';

import { useState, useEffect } from 'react';
import { onIdTokenChanged } from 'firebase/auth';
import { useAuth, useFirebase } from '@/firebase/provider';
import { AuthenticatedUser } from '@/lib/types';

export interface UserState {
  user: AuthenticatedUser | null;
  isLoading: boolean;
  error: Error | null;
}

export type UseUserReturn = UserState;

/**
 * Internal hook that subscribes to Firebase Auth and produces the shared user state.
 * This should only be used by the FirebaseUserProvider.
 */
export const useFirebaseAuthState = (): UserState => {
  const auth = useAuth();
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(
      auth,
      async (firebaseUser) => {
        try {
          if (firebaseUser) {
            const tokenResult = await firebaseUser.getIdTokenResult(true);
            const unifiedUser: AuthenticatedUser = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              role: tokenResult.claims.role as AuthenticatedUser['role'] | undefined,
              displayName: firebaseUser.displayName,
            };

            setUser(unifiedUser);
          } else {
            setUser(null);
          }
        } catch (e: any) {
          setError(e);
        } finally {
          setIsLoading(false);
        }
      },
      (err) => {
        setError(err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [auth]);

  return { user, isLoading, error };
};

/**
 * Public hook for accessing the authenticated user state from anywhere in the app.
 * It simply reads the values produced by the Firebase context so that every
 * consumer shares the same auth subscription.
 */
export const useUser = (): UserState => {
  const { user, isLoading, error } = useFirebase();
  return { user, isLoading, error };
};