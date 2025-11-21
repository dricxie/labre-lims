'use client';

import { useMemo } from 'react';
import { collection, query } from 'firebase/firestore';

import { useCollection, useFirestore, useUser } from '@/firebase';
import { StorageUnit } from '@/lib/types';
import { buildPathFromAncestors, deriveCapacitySnapshotFromUnit } from '@/lib/storage-utils';

export type StorageOption = {
  id: string;
  storageId: string;
  name: string;
  type: string;
  breadcrumb: string;
  fullPath: string;
  pathIds: string[];
  pathNames: string[];
  depth?: number;
  temperature?: number;
  temperatureMin?: number | null;
  temperatureMax?: number | null;
  childCount?: number;
  sampleCount?: number;
  gridSpec?: StorageUnit['grid_spec'];
  gridTemplate?: StorageUnit['grid_spec'];
  occupiedSlots?: Record<string, string>;
  capacityMode?: StorageUnit['capacity_mode'];
  theoreticalSlots?: number;
  effectiveSlots?: number;
  availableSlots?: number;
  capacitySnapshot?: ReturnType<typeof deriveCapacitySnapshotFromUnit>;
};

export type StorageOptionsResult = {
  options: StorageOption[];
  optionsById: Map<string, StorageOption>;
  isLoading: boolean;
  error?: Error;
};

export function useStorageOptions(): StorageOptionsResult {
  const firestore = useFirestore();
  const { user } = useUser();

  const storageQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'storage_units'));
  }, [firestore, user]);

  const {
    data: storageUnits,
    isLoading,
    error,
  } = useCollection<StorageUnit>(storageQuery);

  const unitsById = useMemo(() => {
    if (!storageUnits) return new Map<string, StorageUnit>();
    return new Map(storageUnits.map((unit) => [unit.id, unit]));
  }, [storageUnits]);

  const options = useMemo<StorageOption[]>(() => {
    if (!storageUnits) return [];
    return storageUnits
      .map((unit) => {
        const { pathIds, pathNames, fullPath, depth } = buildPathFromAncestors(unit, unitsById);
        const gridTemplate = unit.grid_spec ?? unit.grid_template;
        const occupiedSlots = unit.occupied_slots ?? {};
        const capacitySnapshot = deriveCapacitySnapshotFromUnit(unit);
        const theoreticalSlots = capacitySnapshot?.theoretical ?? unit.theoretical_slots;
        const effectiveSlots = capacitySnapshot?.effective ?? unit.effective_slots;
        const availableSlots = capacitySnapshot?.available ?? undefined;
        const resolvedDepth = unit.depth ?? depth;
        return {
          id: unit.id,
          storageId: unit.storage_id,
          name: unit.name,
          type: unit.type,
          breadcrumb: fullPath,
          fullPath,
          pathIds,
          pathNames,
          depth: resolvedDepth,
          temperature: unit.temperature,
          temperatureMin: unit.temperature_min ?? null,
          temperatureMax: unit.temperature_max ?? null,
          childCount: unit.child_count,
          sampleCount: unit.sample_count,
          gridSpec: gridTemplate,
          gridTemplate,
          occupiedSlots,
          capacityMode: unit.capacity_mode,
          theoreticalSlots,
          effectiveSlots,
          availableSlots,
          capacitySnapshot,
        } satisfies StorageOption;
      })
      .sort((a, b) => a.breadcrumb.localeCompare(b.breadcrumb));
  }, [storageUnits, unitsById]);

  const optionsById = useMemo(() => {
    return new Map(options.map((option) => [option.id, option]));
  }, [options]);

  return {
    options,
    optionsById,
    isLoading,
    error: error ?? undefined,
  };
}
