// src/app/dashboard/samples/_components/storage-grid-slot-picker.tsx

'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StorageOption } from '@/hooks/use-storage-options';
import { getGridCoordinateLabel } from '@/lib/storage-utils';
import { StorageGrid, GridSlotData } from '@/components/storage/storage-grid';

export type GridLabelSchema = 'alpha-numeric' | 'numeric' | 'custom' | undefined;

type StorageGridSlotPickerProps = {
  storage: StorageOption;
  value?: string;
  onChange: (value?: string) => void;
  onAutoAssign?: () => void;
  additionalOccupiedSlots?: Set<string>;
  batchOccupiedSlots?: Set<string>;
};

export function StorageGridSlotPicker({ storage, value, onChange, onAutoAssign, additionalOccupiedSlots, batchOccupiedSlots }: StorageGridSlotPickerProps) {
  const gridSpec = storage.gridSpec;
  if (!gridSpec) return null;

  const normalizeLabel = (label?: string | null) => label?.toString().trim().toUpperCase() ?? null;

  const disabledCells = useMemo(() => {
    const slots = gridSpec.disabled_slots ?? [];
    return new Set(slots.map((slot) => normalizeLabel(slot)).filter(Boolean) as string[]);
  }, [gridSpec.disabled_slots]);

  const occupiedMap = useMemo(() => {
    const map = new Map<string, { id: string; label: string; type: 'sample' | 'dna_extract' | 'batch' | 'unknown' }>();

    if (storage.occupiedSlots) {
      Object.entries(storage.occupiedSlots).forEach(([slot, occupant]) => {
        const normalized = normalizeLabel(slot);
        if (normalized) {
          map.set(normalized, {
            id: typeof occupant === 'string' ? occupant : String(occupant),
            label: typeof occupant === 'string' ? occupant : String(occupant),
            type: 'unknown'
          });
        }
      });
    }

    // Merge additional occupied slots (e.g. from live sample query)
    if (additionalOccupiedSlots) {
      additionalOccupiedSlots.forEach(slot => {
        const normalized = normalizeLabel(slot);
        if (normalized && !map.has(normalized)) {
          map.set(normalized, {
            id: 'occupied',
            label: 'Occupied',
            type: 'unknown'
          });
        }
      });
    }

    return map;
  }, [storage.occupiedSlots, additionalOccupiedSlots]);

  const batchOccupiedSet = useMemo(() => {
    const set = new Set<string>();
    if (batchOccupiedSlots) {
      batchOccupiedSlots.forEach(slot => {
        const normalized = normalizeLabel(slot);
        if (normalized) set.add(normalized);
      });
    }
    return set;
  }, [batchOccupiedSlots]);

  // Merge batch occupied into occupiedMap for visualization
  const finalOccupiedSlots = useMemo(() => {
    const map = new Map(occupiedMap);
    batchOccupiedSet.forEach(slot => {
      if (!map.has(slot)) {
        map.set(slot, {
          id: 'batch',
          label: 'Batch',
          type: 'batch'
        });
      }
    });
    return map;
  }, [occupiedMap, batchOccupiedSet]);

  const rows = gridSpec.rows ?? 0;
  const cols = gridSpec.cols ?? 0;
  if (rows <= 0 || cols <= 0) return null;

  const autoAssign = () => {
    if (!onAutoAssign) return;
    onAutoAssign();
  };

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex gap-2">
          <span>Total: {storage.theoreticalSlots ?? rows * cols}</span>
          <span>Effective: {storage.effectiveSlots ?? '—'}</span>
          <span>Available: {storage.availableSlots ?? '—'}</span>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={autoAssign}>Auto-assign</Button>
      </div>

      <StorageGrid
        storage={storage as any}
        mode="select"
        occupiedSlots={finalOccupiedSlots}
        selectedSlot={value}
        onSlotClick={(slot: string, data: GridSlotData) => {
          // Don't allow selecting occupied slots unless it's the current value (which shouldn't happen if occupied)
          // But wait, if I'm editing a sample, I might be the occupant.
          // For now, let's assume the picker is for *new* assignment or *moving* to an empty slot.
          if (data.isOccupied && data.occupantType !== 'batch') return;
          // Allow selecting batch slots? Maybe not.
          if (data.occupantType === 'batch') return;

          onChange(slot);
        }}
        showStats={false}
        showLegend={true}
      />
    </div>
  );
}
