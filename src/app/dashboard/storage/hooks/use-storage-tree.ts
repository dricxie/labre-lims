// src/app/dashboard/storage/hooks/use-storage-tree.ts

"use client";

import { useMemo } from "react";
import { collection, query } from "firebase/firestore";

import { useCollection, useFirestore, useUser } from "@/firebase";
import { Sample, StorageUnit, DnaExtract } from "@/lib/types";
import { buildPathFromAncestors, deriveCapacitySnapshotFromUnit } from "@/lib/storage-utils";

export type StorageTreeData = {
  storageUnits: StorageUnit[];
  samples: Sample[];
  nodesById: Map<string, StorageUnit>;
  childrenByParent: Map<string | null, string[]>;
  rootIds: string[];
  samplesByStorage: Map<string, Sample[]>;
  extractsByStorage: Map<string, DnaExtract[]>;
  storageTypes: string[];
  stats: {
    totalUnits: number;
    totalSamples: number;
    totalExtracts: number;
  };
  isLoading: boolean;
  error?: Error;
};

const emptyMap: Map<string, StorageUnit> = new Map();
const emptyChildMap: Map<string | null, string[]> = new Map();
const emptySampleMap: Map<string, Sample[]> = new Map();
const emptyExtractMap: Map<string, DnaExtract[]> = new Map();

export function useStorageTreeData(): StorageTreeData {
  const firestore = useFirestore();
  const { user } = useUser();

  const storageQuery = useMemo(() => {
    if (!firestore || !user) return null;
    // TODO: filter by tenant / owner when multi-tenant data is available.
    return query(collection(firestore, "storage_units"));
  }, [firestore, user]);

  const samplesQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, "samples"));
  }, [firestore, user]);

  const extractsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, "dna_extracts"));
  }, [firestore, user]);

  const {
    data: storageUnits,
    isLoading: isLoadingStorage,
    error: storageError,
  } = useCollection<StorageUnit>(storageQuery);
  const {
    data: samples,
    isLoading: isLoadingSamples,
    error: samplesError,
  } = useCollection<Sample>(samplesQuery);

  const {
    data: extracts,
    isLoading: isLoadingExtracts,
    error: extractsError,
  } = useCollection<DnaExtract>(extractsQuery);

  const processedUnits = useMemo(() => {
    if (!storageUnits) return null;
    const lookup = new Map(storageUnits.map((unit) => [unit.id, unit]));
    return storageUnits.map((unit) => {
      const { pathIds, pathNames, fullPath, depth } = buildPathFromAncestors(unit, lookup);
      const capacitySnapshot = deriveCapacitySnapshotFromUnit(unit);
      const theoreticalSlots = unit.theoretical_slots ?? capacitySnapshot?.theoretical ?? undefined;
      const effectiveSlots = unit.effective_slots ?? capacitySnapshot?.effective ?? undefined;
      return {
        ...unit,
        path_ids: pathIds,
        path_names: pathNames,
        full_path: fullPath,
        depth: unit.depth ?? depth,
        capacitySnapshot: capacitySnapshot ?? unit.capacitySnapshot,
        theoretical_slots: theoreticalSlots,
        effective_slots: effectiveSlots,
        // occupied_slots is deprecated and will be removed.
        // We rely on sample_count for tree visualization.
        // Slot data should be fetched separately when viewing the grid.
      } satisfies StorageUnit;
    });
  }, [storageUnits]);

  const nodesById = useMemo(() => {
    if (!processedUnits) return emptyMap;
    return new Map(processedUnits.map((unit) => [unit.id, unit]));
  }, [processedUnits]);

  const childrenByParent = useMemo(() => {
    if (!processedUnits) return emptyChildMap;
    const map = new Map<string | null, string[]>();
    for (const unit of processedUnits) {
      const parentKey = unit.parent_storage_id ?? null;
      if (!map.has(parentKey)) {
        map.set(parentKey, []);
      }
      map.get(parentKey)!.push(unit.id);
    }
    return map;
  }, [processedUnits]);

  const rootIds = useMemo(() => {
    if (!processedUnits) return [];
    const roots: string[] = [];
    for (const unit of processedUnits) {
      if (!unit.parent_storage_id || !nodesById.has(unit.parent_storage_id)) {
        roots.push(unit.id);
      }
    }
    return roots;
  }, [processedUnits, nodesById]);

  const samplesByStorage = useMemo(() => {
    if (!samples) return emptySampleMap;
    const map = new Map<string, Sample[]>();
    for (const sample of samples) {
      const key = sample.storage_location_id;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(sample);
    }
    return map;
  }, [samples]);

  const extractsByStorage = useMemo(() => {
    if (!extracts) return emptyExtractMap;
    const map = new Map<string, DnaExtract[]>();
    for (const extract of extracts) {
      const key = extract.storage_location_id;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(extract);
    }
    return map;
  }, [extracts]);

  const storageTypes = useMemo(() => {
    if (!processedUnits) return [];
    return Array.from(new Set(processedUnits.map((unit) => unit.type))).sort();
  }, [processedUnits]);

  const combinedError = (storageError ?? undefined) || (samplesError ?? undefined) || (extractsError ?? undefined);

  return {
    storageUnits: processedUnits ?? [],
    samples: samples ?? [],
    nodesById,
    childrenByParent,
    rootIds,
    samplesByStorage,
    extractsByStorage,
    storageTypes,
    stats: {
      totalUnits: processedUnits?.length ?? 0,
      totalSamples: samples?.length ?? 0,
      totalExtracts: extracts?.length ?? 0,
    },
    isLoading: isLoadingStorage || isLoadingSamples || isLoadingExtracts,
    error: combinedError,
  };
}
