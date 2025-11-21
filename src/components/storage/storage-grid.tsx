'use client';

import React, { useMemo } from 'react';
import {
    DndContext,
    DragOverlay,
    useDraggable,
    useDroppable,
    DragStartEvent,
    DragEndEvent,
    DragOverEvent,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getGridCoordinateLabel } from '@/lib/storage-utils';
import { StorageUnit } from '@/lib/types';

// --- Types ---

export type GridMode = 'readonly' | 'select' | 'move' | 'assign';

export type GridSlotData = {
    label: string;
    isDisabled: boolean;
    isOccupied: boolean;
    occupantId?: string;
    occupantLabel?: string;
    occupantType?: 'sample' | 'dna_extract' | 'batch' | 'unknown';
    isSelected?: boolean;
    isHighlighted?: boolean;
};

export type StorageGridProps = {
    storage: StorageUnit | { gridSpec: StorageUnit['grid_spec']; theoreticalSlots?: number; effectiveSlots?: number; availableSlots?: number };
    mode?: GridMode;

    // Data
    occupiedSlots?: Map<string, { id: string; label: string; type: 'sample' | 'dna_extract' | 'batch' | 'unknown' }>;
    selectedSlot?: string | null;
    highlightedSlots?: Set<string>;

    // Handlers
    onSlotClick?: (slot: string, data: GridSlotData) => void;
    onSlotMove?: (fromSlot: string, toSlot: string) => void;
    onSlotAssign?: (item: any, toSlot: string) => void; // For external drag items

    // Customization
    className?: string;
    showStats?: boolean;
    showLegend?: boolean;
    useInternalDndContext?: boolean;
};

// --- Components ---

function GridSlot({
    data,
    mode,
    onClick,
}: {
    data: GridSlotData;
    mode: GridMode;
    onClick?: () => void;
}) {
    const { label, isDisabled, isOccupied, isSelected, isHighlighted, occupantType, occupantLabel } = data;

    // Droppable for 'move' and 'assign' modes
    const { setNodeRef: setDroppableRef, isOver } = useDroppable({
        id: `slot-${label}`,
        data: { slotLabel: label, isOccupied, isDisabled },
        disabled: isDisabled || (isOccupied && mode !== 'move'), // Allow dropping on occupied slots only if we implement swap (not yet)
    });

    // Draggable for 'move' mode
    const { attributes, listeners, setNodeRef: setDraggableRef, isDragging } = useDraggable({
        id: `item-${label}`,
        data: { slotLabel: label, occupantId: data.occupantId },
        disabled: mode !== 'move' || !isOccupied || isDisabled,
    });

    // Combine refs if needed, or just use div structure
    // We need the slot to be droppable, and the content (if any) to be draggable.

    let bgColor = 'bg-secondary/20 hover:bg-secondary/40';
    let borderColor = 'border-transparent';
    let textColor = 'text-muted-foreground';

    if (isDisabled) {
        bgColor = 'bg-muted opacity-20 cursor-not-allowed';
        borderColor = 'border-transparent';
    } else if (isOccupied) {
        if (occupantType === 'sample') {
            bgColor = 'bg-blue-100 dark:bg-blue-900/20';
            borderColor = 'border-blue-200 dark:border-blue-800';
            textColor = 'text-blue-700 dark:text-blue-300';
        } else if (occupantType === 'dna_extract') {
            bgColor = 'bg-purple-100 dark:bg-purple-900/20';
            borderColor = 'border-purple-200 dark:border-purple-800';
            textColor = 'text-purple-700 dark:text-purple-300';
        } else if (occupantType === 'batch') {
            bgColor = 'bg-blue-500/10';
            borderColor = 'border-blue-500/60';
            textColor = 'text-blue-600';
        } else {
            bgColor = 'bg-destructive/10';
            borderColor = 'border-destructive/60';
            textColor = 'text-destructive';
        }
    } else if (isSelected) {
        bgColor = 'bg-primary/10';
        borderColor = 'border-primary';
        textColor = 'text-primary';
    } else if (isHighlighted) {
        bgColor = 'bg-yellow-100 dark:bg-yellow-900/20';
        borderColor = 'border-yellow-200';
    }

    if (isOver && !isDisabled && (!isOccupied || mode === 'move')) {
        bgColor = 'bg-primary/50';
        borderColor = 'border-primary';
    }

    const isInteractive = !isDisabled && (mode === 'select' || (mode === 'move' && isOccupied) || (mode === 'assign' && !isOccupied));

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div
                        ref={setDroppableRef}
                        className={cn(
                            'relative flex h-9 w-full items-center justify-center rounded border text-xs font-medium transition-all select-none',
                            bgColor,
                            borderColor,
                            textColor,
                            isInteractive && 'cursor-pointer',
                            isDragging && 'opacity-50'
                        )}
                        onClick={onClick}
                    >
                        {/* Draggable Content Wrapper */}
                        {mode === 'move' && isOccupied && !isDisabled ? (
                            <div
                                ref={setDraggableRef}
                                {...listeners}
                                {...attributes}
                                className="flex h-full w-full items-center justify-center"
                            >
                                <span className="truncate px-1 text-[0.65rem] leading-tight">
                                    {occupantLabel || label}
                                </span>
                            </div>
                        ) : (
                            <span className="truncate px-1 text-[0.65rem] leading-tight">
                                {occupantLabel || label}
                            </span>
                        )}

                        {/* Status Indicators */}
                        {isOccupied && occupantType === 'batch' && (
                            <span className="absolute inset-x-0 -bottom-2 text-[0.5rem] text-center text-blue-600 font-bold uppercase tracking-tighter scale-75">
                                Batch
                            </span>
                        )}
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p className="font-semibold">{label}</p>
                    {isOccupied && (
                        <div className="text-xs">
                            <p>Occupied by: {occupantLabel}</p>
                            <p className="capitalize text-muted-foreground">{occupantType?.replace('_', ' ')}</p>
                        </div>
                    )}
                    {isDisabled && <p className="text-xs text-muted-foreground">Slot Disabled</p>}
                    {!isOccupied && !isDisabled && <p className="text-xs text-muted-foreground">Available</p>}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

export function StorageGrid({
    storage,
    mode = 'readonly',
    occupiedSlots = new Map(),
    selectedSlot,
    highlightedSlots,
    onSlotClick,
    onSlotMove,
    onSlotAssign,
    className,
    showStats = true,
    showLegend = true,
    useInternalDndContext = true,
}: StorageGridProps) {
    const gridSpec = 'gridSpec' in storage ? storage.gridSpec : (storage as any).grid_spec; // Handle both StorageUnit and StorageOption shapes roughly

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
    );

    const [activeDragId, setActiveDragId] = React.useState<string | null>(null);

    const { rows, cols, label_schema, disabled_slots } = useMemo(() => {
        return {
            rows: gridSpec?.rows ?? 8,
            cols: gridSpec?.cols ?? 12,
            label_schema: gridSpec?.label_schema ?? 'alpha-numeric',
            disabled_slots: new Set((gridSpec?.disabled_slots ?? []).map((s: string) => s.toUpperCase())),
        };
    }, [gridSpec]);

    const handleDragStart = (event: DragStartEvent) => {
        setActiveDragId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveDragId(null);
        const { active, over } = event;

        if (!over) return;

        const sourceId = active.id as string; // item-A1
        const targetId = over.id as string;   // slot-B2

        // Parse slots from IDs
        // Internal move: source is item-SLOT, target is slot-SLOT
        // External assign: source is arbitrary ID, target is slot-SLOT

        const targetSlot = targetId.replace('slot-', '');

        if (mode === 'move' && onSlotMove) {
            const sourceSlot = sourceId.replace('item-', '');
            if (sourceSlot !== targetSlot) {
                onSlotMove(sourceSlot, targetSlot);
            }
        } else if (mode === 'assign' && onSlotAssign) {
            onSlotAssign(active.data.current, targetSlot);
        }
    };

    if (!gridSpec) {
        return <div className="p-4 text-center text-muted-foreground">No grid configuration available.</div>;
    }

    const totalSlots = rows * cols;
    const disabledCount = disabled_slots.size;
    const occupiedCount = occupiedSlots.size;
    const availableCount = Math.max(0, totalSlots - disabledCount - occupiedCount);

    const gridContent = (
        <div className={cn("space-y-4", className)}>
            {showStats && (
                <div className="flex flex-wrap items-center gap-3 text-sm">
                    <Badge variant="outline">{rows} × {cols}</Badge>
                    <Badge variant="secondary">{occupiedCount}/{totalSlots} occupied</Badge>
                    <Badge variant="outline">{availableCount} available</Badge>
                    {disabledCount > 0 && <Badge variant="outline">{disabledCount} blocked</Badge>}
                </div>
            )}

            <div
                className="grid gap-1"
                style={{
                    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                }}
            >
                {Array.from({ length: rows }).map((_, rowIndex) =>
                    Array.from({ length: cols }).map((__, colIndex) => {
                        const label = getGridCoordinateLabel(rowIndex, colIndex, label_schema).toUpperCase();
                        const isDisabled = disabled_slots.has(label);
                        const occupant = occupiedSlots.get(label);
                        const isOccupied = !!occupant;

                        const slotData: GridSlotData = {
                            label,
                            isDisabled,
                            isOccupied,
                            occupantId: occupant?.id,
                            occupantLabel: occupant?.label,
                            occupantType: occupant?.type,
                            isSelected: selectedSlot === label,
                            isHighlighted: highlightedSlots?.has(label),
                        };

                        return (
                            <GridSlot
                                key={label}
                                data={slotData}
                                mode={mode}
                                onClick={() => !isDisabled && onSlotClick?.(label, slotData)}
                            />
                        );
                    })
                )}
            </div>

            {showLegend && (
                <div className="flex flex-wrap items-center gap-3 text-[0.7rem] text-muted-foreground">
                    <div className="flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-blue-200 dark:bg-blue-800" />
                        <span>Sample</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-purple-200 dark:bg-purple-800" />
                        <span>DNA</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-primary/50" />
                        <span>Selected</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-muted" />
                        <span>Blocked</span>
                    </div>
                    <div className="flex items-center gap-1 ml-auto">
                        <span className="italic">
                            {mode === 'move' ? 'Drag to move' : mode === 'select' ? 'Click to select' : mode === 'assign' ? 'Drag items here' : 'Read only'}
                        </span>
                    </div>
                </div>
            )}

            <DragOverlay>
                {activeDragId ? (
                    <div className="flex h-9 w-9 items-center justify-center rounded border bg-primary/80 text-primary-foreground text-xs shadow-lg cursor-grabbing">
                        Moving...
                    </div>
                ) : null}
            </DragOverlay>
        </div>
    );

    if (useInternalDndContext) {
        return (
            <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                {gridContent}
            </DndContext>
        );
    }

    return gridContent;
}
