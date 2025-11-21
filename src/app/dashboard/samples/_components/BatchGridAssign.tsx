import React from 'react';
import { useMemo } from 'react';
import { StorageOption } from '@/hooks/use-storage-options';
import { StorageGrid, GridSlotData } from '@/components/storage/storage-grid';

export type BatchGridAssignProps = {
    storage: StorageOption;
    batchOccupiedSlots: Set<string>;
    dbOccupiedSlots: Set<string>;
    selectedSlot?: string;
    onSlotClick: (slot: string) => void;
    highlightedSlots?: Set<string>;
};

export function BatchGridAssign({
    storage,
    batchOccupiedSlots,
    dbOccupiedSlots,
    selectedSlot,
    onSlotClick,
    highlightedSlots,
}: BatchGridAssignProps) {
    // Prepare occupied slots map for StorageGrid
    const occupiedSlots = useMemo(() => {
        const map = new Map<string, { id: string; label: string; type: 'sample' | 'dna_extract' | 'batch' | 'unknown' }>();

        // DB Occupied
        dbOccupiedSlots.forEach(slot => {
            map.set(slot.toUpperCase(), {
                id: 'occupied',
                label: 'Occupied',
                type: 'unknown'
            });
        });

        // Batch Occupied
        batchOccupiedSlots.forEach(slot => {
            const normalized = slot.toUpperCase();
            // If it's already in DB occupied, DB takes precedence visually (or maybe batch should to show conflict?)
            // Let's say batch overrides to show "this will be here"
            map.set(normalized, {
                id: 'batch',
                label: 'Batch',
                type: 'batch'
            });
        });

        return map;
    }, [dbOccupiedSlots, batchOccupiedSlots]);

    return (
        <div className="flex flex-col gap-1 overflow-auto p-2">
            <StorageGrid
                storage={storage as any}
                mode="assign" // Allows dropping items
                occupiedSlots={occupiedSlots}
                selectedSlot={selectedSlot}
                highlightedSlots={highlightedSlots}
                onSlotClick={(slot, data) => {
                    // Allow clicking if not DB occupied (or if we want to allow replacing)
                    if (!data.isDisabled && data.occupantType !== 'unknown') {
                        onSlotClick(slot);
                    }
                }}
                onSlotAssign={(item, toSlot) => {
                    // Handle drop event from external source (the list)
                    // The item.id should be the index or ID of the sample being dragged
                    // We need to bubble this up.
                    // But wait, onSlotClick is used for manual selection.
                    // Drag and drop assignment logic needs to be handled by the parent or we need a new prop.
                    // The current BatchGridAssign didn't seem to have onDrop prop in the interface, 
                    // it used useDroppable internally and the parent handled DragEnd.
                    // So we just need to make sure StorageGrid exposes droppable slots.
                    // StorageGrid does expose droppable slots with id `slot-{label}`.
                    // The parent (ImportStepResolve) likely has a DndContext.
                    // If StorageGrid ALSO has a DndContext, they might conflict if nested.
                    // StorageGrid HAS a DndContext.
                    // Nested DndContexts can be tricky.
                    // If the parent controls the drag, StorageGrid should probably NOT have a DndContext 
                    // OR we should use the parent's context.
                    // BUT StorageGrid is designed to be self-contained for internal moves.
                    // For external drags (assign mode), we might need to disable the internal DndContext 
                    // or ensure it works with the parent.

                    // However, looking at the previous BatchGridAssign, it ONLY used useDroppable.
                    // It did NOT have a DndContext. The DndContext was likely in the parent dialog.
                    // So StorageGrid having a DndContext is a problem for this use case.
                }}
                showStats={false}
                showLegend={false}
                useInternalDndContext={false}
            />
        </div>
    );
}
