'use client';

import { useState, useEffect, useMemo } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { useStorageTreeData } from './hooks/use-storage-tree';
import { useStorageSearch } from './hooks/use-storage-search';
import { moveSampleAction } from '@/app/actions/inventory';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/page-header';
import { AddStorageDialog } from './components/add-storage-dialog';
import { RenameStorageDialog, DeleteStorageDialog } from './components/storage-action-dialogs';
import { StorageTreePanel } from './components/storage-tree-panel';
import { Search, Plus, Minimize2, Maximize2, Hash, Thermometer, Beaker, Dna, Warehouse, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { StorageGrid } from '@/components/storage/storage-grid';
import Link from 'next/link';

function Breadcrumb({ segments }: { segments: string[] }) {
  return (
    <div className="flex items-center text-sm text-muted-foreground mb-2">
      <Link href="/dashboard/storage" className="hover:text-foreground transition-colors">Storage</Link>
      {segments.map((segment, i) => (
        <div key={i} className="flex items-center">
          <ChevronRight className="h-4 w-4 mx-1" />
          <span className={cn(i === segments.length - 1 && "font-medium text-foreground")}>
            {segment}
          </span>
        </div>
      ))}
    </div>
  );
}

function SamplesPreview({ samples, extracts, focusedId, matchingIds }: any) {
  const items = [
    ...samples.map((s: any) => ({ ...s, kind: 'sample' })),
    ...extracts.map((e: any) => ({ ...e, kind: 'extract' }))
  ];

  if (items.length === 0) {
    return <div className="p-8 text-center text-muted-foreground">No items in this storage unit.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        {items.map((item: any) => {
          const isFocused = focusedId === item.id;
          const isMatching = matchingIds?.has(item.id);
          return (
            <div
              key={item.id}
              className={cn(
                "flex items-center justify-between p-3 border rounded-md transition-colors",
                isFocused && "border-primary bg-primary/5 ring-1 ring-primary",
                isMatching && !isFocused && "bg-yellow-50 dark:bg-yellow-900/10"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn("h-2 w-2 rounded-full", item.kind === 'sample' ? "bg-blue-500" : "bg-purple-500")} />
                <div>
                  <div className="font-medium text-sm">{item.sample_id || item.dna_id}</div>
                  <div className="text-xs text-muted-foreground">{item.name}</div>
                </div>
              </div>
              <Badge variant="outline" className="text-xs">{item.kind}</Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function StoragePage() {
  // ... (keep existing hooks and state)
  const firestore = useFirestore();
  const {
    nodesById,
    childrenByParent,
    rootIds,
    samplesByStorage,
    extractsByStorage,
    storageTypes,
    stats,
    samples,
    isLoading,
    error,
  } = useStorageTreeData();

  const [search, setSearch] = useState('');
  const [activeType, setActiveType] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectedId = selectedIds.size === 1 ? Array.from(selectedIds)[0] : null;
  const [focusedSampleId, setFocusedSampleId] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addDialogParentId, setAddDialogParentId] = useState<string | null>(null);
  const [renameDialog, setRenameDialog] = useState<{ isOpen: boolean; id: string; name: string }>({ isOpen: false, id: '', name: '' });
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; id: string; name: string }>({ isOpen: false, id: '', name: '' });

  // ... (keep existing useEffects)

  useEffect(() => {
    setExpandedIds(new Set(rootIds));
    if (selectedIds.size === 0 && rootIds.length > 0) {
      setSelectedIds(new Set([rootIds[0]]));
    }
  }, [rootIds, selectedIds.size]);

  const normalizedSearch = search.trim().toLowerCase();
  const { matchingNodeIds, matchingSampleIds, results: searchResults } = useStorageSearch(search, nodesById, samples);

  useEffect(() => {
    if (normalizedSearch) {
      setExpandedIds(new Set(nodesById.keys()));
    } else {
      setExpandedIds(new Set(rootIds));
    }
  }, [normalizedSearch, nodesById, rootIds]);

  useEffect(() => {
    if (!selectedId) return;
    setExpandedIds((prev) => {
      const next = new Set(prev);
      let current = nodesById.get(selectedId) ?? null;
      while (current) {
        next.add(current.id);
        const parentId: string | null = current.parent_storage_id ?? null;
        if (!parentId) break;
        next.add(parentId);
        current = nodesById.get(parentId) ?? null;
      }
      return next;
    });
  }, [selectedId, nodesById]);

  useEffect(() => {
    if (!search) {
      setFocusedSampleId(null);
    }
  }, [search]);

  const filter = useMemo(
    () => ({
      searchQuery: normalizedSearch,
      activeType,
      matchingNodes: matchingNodeIds,
    }),
    [normalizedSearch, activeType, matchingNodeIds]
  );

  const selectedNode = selectedId ? nodesById.get(selectedId) ?? null : null;
  const selectedSamples = selectedId ? samplesByStorage.get(selectedId) ?? [] : [];
  const selectedExtracts = selectedId ? extractsByStorage.get(selectedId) ?? [] : [];

  // Prepare occupied slots for StorageGrid
  const occupiedSlots = useMemo(() => {
    const map = new Map<string, { id: string; label: string; type: 'sample' | 'dna_extract' | 'batch' | 'unknown' }>();

    selectedSamples.forEach(s => {
      if (s.position_label) {
        map.set(s.position_label.toUpperCase(), {
          id: s.id,
          label: s.sample_id,
          type: 'sample'
        });
      }
    });

    selectedExtracts.forEach(e => {
      if (e.storage_position_label) {
        map.set(e.storage_position_label.toUpperCase(), {
          id: e.id,
          label: e.dna_id,
          type: 'dna_extract'
        });
      }
    });

    // Merge with legacy occupied_slots if needed (though live data is better)
    if (selectedNode?.occupied_slots) {
      Object.entries(selectedNode.occupied_slots).forEach(([slot, id]) => {
        const normalized = slot.toUpperCase();
        if (!map.has(normalized)) {
          map.set(normalized, {
            id,
            label: 'Occupied',
            type: 'unknown'
          });
        }
      });
    }

    return map;
  }, [selectedSamples, selectedExtracts, selectedNode]);


  const parentOptions = useMemo(() => {
    return Array.from(nodesById.values()).map((unit) => ({
      id: unit.id,
      label: unit.path_names?.length ? unit.path_names.join(' › ') : unit.name,
    }));
  }, [nodesById]);

  const handleSelectNode = (id: string, multi: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(multi ? prev : []);
      if (multi && next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setFocusedSampleId(null);
    setSelectedSlot(null);
  };

  const handleSearchResultClick = (result: { storageId?: string; refId: string; kind: 'storage' | 'sample' }) => {
    const targetId = result.storageId ?? result.refId;
    if (!targetId) return;
    setSelectedIds(new Set([targetId]));
    setFocusedSampleId(result.kind === 'sample' ? result.refId : null);
  };

  const breadcrumbSegments = useMemo(() => {
    if (!selectedNode) return [];
    if (selectedNode.path_names?.length) return selectedNode.path_names;
    const segments: string[] = [];
    let current: typeof selectedNode | null = selectedNode;
    while (current !== null) {
      segments.unshift(current.name);
      const parentId: string | null = current.parent_storage_id ?? null;
      current = parentId ? nodesById.get(parentId) ?? null : null;
    }
    return segments;
  }, [selectedNode, nodesById]);

  const handleToggle = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => setExpandedIds(new Set(nodesById.keys()));
  const collapseAll = () => setExpandedIds(new Set(rootIds));

  const openAddStorage = (parentId?: string | null) => {
    setAddDialogParentId(parentId ?? selectedId ?? null);
    setIsAddDialogOpen(true);
  };

  const handleSlotClick = (slot: string, data: any) => {
    setSelectedSlot(slot === selectedSlot ? null : slot);
    if (data.occupantId) {
      setFocusedSampleId(data.occupantId);
    } else {
      setFocusedSampleId(null);
    }
  };

  const { user } = useUser();

  const handleSlotMove = async (fromSlot: string, toSlot: string) => {
    if (!selectedId || !user || !user.email) {
      toast({ title: "Authentication Error", description: "You must be logged in to move samples.", variant: "destructive" });
      return;
    }

    const sourceSample = selectedSamples.find(s => s.position_label?.toUpperCase() === fromSlot.toUpperCase());
    const sourceExtract = selectedExtracts.find(e => e.storage_position_label?.toUpperCase() === fromSlot.toUpperCase());

    if (sourceExtract) {
      toast({ title: "Not Supported", description: "Moving DNA extracts is not yet supported in strict mode.", variant: "destructive" });
      return;
    }

    if (!sourceSample || !sourceSample.id) return;

    try {
      const result = await moveSampleAction(
        sourceSample.id,
        selectedId, // Moving within the same storage unit
        toSlot
      );

      if (result.success) {
        toast({ title: "Sample moved", description: `Moved ${sourceSample.sample_id} to ${toSlot}` });
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      console.error("Failed to move item", err);
      toast({ title: "Move failed", description: err.message || "Could not update storage position.", variant: "destructive" });
    }
  };

  const handleAddChild = (parentId: string) => {
    setAddDialogParentId(parentId);
    setIsAddDialogOpen(true);
  };

  const handleRename = (id: string) => {
    const node = nodesById.get(id);
    if (node) {
      setRenameDialog({ isOpen: true, id, name: node.name });
    }
  };

  const handleDelete = (id: string) => {
    const node = nodesById.get(id);
    if (node) {
      setDeleteDialog({ isOpen: true, id, name: node.name });
    }
  };

  const onRenameConfirm = async (newName: string) => {
    if (!firestore || !renameDialog.id) return;
    try {
      await updateDoc(doc(firestore, 'storage_units', renameDialog.id), {
        name: newName
      });
      toast({ title: "Renamed", description: "Storage unit renamed successfully." });
    } catch (error) {
      console.error("Rename failed", error);
      toast({ title: "Error", description: "Failed to rename storage unit.", variant: "destructive" });
    }
  };

  const onDeleteConfirm = async () => {
    if (!firestore || !deleteDialog.id) return;
    try {
      await deleteDoc(doc(firestore, 'storage_units', deleteDialog.id));
      toast({ title: "Deleted", description: "Storage unit deleted successfully." });
      if (selectedIds.has(deleteDialog.id)) {
        setSelectedIds(prev => {
          const next = new Set(prev);
          next.delete(deleteDialog.id);
          return next;
        });
      }
    } catch (error) {
      console.error("Delete failed", error);
      toast({ title: "Error", description: "Failed to delete storage unit.", variant: "destructive" });
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* ... (keep PageHeader and Dialogs) */}
      <PageHeader
        title="Storage Map"
        description="Navigate your physical storage hierarchy."
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => {
            if (expandedIds.size === nodesById.size) {
              collapseAll();
            } else {
              expandAll();
            }
          }} title={expandedIds.size === nodesById.size ? "Collapse all" : "Expand all"}>
            {expandedIds.size === nodesById.size ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Button onClick={() => {
            setAddDialogParentId(selectedId);
            setIsAddDialogOpen(true);
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Storage
          </Button>
        </div>
      </PageHeader>

      <AddStorageDialog
        open={isAddDialogOpen}
        onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) setAddDialogParentId(null);
        }}
        parentOptions={parentOptions}
        defaultParentId={addDialogParentId}
        onSuccess={(newId) => {
          setSelectedIds(new Set([newId]));
          setAddDialogParentId(null);
        }}
      />

      <RenameStorageDialog
        open={renameDialog.isOpen}
        onOpenChange={(open) => setRenameDialog(prev => ({ ...prev, isOpen: open }))}
        initialName={renameDialog.name}
        onConfirm={onRenameConfirm}
      />

      <DeleteStorageDialog
        open={deleteDialog.isOpen}
        onOpenChange={(open) => setDeleteDialog(prev => ({ ...prev, isOpen: open }))}
        nodeName={deleteDialog.name}
        onConfirm={onDeleteConfirm}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel: Tree */}
        <div className="w-80 border-r bg-muted/10 flex flex-col">
          <div className="p-4 border-b space-y-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search storage..."
                className="pl-9 bg-background"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-hidden p-2">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full pl-4" />
                <Skeleton className="h-8 w-full pl-8" />
              </div>
            ) : (
              <StorageTreePanel
                rootIds={rootIds}
                nodesById={nodesById}
                childrenByParent={childrenByParent}
                samplesByStorage={samplesByStorage}
                extractsByStorage={extractsByStorage}
                expandedIds={expandedIds}
                selectedIds={selectedIds}
                onNodeToggle={handleToggle}
                onSelectNode={handleSelectNode}
                onAddChild={handleAddChild}
                onRename={handleRename}
                onDelete={handleDelete}
                filter={{
                  searchQuery: normalizedSearch,
                  activeType: null,
                  matchingNodes: matchingNodeIds
                }}
              />
            )}
          </div>
        </div>

        {/* Right Content - Details */}
        <div className="flex-1 overflow-y-auto bg-muted/5 p-6">
          {selectedIds.size > 0 ? (
            selectedIds.size > 1 ? (
              <div className="mx-auto max-w-5xl space-y-6">
                <div className="flex items-center justify-between">
                  <h1 className="text-2xl font-bold">{selectedIds.size} items selected</h1>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => {
                      // Bulk Move Logic Placeholder
                      toast({ title: "Not implemented", description: "Bulk move coming soon." });
                    }}>Move Selected</Button>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from(selectedIds).map(id => {
                    const node = nodesById.get(id);
                    if (!node) return null;
                    return (
                      <Card key={id}>
                        <CardHeader className="p-4">
                          <CardTitle className="text-base">{node.name}</CardTitle>
                          <CardDescription className="text-xs capitalize">{node.type}</CardDescription>
                        </CardHeader>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ) : selectedNode ? (
              <div className="mx-auto max-w-5xl space-y-6">
                {/* Header */}
                <div className="flex flex-col gap-1">
                  <Breadcrumb segments={breadcrumbSegments} />
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-3">
                      <h1 className="text-2xl font-bold tracking-tight">{selectedNode.name}</h1>
                      <Badge variant="outline" className="capitalize">{selectedNode.type}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">Edit</Button>
                      <Button variant="outline" size="sm" onClick={() => handleAddChild(selectedNode.id)}>Add Child</Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                    <span className="flex items-center gap-1"><Hash className="h-3 w-3" /> {selectedNode.storage_id}</span>
                    {selectedNode.temperature !== undefined && (
                      <span className="flex items-center gap-1"><Thermometer className="h-3 w-3" /> {selectedNode.temperature}°C</span>
                    )}
                  </div>
                </div>

                {/* Tabs */}
                <Tabs defaultValue={selectedNode.grid_spec ? 'contents' : 'overview'} className="space-y-4">
                  <div className="border-b">
                    <TabsList className="h-9 w-full justify-start rounded-none border-b-2 border-transparent bg-transparent p-0">
                      <TabsTrigger
                        value="overview"
                        className="relative h-9 rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 font-medium text-muted-foreground shadow-none transition-none data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
                      >
                        Overview
                      </TabsTrigger>
                      <TabsTrigger
                        value="contents"
                        className="relative h-9 rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 font-medium text-muted-foreground shadow-none transition-none data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
                      >
                        Contents <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">{selectedSamples.length + selectedExtracts.length}</span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="grid"
                        disabled={!selectedNode.grid_spec}
                        className="relative h-9 rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 font-medium text-muted-foreground shadow-none transition-none data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
                      >
                        Grid View
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="overview" className="space-y-6 pt-2">
                    {/* ... (keep overview content) */}
                    {/* Top Row: Capacity and Quick Stats */}
                    <div className="grid gap-6 md:grid-cols-2">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base font-medium">Storage Capacity</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="flex items-end justify-between">
                              <div className="flex flex-col">
                                <span className="text-3xl font-bold">
                                  {Math.round(((selectedSamples.length + selectedExtracts.length) / (selectedNode.theoretical_slots || 1)) * 100)}%
                                </span>
                                <span className="text-xs text-muted-foreground">Occupancy</span>
                              </div>
                              <div className="text-right text-sm text-muted-foreground">
                                {selectedSamples.length + selectedExtracts.length} / {selectedNode.theoretical_slots || '∞'} slots used
                              </div>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                              <div
                                className={cn("h-full transition-all",
                                  ((selectedSamples.length + selectedExtracts.length) / (selectedNode.theoretical_slots || 1)) > 0.9 ? "bg-red-500" :
                                    ((selectedSamples.length + selectedExtracts.length) / (selectedNode.theoretical_slots || 1)) > 0.7 ? "bg-yellow-500" : "bg-primary"
                                )}
                                style={{ width: `${Math.min(((selectedSamples.length + selectedExtracts.length) / (selectedNode.theoretical_slots || 1)) * 100, 100)}%` }}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4 pt-2">
                              <div className="rounded-lg border p-3">
                                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                  <Beaker className="h-4 w-4" />
                                  <span className="text-xs font-medium uppercase">Samples</span>
                                </div>
                                <span className="text-xl font-bold">{selectedSamples.length}</span>
                              </div>
                              <div className="rounded-lg border p-3">
                                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                  <Dna className="h-4 w-4" />
                                  <span className="text-xs font-medium uppercase">Extracts</span>
                                </div>
                                <span className="text-xl font-bold">{selectedExtracts.length}</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base font-medium">Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-y-4">
                            <div>
                              <p className="text-xs text-muted-foreground uppercase tracking-wide">Type</p>
                              <p className="font-medium capitalize">{selectedNode.type.replace('_', ' ')}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground uppercase tracking-wide">Temperature</p>
                              <p className="font-medium">{selectedNode.temperature !== undefined ? `${selectedNode.temperature}°C` : 'Ambient'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground uppercase tracking-wide">Dimensions</p>
                              <p className="font-medium">
                                {selectedNode.grid_spec
                                  ? `${selectedNode.grid_spec.rows} × ${selectedNode.grid_spec.cols} (${selectedNode.grid_spec.rows * selectedNode.grid_spec.cols} slots)`
                                  : 'Unstructured'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground uppercase tracking-wide">Hierarchy Depth</p>
                              <p className="font-medium">{selectedNode.depth ?? selectedNode.path_ids?.length ?? 0}</p>
                            </div>
                          </div>
                          {selectedNode.description && (
                            <div className="pt-2 border-t">
                              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Description</p>
                              <p className="text-sm text-muted-foreground">{selectedNode.description}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>

                    {/* Sub-units Section */}
                    {childrenByParent.get(selectedNode.id) && (childrenByParent.get(selectedNode.id)?.length ?? 0) > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                          Sub-units ({childrenByParent.get(selectedNode.id)?.length})
                        </h3>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                          {childrenByParent.get(selectedNode.id)?.map((childId) => {
                            const child = nodesById.get(childId);
                            if (!child) return null;

                            const childSamples = samplesByStorage.get(child.id) || [];
                            const childExtracts = extractsByStorage.get(child.id) || [];
                            const totalItems = childSamples.length + childExtracts.length;
                            const capacity = child.theoretical_slots || 0;
                            const occupancy = capacity > 0 ? (totalItems / capacity) * 100 : 0;

                            return (
                              <Card
                                key={child.id}
                                className="cursor-pointer hover:bg-muted/50 transition-colors"
                                onClick={() => handleSelectNode(child.id, false)}
                              >
                                <CardContent className="p-4 space-y-3">
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2">
                                      <div className="rounded-md bg-primary/10 p-2 text-primary">
                                        <Warehouse className="h-4 w-4" />
                                      </div>
                                      <div className="space-y-0.5">
                                        <p className="font-medium leading-none">{child.name}</p>
                                        <p className="text-xs text-muted-foreground capitalize">{child.type.replace('_', ' ')}</p>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="space-y-1.5">
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                      <span>{totalItems} items</span>
                                      {capacity > 0 && <span>{Math.round(occupancy)}% full</span>}
                                    </div>
                                    {capacity > 0 && (
                                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                                        <div
                                          className={cn("h-full", occupancy > 90 ? "bg-red-500" : occupancy > 70 ? "bg-yellow-500" : "bg-green-500")}
                                          style={{ width: `${Math.min(occupancy, 100)}%` }}
                                        />
                                      </div>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="contents" className="pt-2">
                    <SamplesPreview
                      samples={selectedSamples}
                      extracts={selectedExtracts}
                      focusedId={focusedSampleId}
                      matchingIds={matchingSampleIds}
                    />
                  </TabsContent>

                  <TabsContent value="grid" className="pt-2">
                    {selectedNode.grid_spec ? (
                      <Card>
                        <CardContent className="p-6">
                          <StorageGrid
                            storage={selectedNode}
                            mode="move"
                            occupiedSlots={occupiedSlots}
                            selectedSlot={selectedSlot}
                            onSlotClick={handleSlotClick}
                            onSlotMove={handleSlotMove}
                          />
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="flex h-40 items-center justify-center rounded-md border border-dashed">
                        <p className="text-sm text-muted-foreground">No grid layout configured</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            ) : null) : (
            <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
              <Warehouse className="mb-4 h-12 w-12 opacity-20" />
              <p className="text-lg font-medium">Select a storage unit</p>
              <p className="text-sm">Browse the map on the left to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}