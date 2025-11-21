'use client';

import { useMemo } from 'react';
import { collection, query, orderBy } from 'firebase/firestore';

import { useCollection, useFirestore, useUser } from '@/firebase';
import { FirestorePermissionError } from '@/firebase/errors';
import { StorageType } from '@/lib/types';

export type StorageTypeResult = {
  types: StorageType[];
  typesById: Map<string, StorageType>;
  isLoading: boolean;
  error?: Error;
  isPermissionDenied: boolean;
};

export function useStorageTypes(): StorageTypeResult {
  const firestore = useFirestore();
  const { user } = useUser();

  const storageTypesQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'storage_types'), orderBy('name', 'asc'));
  }, [firestore, user]);

  const {
    data: storageTypes,
    isLoading,
    error,
  } = useCollection<StorageType>(storageTypesQuery);

  const isPermissionDenied = error instanceof FirestorePermissionError;

  const types = storageTypes ?? [];
  const typesById = useMemo(() => new Map(types.map((type) => [type.id, type])), [types]);

  return {
    types,
    typesById,
    isLoading,
    error: error ?? undefined,
    isPermissionDenied,
  };
}
