// src/app/dashboard/storage/hooks/use-storage-search.ts

'use client';

import { useMemo } from 'react';
import Fuse from 'fuse.js';
import type { IFuseOptions } from 'fuse.js';

import { Sample, StorageUnit } from '@/lib/types';

type SearchEntry = {
  kind: 'storage' | 'sample';
  refId: string;
  storageId?: string;
  labels: string[];
};

type StorageSearchResult = {
  refId: string;
  kind: 'storage' | 'sample';
  label: string;
  score: number;
  storageId?: string;
};

const fuseOptions: IFuseOptions<SearchEntry> = {
  includeScore: true,
  threshold: 0.35,
  ignoreLocation: true,
  keys: ['labels'],
};

export function useStorageSearch(
  query: string,
  nodesById: Map<string, StorageUnit>,
  samples: Sample[]
): {
  matchingNodeIds: Set<string>;
  matchingSampleIds: Set<string>;
  results: StorageSearchResult[];
} {
  const trimmedQuery = query.trim();

  const dataset = useMemo<SearchEntry[]>(() => {
    const entries: SearchEntry[] = [];

    nodesById.forEach((unit) => {
      entries.push({
        kind: 'storage',
        refId: unit.id,
        labels: [unit.name, unit.storage_id, unit.type, ...(unit.path_names ?? [])].filter(Boolean) as string[],
      });
    });

    for (const sample of samples) {
      entries.push({
        kind: 'sample',
        refId: sample.id ?? sample.sample_id,
        storageId: sample.storage_location_id,
        labels: [sample.sample_id, sample.barcode, sample.position_label, sample.project_id].filter(Boolean) as string[],
      });
    }

    return entries;
  }, [nodesById, samples]);

  const fuse = useMemo(() => new Fuse(dataset, fuseOptions), [dataset]);

  return useMemo(() => {
    if (!trimmedQuery) {
      return {
        matchingNodeIds: new Set<string>(),
        matchingSampleIds: new Set<string>(),
        results: [],
      };
    }

    const hits = fuse.search(trimmedQuery);
    const nodeIds = new Set<string>();
    const sampleIds = new Set<string>();

    const results: StorageSearchResult[] = hits.slice(0, 12).map((hit) => ({
      refId: hit.item.refId,
      kind: hit.item.kind,
      label: hit.item.labels[0] ?? hit.item.refId,
      score: hit.score ?? 0,
      storageId: hit.item.kind === 'storage' ? hit.item.refId : hit.item.storageId,
    }));

    for (const hit of hits) {
      if (hit.item.kind === 'storage') {
        nodeIds.add(hit.item.refId);
      } else {
        sampleIds.add(hit.item.refId);
        if (hit.item.storageId) {
          nodeIds.add(hit.item.storageId);
        }
      }
    }

    return {
      matchingNodeIds: nodeIds,
      matchingSampleIds: sampleIds,
      results,
    };
  }, [trimmedQuery, fuse]);
}
