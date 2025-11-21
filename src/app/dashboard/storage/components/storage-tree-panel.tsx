// src/app/dashboard/storage/components/storage-tree-panel.tsx

'use client';

import { Fragment, useMemo, useRef } from 'react';
import { ChevronRight, ChevronDown, Snowflake, Warehouse, FolderKanban, Boxes, Thermometer, Box, MoreHorizontal, Plus, Edit, Trash2 } from 'lucide-react';
import { useVirtualizer, type VirtualItem } from '@tanstack/react-virtual';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Sample, StorageUnit, DnaExtract } from '@/lib/types';

const iconMap: Partial<Record<StorageUnit['type'], React.ReactNode>> = {
  freezer: <Snowflake className="h-4 w-4 text-blue-500" />,
  chiller: <Snowflake className="h-4 w-4 text-cyan-500" />,
  cabinet: <Warehouse className="h-4 w-4 text-yellow-700" />,
  rack: <FolderKanban className="h-4 w-4 text-gray-500" />,
  box: <Boxes className="h-4 w-4 text-orange-500" />,
};

export type StorageTreeFilter = {
  searchQuery: string;
  activeType: string | null;
  matchingNodes: Set<string>;
};

type StorageTreePanelProps = {
  rootIds: string[];
  nodesById: Map<string, StorageUnit>;
  childrenByParent: Map<string | null, string[]>;
  samplesByStorage: Map<string, Sample[]>;
  extractsByStorage: Map<string, DnaExtract[]>;
  expandedIds: Set<string>;
  selectedIds: Set<string>;
  onNodeToggle: (id: string) => void;
  onSelectNode: (id: string, multi: boolean) => void;
  onAddChild?: (parentId: string) => void;
  onRename?: (id: string) => void;
  onDelete?: (id: string) => void;
  filter: StorageTreeFilter;
};

type FlattenedRow = {
  id: string;
  depth: number;
  hasChildren: boolean;
};

export function StorageTreePanel({
  rootIds,
  nodesById,
  childrenByParent,
  samplesByStorage,
  extractsByStorage,
  expandedIds,
  selectedIds,
  onNodeToggle,
  onSelectNode,
  onAddChild,
  onRename,
  onDelete,
  filter,
}: StorageTreePanelProps) {
  const visibilityMap = useMemo(() => {
    const cache = new Map<string, boolean>();

    const matchesNode = (unit: StorageUnit | undefined) => {
      if (!unit) return false;
      const typeMatch = filter.activeType ? unit.type === filter.activeType : true;
      if (!typeMatch) return false;
      if (!filter.searchQuery) return true;
      const baseFields = [unit.name, unit.storage_id, ...(unit.path_names ?? [])];
      const searchHit = baseFields.some((field) => field?.toLowerCase().includes(filter.searchQuery));
      const sampleHit = filter.matchingNodes.has(unit.id);
      return searchHit || sampleHit;
    };

    const computeVisibility = (id: string): boolean => {
      if (cache.has(id)) return cache.get(id)!;
      const unit = nodesById.get(id);
      if (!unit) {
        cache.set(id, false);
        return false;
      }
      const children = childrenByParent.get(id) ?? [];
      const childVisible = children.some((childId) => computeVisibility(childId));
      const isVisible = matchesNode(unit) || childVisible;
      cache.set(id, isVisible);
      return isVisible;
    };

    for (const rootId of rootIds) {
      computeVisibility(rootId);
    }

    return cache;
  }, [rootIds, nodesById, childrenByParent, filter]);

  const rows = useMemo(() => {
    const flattened: FlattenedRow[] = [];

    const walk = (ids: string[], depth: number) => {
      for (const id of ids) {
        const unit = nodesById.get(id);
        if (!unit) continue;
        if (!visibilityMap.get(id)) continue;

        const children = childrenByParent.get(id) ?? [];
        const hasChildren = children.length > 0;

        flattened.push({ id, depth, hasChildren });

        if (hasChildren && expandedIds.has(id)) {
          walk(children, depth + 1);
        }
      }
    };

    walk(rootIds, 0);
    return flattened;
  }, [rootIds, nodesById, childrenByParent, visibilityMap, expandedIds]);

  const parentRef = useRef<HTMLDivElement | null>(null);
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32,
    overscan: 15,
  });

  return (
    <div className="h-full">
      <div ref={parentRef} className="h-full overflow-y-auto">
        <div
          style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}
          className="w-full"
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow: VirtualItem) => {
            const row = rows[virtualRow.index];
            if (!row) return <Fragment key={`empty-${virtualRow.index}`} />;
            const unit = nodesById.get(row.id);
            if (!unit) return <Fragment key={`missing-${row.id}`} />;
            const children = childrenByParent.get(row.id) ?? [];
            const samples = samplesByStorage.get(row.id) ?? [];
            const extracts = extractsByStorage.get(row.id) ?? [];
            const totalItems = samples.length + extracts.length;

            return (
              <div
                key={row.id}
                data-index={virtualRow.index}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`
                }}
                className={cn(
                  'group flex items-center gap-2 px-2 py-1.5 text-sm transition-colors rounded-md mx-1',
                  selectedIds.has(row.id) ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                )}
                onClick={(e) => onSelectNode(row.id, e.ctrlKey || e.metaKey)}
              >
                <button
                  type="button"
                  aria-label="Toggle children"
                  className={cn(
                    'flex h-5 w-5 items-center justify-center rounded hover:bg-muted/50',
                    !row.hasChildren && 'opacity-0 pointer-events-none'
                  )}
                  style={{ marginLeft: `${row.depth * 0.75}rem` }}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (row.hasChildren) onNodeToggle(row.id);
                  }}
                >
                  {row.hasChildren && (
                    expandedIds.has(row.id) ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" />
                    )
                  )}
                </button>

                <div className="flex flex-1 items-center gap-2 min-w-0">
                  {iconMap[unit.type] ?? <FolderKanban className="h-4 w-4 shrink-0" />}
                  <span className="truncate leading-none">{unit.name}</span>
                  {unit.theoretical_slots && unit.theoretical_slots > 0 && (
                    <div className="ml-auto mr-2 h-1.5 w-12 rounded-full bg-muted overflow-hidden" title={`Occupancy: ${Math.round(((samples.length + extracts.length) / unit.theoretical_slots) * 100)}%`}>
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          (samples.length + extracts.length) / unit.theoretical_slots > 0.9 ? "bg-red-500" :
                            (samples.length + extracts.length) / unit.theoretical_slots > 0.7 ? "bg-yellow-500" :
                              "bg-green-500"
                        )}
                        style={{ width: `${Math.min(((samples.length + extracts.length) / unit.theoretical_slots) * 100, 100)}%` }}
                      />
                    </div>
                  )}
                </div>

                {totalItems > 0 && (
                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                    {totalItems}
                  </span>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-3 w-3" />
                      <span className="sr-only">More options</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem onClick={() => onAddChild?.(row.id)} disabled={!unit.child_allowed && !unit.allow_children}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Child
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onRename?.(row.id)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onDelete?.(row.id)} className="text-destructive focus:text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
