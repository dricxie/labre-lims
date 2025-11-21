'use client';

import { useMemo, useState, useCallback } from 'react';
import { Filter, PlusCircle, Link2 } from 'lucide-react';
import { collection, query, where } from 'firebase/firestore';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/page-header';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { DnaExtract, Task } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { AddDnaExtractDialog } from './_components/add-dna-extract-dialog';
import { EditDnaExtractDialog } from './_components/edit-dna-extract-dialog';
import { BatchQuantificationDialog, QuantificationUpdate } from './_components/batch-quantification-dialog';
import { DataTable } from '@/components/ui/data-table';
import { getColumns } from './columns';
import { Breadcrumbs } from '@/components/breadcrumbs';

const ALL_STATUSES: DnaExtract['status'][] = ['stored', 'used', 'disposed'];

export default function DnaExtractsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [statusFilters, setStatusFilters] = useState<Set<DnaExtract['status']>>(new Set());
  const [editingExtract, setEditingExtract] = useState<(DnaExtract & { id: string }) | null>(null);

  // Selection state for DataTable
  const [rowSelection, setRowSelection] = useState({});
  const [selectedExtractIds, setSelectedExtractIds] = useState<Set<string>>(new Set());

  const [bulkTaskId, setBulkTaskId] = useState('');
  const [isBulkActionRunning, setIsBulkActionRunning] = useState(false);
  const [isQuantDialogOpen, setIsQuantDialogOpen] = useState(false);
  const [isSavingQuant, setIsSavingQuant] = useState(false);

  const dnaExtractsQuery = useMemo(() => query(collection(firestore, 'dna_extracts')), [firestore]);
  const { data: dnaExtracts, isLoading } = useCollection<DnaExtract>(dnaExtractsQuery);

  const tasksQuery = useMemo(() => query(collection(firestore, 'tasks'), where('type', '==', 'DNA Extraction')), [firestore]);
  const { data: dnaTasks } = useCollection<Task>(tasksQuery);

  const taskLookup = useMemo(() => {
    const map = new Map<string, Task>();
    dnaTasks?.forEach(task => {
      if (task.id) {
        map.set(task.id, task);
      }
    });
    return map;
  }, [dnaTasks]);

  const filteredExtracts = useMemo(() => {
    if (!dnaExtracts) return [];
    let filtered = dnaExtracts;
    if (statusFilters.size > 0) {
      filtered = filtered.filter((ext) => statusFilters.has(ext.status));
    }
    return filtered;
  }, [dnaExtracts, statusFilters]);

  const toggleStatusFilter = (status: DnaExtract['status']) => {
    setStatusFilters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(status)) {
        newSet.delete(status);
      } else {
        newSet.add(status);
      }
      return newSet;
    })
  };

  const clearSelection = () => {
    setRowSelection({});
    setSelectedExtractIds(new Set());
    setBulkTaskId('');
  };

  const runBulkUpdate = async ({
    update,
    logDetailsTemplate,
    successDescription,
  }: {
    update: Partial<DnaExtract>;
    logDetailsTemplate: string;
    successDescription: string;
  }) => {
    if (!user || !user.email) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'You must be logged in to perform bulk actions.',
      });
      return;
    }

    if (selectedExtractIds.size === 0) {
      toast({ variant: 'destructive', title: 'No extracts selected' });
      return;
    }

    setIsBulkActionRunning(true);
    try {
      const { bulkUpdateDnaExtractsAction } = await import('@/app/actions/dna-extracts');
      const result = await bulkUpdateDnaExtractsAction({
        extractIds: Array.from(selectedExtractIds),
        update,
        logDetailsTemplate,
      });

      if (result.success) {
        toast({ title: 'Bulk update complete', description: successDescription });
        clearSelection();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Bulk update failed', error);
      toast({
        variant: 'destructive',
        title: 'Bulk update failed',
        description: 'We could not apply the requested changes. Please try again.',
      });
    } finally {
      setIsBulkActionRunning(false);
    }
  };

  const handleBulkStatusChange = (status: DnaExtract['status']) => {
    runBulkUpdate({
      update: { status },
      logDetailsTemplate: `Updated DNA extract {id} status to ${status}`,
      successDescription: `Marked ${selectedExtractIds.size} extract(s) as ${status}.`,
    });
  };

  const handleBulkLinkToTask = () => {
    if (!bulkTaskId) {
      toast({ variant: 'destructive', title: 'Select a task', description: 'Choose a task to link the extracts to.' });
      return;
    }
    const task = taskLookup.get(bulkTaskId);
    runBulkUpdate({
      update: { source_task_id: bulkTaskId },
      logDetailsTemplate: `Linked DNA extract {id} to task ${task?.taskId ?? bulkTaskId}`,
      successDescription: `Linked ${selectedExtractIds.size} extract(s) to task ${task?.taskId ?? bulkTaskId}.`,
    });
  };

  const handleAddDnaExtract = async (formData: Omit<DnaExtract, 'id' | 'createdAt' | 'createdBy' | 'barcode' | 'labId'>) => {
    if (!user || !user.email) {
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: "You must be logged in to add a DNA extract.",
      });
      return;
    }

    try {
      const { createDnaExtractAction } = await import('@/app/actions/dna-extracts');
      const result = await createDnaExtractAction({
        ...formData,
      });

      if (result.success) {
        toast({
          title: "DNA Extract Added",
          description: `${formData.dna_id} has been successfully added.`,
        });
        setIsDialogOpen(false);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Error creating DNA extract:", error);
      toast({
        variant: "destructive",
        title: "Submission Error",
        description: "Failed to create DNA extract. Please try again.",
      });
    }
  };

  const handleQuantSubmit = async (taskId: string, updates: QuantificationUpdate[]) => {
    if (!user || !user.email) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'You must be logged in to update DNA extracts.',
      });
      return;
    }

    setIsSavingQuant(true);
    try {
      const { saveQuantificationAction } = await import('@/app/actions/dna-extracts');
      const result = await saveQuantificationAction({
        taskId,
        updates: updates.map(u => ({
          ...u,
          yield_ng_per_ul: u.yield_ng_per_ul ?? undefined,
          a260_a280: u.a260_a280 ?? undefined,
        })),
      });

      if (result.success) {
        toast({
          title: 'Quantification saved',
          description: `Updated ${updates.length} extract${updates.length === 1 ? '' : 's'}.`,
        });
        setIsQuantDialogOpen(false);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Failed to save quantification', error);
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: 'Could not record quantification results. Please try again.',
      });
    } finally {
      setIsSavingQuant(false);
    }
  };

  const handleSelectionChange = useCallback((rows: DnaExtract[]) => {
    const ids = new Set(rows.map(r => r.id).filter(Boolean) as string[]);
    setSelectedExtractIds(ids);
  }, []);

  const columns = useMemo(() => getColumns({
    taskLookup,
    onEdit: (extract) => {
      if (extract.id) {
        setEditingExtract({ ...extract, id: extract.id });
      }
    }
  }), [taskLookup]);

  return (
    <div className="space-y-8">
      <Breadcrumbs />
      <PageHeader
        title="DNA Extract Management"
        description="Track and manage all your DNA extracts."
      >
        <div className="flex flex-wrap gap-2">
          <AddDnaExtractDialog
            isOpen={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            onSubmit={handleAddDnaExtract}
          >
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add DNA Extract
            </Button>
          </AddDnaExtractDialog>
          <Button variant="outline" onClick={() => setIsQuantDialogOpen(true)}>
            Record Quantification
          </Button>
          {selectedExtractIds.size > 0 && (
            <Button variant="outline" onClick={clearSelection} size="sm">
              Clear Selection
            </Button>
          )}
        </div>
      </PageHeader>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>DNA Extracts</CardTitle>
            <CardDescription>A list of all DNA extracts in the system.</CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="relative">
                <Filter className="mr-2 h-4 w-4" />
                Filter
                {statusFilters.size > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
                    {statusFilters.size}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {ALL_STATUSES.map(status => (
                <DropdownMenuCheckboxItem
                  key={status}
                  checked={statusFilters.has(status)}
                  onCheckedChange={() => toggleStatusFilter(status)}
                  className="capitalize"
                >
                  {status.replace('_', ' ')}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent>
          {selectedExtractIds.size > 0 && (
            <div className="mb-4 rounded-md border border-dashed p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{selectedExtractIds.size} extract(s) selected</p>
                  <p className="text-sm text-muted-foreground">Bulk update status or link extracts to a task.</p>
                </div>
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  Clear
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {ALL_STATUSES.map(status => (
                  <Button
                    key={status}
                    variant="secondary"
                    size="sm"
                    disabled={isBulkActionRunning}
                    onClick={() => handleBulkStatusChange(status)}
                  >
                    Mark {status}
                  </Button>
                ))}
                <div className="flex items-center gap-2">
                  <Select value={bulkTaskId} onValueChange={setBulkTaskId}>
                    <SelectTrigger className="w-[220px]">
                      <SelectValue placeholder="Link to task" />
                    </SelectTrigger>
                    <SelectContent>
                      {dnaTasks?.map(task => (
                        <SelectItem key={task.id} value={task.id!}>
                          {task.taskId || task.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isBulkActionRunning || selectedExtractIds.size === 0}
                    onClick={handleBulkLinkToTask}
                  >
                    <Link2 className="mr-2 h-4 w-4" />
                    Link to Task
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DataTable
            columns={columns}
            data={filteredExtracts || []}
            searchKey="dna_id"
            searchPlaceholder="Search by DNA ID..."
            rowSelection={rowSelection}
            onRowSelectionChange={setRowSelection}
            onSelectionChange={handleSelectionChange}
          />
        </CardContent>
      </Card>

      <EditDnaExtractDialog
        extract={editingExtract}
        isOpen={!!editingExtract}
        onOpenChange={open => {
          if (!open) {
            setEditingExtract(null);
          }
        }}
      />
      <BatchQuantificationDialog
        isOpen={isQuantDialogOpen}
        isSaving={isSavingQuant}
        onOpenChange={setIsQuantDialogOpen}
        tasks={(dnaTasks ?? []) as Task[]}
        extracts={((dnaExtracts ?? []).filter(ext => ext.id) as (DnaExtract & { id: string })[])}
        onSubmit={handleQuantSubmit}
      />
    </div>
  );
}
