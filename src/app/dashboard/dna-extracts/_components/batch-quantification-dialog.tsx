'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DnaExtract, Task } from '@/lib/types';

export type QuantificationUpdate = {
  id: string;
  dna_id: string;
  sample_id?: string;
  yield_ng_per_ul: number | null;
  a260_a280: number | null;
};

type BatchQuantificationDialogProps = {
  isOpen: boolean;
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: Task[];
  extracts: (DnaExtract & { id: string })[];
  onSubmit: (taskId: string, updates: QuantificationUpdate[]) => Promise<void> | void;
};

export function BatchQuantificationDialog({
  isOpen,
  isSaving,
  onOpenChange,
  tasks,
  extracts,
  onSubmit,
}: BatchQuantificationDialogProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [drafts, setDrafts] = useState<Record<string, { yield: string; purity: string }>>({});
  const [validationError, setValidationError] = useState<string | null>(null);

  const taskOptions = useMemo(() => {
    const taskIdsWithExtracts = new Set(extracts.map(ext => ext.source_task_id).filter(Boolean) as string[]);
    return tasks
      .filter(task => task.id && taskIdsWithExtracts.has(task.id))
      .map(task => ({ id: task.id!, label: task.title || task.taskId || 'Untitled Task' }));
  }, [tasks, extracts]);

  const taskExtracts = useMemo(
    () =>
      selectedTaskId
        ? extracts.filter(ext => ext.source_task_id === selectedTaskId)
        : [],
    [extracts, selectedTaskId]
  );

  useEffect(() => {
    if (!selectedTaskId) {
      setDrafts({});
      return;
    }
    const initialDrafts: Record<string, { yield: string; purity: string }> = {};
    taskExtracts.forEach(ext => {
      initialDrafts[ext.id] = {
        yield: typeof ext.yield_ng_per_ul === 'number' ? String(ext.yield_ng_per_ul) : '',
        purity: typeof ext.a260_a280 === 'number' ? String(ext.a260_a280) : '',
      };
    });
    setDrafts(initialDrafts);
    setValidationError(null);
  }, [selectedTaskId, taskExtracts]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedTaskId('');
      setDrafts({});
      setValidationError(null);
    }
  }, [isOpen]);

  const updateDraft = (id: string, field: 'yield' | 'purity', value: string) => {
    setDrafts(prev => ({
      ...prev,
      [id]: {
        yield: field === 'yield' ? value : prev[id]?.yield ?? '',
        purity: field === 'purity' ? value : prev[id]?.purity ?? '',
      },
    }));
  };

  const parseNumber = (value: string): number | null => {
    if (value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : NaN;
  };

  const dirtyCount = useMemo(() => {
    return taskExtracts.reduce((count, ext) => {
      const draft = drafts[ext.id];
      if (!draft) return count;
      const draftYield = draft.yield;
      const draftPurity = draft.purity;
      const origYield = ext.yield_ng_per_ul ?? null;
      const origPurity = ext.a260_a280 ?? null;
      const yieldChanged = draftYield === '' ? origYield !== null : Number(draftYield) !== origYield;
      const purityChanged = draftPurity === '' ? origPurity !== null : Number(draftPurity) !== origPurity;
      return yieldChanged || purityChanged ? count + 1 : count;
    }, 0);
  }, [drafts, taskExtracts]);

  const handleSubmit = () => {
    if (!selectedTaskId) {
      setValidationError('Select a DNA extraction task to continue.');
      return;
    }

    const updates: QuantificationUpdate[] = [];

    for (const ext of taskExtracts) {
      const draft = drafts[ext.id];
      if (!draft) continue;
      const yieldValue = parseNumber(draft.yield);
      const purityValue = parseNumber(draft.purity);

      if (Number.isNaN(yieldValue) || Number.isNaN(purityValue)) {
        setValidationError('Use numeric values for yield and purity.');
        return;
      }

      const normalizedYield = yieldValue;
      const normalizedPurity = purityValue;
      const origYield = ext.yield_ng_per_ul ?? null;
      const origPurity = ext.a260_a280 ?? null;

      const changed = normalizedYield !== origYield || normalizedPurity !== origPurity;
      if (changed) {
        updates.push({
          id: ext.id,
          dna_id: ext.dna_id,
          sample_id: ext.sample_id,
          yield_ng_per_ul: normalizedYield,
          a260_a280: normalizedPurity,
        });
      }
    }

    if (updates.length === 0) {
      setValidationError('Nothing to update—adjust at least one row.');
      return;
    }

    setValidationError(null);
    onSubmit(selectedTaskId, updates);
  };

  const emptyState = taskOptions.length === 0;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Record quantification results</DialogTitle>
          <DialogDescription>
            Select a DNA extraction task to load its extracts, then enter the yield and purity returned by the external service.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">DNA extraction task</span>
              <p className="text-xs text-muted-foreground">
                Only tasks with captured extracts appear here.
              </p>
            </div>
            <div className="w-full sm:w-72">
              <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
                <SelectTrigger>
                  <SelectValue placeholder={emptyState ? 'No tasks with extracts' : 'Choose task'} />
                </SelectTrigger>
                <SelectContent>
                  {taskOptions.map(task => (
                    <SelectItem key={task.id} value={task.id}>
                      {task.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedTaskId && taskExtracts.length === 0 && (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              No DNA extracts are linked to this task.
            </div>
          )}

          {selectedTaskId && taskExtracts.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                <span>
                  {dirtyCount > 0
                    ? `${dirtyCount} row${dirtyCount === 1 ? '' : 's'} pending update.`
                    : 'No pending changes yet.'}
                </span>
                <Badge variant="secondary">{taskExtracts.length} extract(s)</Badge>
              </div>
              <div className="overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>DNA ID</TableHead>
                      <TableHead>Sample</TableHead>
                      <TableHead>Yield (ng/µL)</TableHead>
                      <TableHead>A260/A280</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {taskExtracts.map(ext => {
                      const draft = drafts[ext.id] || { yield: '', purity: '' };
                      return (
                        <TableRow key={ext.id}>
                          <TableCell className="font-medium">{ext.dna_id}</TableCell>
                          <TableCell>{ext.sample_id}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.1"
                              value={draft.yield}
                              onChange={(e) => updateDraft(ext.id, 'yield', e.target.value)}
                              placeholder="e.g., 30"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              value={draft.purity}
                              onChange={(e) => updateDraft(ext.id, 'purity', e.target.value)}
                              placeholder="e.g., 1.85"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {validationError && (
            <div className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {validationError}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving || !selectedTaskId || taskExtracts.length === 0}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save quantification
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
