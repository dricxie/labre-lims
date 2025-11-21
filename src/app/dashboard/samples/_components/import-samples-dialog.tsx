'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Papa from 'papaparse';
import { z } from 'zod';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Sample } from '@/lib/types';
import { useUser, useFirestore } from '@/firebase';
import { useStorageOptions, StorageOption } from '@/hooks/use-storage-options';
import { useStorageOccupancy } from '@/hooks/use-storage-occupancy';
import { useProjects } from '@/hooks/use-projects';

import { ImportStepSelect } from './import-steps/ImportStepSelect';
import { ImportStepMap } from './import-steps/ImportStepMap';
import { ImportStepResolve } from './import-steps/ImportStepResolve';
import { ImportStepCommit } from './import-steps/ImportStepCommit';
import { ParsedRow, SampleDraft, CompleteSampleDraft, RowFilter, BulkState } from './import-steps/types';
import { requiredFields, ALLOWED_SAMPLE_TYPES } from './import-steps/constants';
import { tryNormalizeDate } from './import-steps/utils';

type ImportSamplesDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (samples: Omit<Sample, 'id' | 'createdAt' | 'createdBy' | 'barcode' | 'status'>[]) => Promise<void>;
};

type ImportStep = 'select' | 'map_columns' | 'preview' | 'resolve' | 'commit';

const STEP_SEQUENCE: ImportStep[] = ['select', 'map_columns', 'preview', 'resolve', 'commit'];

const sampleValidationSchema = z.object({
  sample_id: z.string().min(1, 'Sample ID is required'),
  project_id: z.string().min(1, 'Project ID is required'),
  sample_type: z.enum(['blood', 'tissue', 'hair', 'dna', 'other'] as const, {
    errorMap: () => ({ message: 'Invalid sample type' }),
  }),
  source: z.string().min(1, 'Source is required'),
  storage_location_id: z.string().min(1, 'Storage location is required'),
  collected_by: z.string().min(1, 'Collected by is required'),
  date_collected: z.string().refine((value) => !Number.isNaN(Date.parse(String(value))), {
    message: 'Invalid collection date',
  }),
  date_received: z.string().refine((value) => !Number.isNaN(Date.parse(String(value))), {
    message: 'Invalid received date',
  }),
  initial_volume: z.coerce.number().nonnegative('Initial volume must be positive'),
  current_volume: z.coerce.number().nonnegative('Current volume must be positive'),
  position_label: z.string().optional(),
});

const initialBulkState: BulkState = {
  prefix: '',
  suffix: '',
  projectId: '',
  sampleType: '',
  source: '',
  storageId: '',
  dateCollected: '',
  dateReceived: '',
  collectedBy: '',
};

export function ImportSamplesDialog({ isOpen, onOpenChange, onImport }: ImportSamplesDialogProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const { options: storageOptions, optionsById, isLoading: isLoadingStorageOptions } = useStorageOptions();
  const { projectOptions, isLoading: isLoadingProjects } = useProjects();

  const [step, setStep] = useState<ImportStep>('select');
  const [file, setFile] = useState<File | null>(null);
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [bulkState, setBulkState] = useState<BulkState>(initialBulkState);
  const [rowFilter, setRowFilter] = useState<RowFilter>('all');

  useEffect(() => {
    if (!isOpen) {
      resetState();
    }
  }, [isOpen]);

  const progressMeta = useMemo(() => {
    const stepIndex = Math.max(STEP_SEQUENCE.indexOf(step), 0);
    const total = STEP_SEQUENCE.length;
    const percent = total > 1 ? Math.round((stepIndex / (total - 1)) * 100) : 0;
    return {
      stepIndex,
      total,
      percent,
      indicator: `Step ${stepIndex + 1} of ${total}`,
    } as const;
  }, [step]);

  const validRows = rows.filter((row) => row.status === 'valid');
  const invalidRows = rows.filter((row) => row.status === 'invalid');

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setGlobalError(null);
    if (!event.target.files?.[0]) return;
    const uploadedFile = event.target.files[0];
    const extension = uploadedFile.name.split('.').pop()?.toLowerCase();
    if (extension !== 'csv') {
      setGlobalError('Unsupported file type. Please upload a CSV file.');
      setFile(null);
      return;
    }
    if (uploadedFile.size > 5 * 1024 * 1024) {
      setGlobalError('File is too large. Please keep it under 5MB.');
      setFile(null);
      return;
    }
    setFile(uploadedFile);
  }, []);

  const onParse = useCallback(() => {
    if (!file) return;
    if (!user) {
      toast({
        variant: 'destructive',
        description: 'Please sign in again before importing samples.',
      });
      return;
    }
    setIsParsing(true);
    setGlobalError(null);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        setIsParsing(false);
        if (!result.data?.length) {
          setGlobalError('No rows detected in the uploaded file.');
          return;
        }
        const headers = result.meta.fields ?? [];
        setRawHeaders(headers);
        setRawRows(result.data);

        // Auto-map columns
        const initialMapping: Record<string, string> = {};
        requiredFields.forEach((field) => {
          if (headers.includes(field)) {
            initialMapping[field] = field;
            return;
          }
          const normalizedField = field.replace(/_/g, '').toLowerCase();
          const match = headers.find(h => h.replace(/_/g, '').replace(/\s+/g, '').toLowerCase() === normalizedField);
          if (match) {
            initialMapping[field] = match;
          }
        });
        // Also map optional fields if found
        ['position_label'].forEach((field) => {
          if (headers.includes(field)) {
            initialMapping[field] = field;
            return;
          }
          const normalizedField = field.replace(/_/g, '').toLowerCase();
          const match = headers.find(h => h.replace(/_/g, '').replace(/\s+/g, '').toLowerCase() === normalizedField);
          if (match) {
            initialMapping[field] = match;
          }
        });

        setColumnMapping(initialMapping);
        setStep('map_columns');
      },
      error: (error) => {
        setIsParsing(false);
        setGlobalError(`Failed to parse CSV file: ${error.message}`);
      },
    });
  }, [file, toast, user]);

  const normalizeRow = useCallback((rawRow: Record<string, string>, mapping?: Record<string, string>): ParsedRow => {
    const normalized: SampleDraft = {};
    const errors: string[] = [];
    const currentMapping = mapping || columnMapping;

    requiredFields.forEach((field) => {
      const mappedHeader = currentMapping[field];
      const value = mappedHeader ? rawRow[mappedHeader]?.trim() : undefined;

      if (!value) {
        errors.push(`${field} is required.`);
        return;
      }
      switch (field) {
        case 'sample_type': {
          const lowered = value.toLowerCase();
          const matched = ALLOWED_SAMPLE_TYPES.find((type) => type === lowered);
          if (matched) {
            normalized.sample_type = matched;
          } else {
            errors.push('sample_type: Unsupported type.');
          }
          break;
        }
        case 'date_collected': {
          const normalizedDate = tryNormalizeDate(value);
          if (normalizedDate) {
            normalized.date_collected = normalizedDate;
          } else {
            errors.push('date_collected is invalid.');
          }
          break;
        }
        case 'date_received': {
          const normalizedDate = tryNormalizeDate(value);
          if (normalizedDate) {
            normalized.date_received = normalizedDate;
          } else {
            errors.push('date_received is invalid.');
          }
          break;
        }
        case 'initial_volume': {
          const numericValue = Number(value);
          if (Number.isNaN(numericValue) || numericValue < 0) {
            errors.push('initial_volume must be a positive number.');
          } else {
            normalized.initial_volume = numericValue;
          }
          break;
        }
        case 'current_volume': {
          const numericValue = Number(value);
          if (Number.isNaN(numericValue) || numericValue < 0) {
            errors.push('current_volume must be a positive number.');
          } else {
            normalized.current_volume = numericValue;
          }
          break;
        }
        case 'sample_id':
          normalized.sample_id = value;
          break;
        case 'project_id':
          normalized.project_id = value;
          break;
        case 'source':
          normalized.source = value;
          break;
        case 'storage_location_id':
          normalized.storage_location_id = value;
          break;
        case 'collected_by':
          normalized.collected_by = value;
          break;
        default:
          break;
      }
    });

    const optionalStringFields = ['position_label'] as const;
    optionalStringFields.forEach((field) => {
      const mappedHeader = currentMapping[field];
      const value = mappedHeader ? rawRow[mappedHeader] : undefined;
      if (value) {
        normalized[field] = value;
      }
    });

    const schemaResult = sampleValidationSchema.safeParse(normalized);
    if (!schemaResult.success) {
      schemaResult.error.errors.forEach((error) => {
        const label = error.path.join('.') || 'field';
        errors.push(`${label}: ${error.message}`);
      });
    } else {
      Object.assign(normalized, schemaResult.data);
    }

    return {
      raw: rawRow,
      normalized,
      errors,
      status: errors.length ? 'invalid' : 'valid',
    };
  }, [columnMapping]);

  const handleMappingConfirm = useCallback(() => {
    const missingFields = requiredFields.filter(field => !columnMapping[field]);
    if (missingFields.length > 0) {
      setGlobalError(`Please map the following required fields: ${missingFields.join(', ')}`);
      return;
    }

    setGlobalError(null);
    const parsedRows: ParsedRow[] = rawRows.map((row) => normalizeRow(row, columnMapping));
    setRows(parsedRows);
    setStep('preview');

    const firstInvalidIndex = parsedRows.findIndex((row) => row.status === 'invalid');
    if (firstInvalidIndex >= 0) {
      setSelectedRowIndex(firstInvalidIndex);
    } else if (parsedRows.length) {
      setSelectedRowIndex(0);
    } else {
      setSelectedRowIndex(null);
    }
  }, [columnMapping, rawRows, normalizeRow]);

  const clearBulkInputs = () => {
    setBulkState(initialBulkState);
  };

  const applyBulkUpdate = useCallback(() => {
    setRows((currentRows) =>
      currentRows.map((row) => {
        // If no bulk filters are set, return row as is
        const isBulkEmpty = Object.values(bulkState).every(val => val === '');
        if (row.status === 'valid' && isBulkEmpty) {
          return row;
        }
        const nextNormalized = { ...row.normalized };
        const nextRaw = { ...row.raw };

        if (bulkState.prefix && typeof nextNormalized.sample_id === 'string') {
          nextNormalized.sample_id = `${bulkState.prefix}${nextNormalized.sample_id}`;
        }
        if (bulkState.suffix && typeof nextNormalized.sample_id === 'string') {
          nextNormalized.sample_id = `${nextNormalized.sample_id}${bulkState.suffix}`;
        }
        if (bulkState.dateCollected) {
          const normalized = tryNormalizeDate(bulkState.dateCollected);
          if (normalized) {
            nextNormalized.date_collected = normalized;
            nextRaw.date_collected = normalized;
          }
        }
        if (bulkState.dateReceived) {
          const normalized = tryNormalizeDate(bulkState.dateReceived);
          if (normalized) {
            nextNormalized.date_received = normalized;
            nextRaw.date_received = normalized;
          }
        }
        if (bulkState.collectedBy) {
          nextNormalized.collected_by = bulkState.collectedBy;
          nextRaw.collected_by = bulkState.collectedBy;
        }
        if (bulkState.projectId) {
          nextNormalized.project_id = bulkState.projectId;
          nextRaw.project_id = bulkState.projectId;
        }
        if (bulkState.sampleType) {
          nextNormalized.sample_type = bulkState.sampleType;
          nextRaw.sample_type = bulkState.sampleType;
        }
        if (bulkState.source) {
          nextNormalized.source = bulkState.source;
          nextRaw.source = bulkState.source;
        }
        if (bulkState.storageId) {
          nextNormalized.storage_location_id = bulkState.storageId;
          nextRaw.storage_location_id = bulkState.storageId;
          nextNormalized.position_label = undefined;
          nextRaw.position_label = '';
        }

        const rerun = normalizeRow(nextRaw);
        if (bulkState.storageId) {
          const storage = optionsById.get(bulkState.storageId);
          rerun.normalized.storage_path_ids = storage?.pathIds;
          rerun.normalized.storage_path_names = storage?.pathNames;
        }

        return rerun;
      })
    );
    toast({ title: 'Applied to all', description: 'Updated all rows with bulk settings.' });
  }, [bulkState, normalizeRow, optionsById, toast]);

  const getBatchOccupiedSlots = useCallback((storageId: string, excludeRowIndex?: number) => {
    const occupied = new Set<string>();
    rows.forEach((row, idx) => {
      if (idx !== excludeRowIndex && row.normalized.storage_location_id === storageId && row.normalized.position_label) {
        occupied.add(row.normalized.position_label);
      }
    });
    return occupied;
  }, [rows]);

  const handleBulkAutoAssign = useCallback(() => {
    setRows((currentRows) => {
      const nextRows = [...currentRows];
      const batchOccupancyMap = new Map<string, Set<string>>();

      nextRows.forEach((row) => {
        if (row.normalized.storage_location_id && row.normalized.position_label) {
          if (!batchOccupancyMap.has(row.normalized.storage_location_id)) {
            batchOccupancyMap.set(row.normalized.storage_location_id, new Set());
          }
          batchOccupancyMap.get(row.normalized.storage_location_id)!.add(row.normalized.position_label);
        }
      });

      return nextRows.map((row) => {
        if (row.normalized.storage_location_id && !row.normalized.position_label) {
          const storage = optionsById.get(row.normalized.storage_location_id);
          if (storage?.gridSpec) {
            const rowsCount = storage.gridSpec.rows ?? 0;
            const cols = storage.gridSpec.cols ?? 0;
            const disabled = new Set(storage.gridSpec.disabled_slots ?? []);
            const dbOccupied = new Set(Object.keys(storage.occupiedSlots ?? {}));
            const batchOccupied = batchOccupancyMap.get(row.normalized.storage_location_id) || new Set();

            for (let r = 0; r < rowsCount; r += 1) {
              for (let c = 0; c < cols; c += 1) {
                const label = storage.gridSpec?.label_schema;
                const coord = `${label === 'numeric' ? r + 1 : String.fromCharCode(65 + r)}${c + 1}`;
                if (!disabled.has(coord) && !dbOccupied.has(coord) && !batchOccupied.has(coord)) {
                  const nextRaw = { ...row.raw, position_label: coord };
                  const nextRow = normalizeRow(nextRaw);
                  nextRow.normalized.storage_path_ids = storage.pathIds;
                  nextRow.normalized.storage_path_names = storage.pathNames;

                  if (!batchOccupancyMap.has(row.normalized.storage_location_id)) {
                    batchOccupancyMap.set(row.normalized.storage_location_id, new Set());
                  }
                  batchOccupancyMap.get(row.normalized.storage_location_id)!.add(coord);

                  return nextRow;
                }
              }
            }
          }
        }
        return row;
      });
    });
    toast({ title: 'Auto-assign complete', description: 'Available slots have been assigned to rows with storage locations.' });
  }, [optionsById, normalizeRow, toast]);

  const updateRowField = useCallback((rowIndex: number, field: string, value: string) => {
    setRows((currentRows) => {
      const nextRows = [...currentRows];
      const row = nextRows[rowIndex];
      const updatedRaw = { ...row.raw, [field]: value };
      nextRows[rowIndex] = normalizeRow(updatedRaw);
      return nextRows;
    });
  }, [normalizeRow]);

  const applyFieldToAll = useCallback((field: string, value: string) => {
    setRows((currentRows) =>
      currentRows.map((row) => {
        const updatedRaw = { ...row.raw, [field]: value };
        const updatedRow = normalizeRow(updatedRaw);
        if (field === 'storage_location_id') {
          const storage = optionsById.get(value);
          updatedRow.normalized.storage_path_ids = storage?.pathIds;
          updatedRow.normalized.storage_path_names = storage?.pathNames;
          updatedRow.normalized.position_label = undefined;
          updatedRow.raw.position_label = '';
        }
        return updatedRow;
      })
    );
    toast({ title: 'Applied to all', description: `Updated ${field.replace(/_/g, ' ')} for all rows.` });
  }, [normalizeRow, optionsById, toast]);

  const handleCommit = useCallback(async () => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Authentication required',
        description: 'Please sign in again before importing samples.',
      });
      return;
    }
    if (!validRows.length) {
      setGlobalError('No valid rows to import yet. Resolve the errors or remove invalid rows.');
      return;
    }

    setIsCommitting(true);
    setGlobalError(null);
    try {
      await onImport(
        validRows.map((row) => {
          const normalizedRow = row.normalized as CompleteSampleDraft;
          const storageOption = optionsById.get(normalizedRow.storage_location_id);

          return {
            ...normalizedRow,
            date_collected: normalizedRow.date_collected,
            date_received: normalizedRow.date_received,
            createdById: user.uid,
            storage_path_ids: storageOption?.pathIds ?? normalizedRow.storage_path_ids ?? [],
            storage_path_names: storageOption?.pathNames ?? normalizedRow.storage_path_names ?? [],
          } satisfies Omit<Sample, 'id' | 'createdAt' | 'createdBy' | 'barcode' | 'status'>;
        }),
      );
      toast({ title: 'Import queued', description: `${validRows.length} samples are being imported.` });
      onOpenChange(false);
      resetState();
    } catch (error) {
      console.error('Batch import failed:', error);
      setGlobalError('Import failed. Please try again or contact support.');
    } finally {
      setIsCommitting(false);
    }
  }, [onImport, onOpenChange, optionsById, toast, user, validRows]);

  const removeRow = useCallback((rowIndex: number) => {
    setRows((currentRows) => currentRows.filter((_, idx) => idx !== rowIndex));
  }, []);

  const resetState = useCallback(() => {
    setStep('select');
    setFile(null);
    setRawHeaders([]);
    setRows([]);
    setSelectedRowIndex(null);
    setIsParsing(false);
    setIsCommitting(false);
    setGlobalError(null);
    setBulkState(initialBulkState);
    setRowFilter('all');
  }, []);

  const canContinue = useMemo(() => {
    if (step === 'select') return Boolean(file);
    if (step === 'map_columns') return requiredFields.every(field => !!columnMapping[field]);
    if (step === 'preview') return rows.length > 0;
    if (step === 'resolve') return Boolean(rows.length && invalidRows.length === 0 && validRows.length);
    return true;
  }, [file, step, rows.length, invalidRows.length, validRows.length, columnMapping]);

  const goNext = useCallback(() => {
    if (step === 'select' && file) {
      onParse();
      return;
    }
    if (step === 'map_columns') {
      handleMappingConfirm();
      return;
    }
    if (step === 'preview') {
      setStep('resolve');
      return;
    }
    if (step === 'resolve') {
      setStep('commit');
      return;
    }
    if (step === 'commit') {
      handleCommit();
    }
  }, [file, handleCommit, onParse, handleMappingConfirm, step]);

  const goBack = useCallback(() => {
    if (step === 'commit') {
      setStep('resolve');
      return;
    }
    if (step === 'resolve') {
      setStep('preview');
      return;
    }
    if (step === 'preview') {
      setStep('map_columns');
      return;
    }
    if (step === 'map_columns') {
      setStep('select');
      return;
    }
    onOpenChange(false);
  }, [onOpenChange, step]);

  const stepDescription = {
    select: 'Upload a CSV file and we will parse the data while keeping mismatched rows.',
    map_columns: 'Match your CSV columns to the required system fields.',
    preview: 'Verify detected headers, duplicates, and row quality before proceeding.',
    resolve:
      'Fix problematic rows using the inline editor below. You can bulk apply dates, IDs, and collectors for quick cleanups.',
    commit:
      'Confirm the import plan. Valid rows will be batched into Firestore while rejected rows can be exported or revisited.',
  }[step];

  const currentRow = selectedRowIndex != null ? rows[selectedRowIndex] : null;
  const currentStorageId = currentRow?.normalized.storage_location_id;
  const { occupiedSlots: liveOccupiedSlots } = useStorageOccupancy(currentStorageId);

  const autoAssignSlot = useCallback(
    (rowIndex: number, storage?: StorageOption) => {
      if (!storage?.gridSpec) return;
      const rowsCount = storage.gridSpec.rows ?? 0;
      const cols = storage.gridSpec.cols ?? 0;
      const disabled = new Set(storage.gridSpec.disabled_slots ?? []);
      const occupied = new Set(Object.keys(storage.occupiedSlots ?? {}));
      const batchOccupied = getBatchOccupiedSlots(storage.id, rowIndex);

      if (storage.id === currentStorageId) {
        liveOccupiedSlots.forEach(slot => occupied.add(slot));
      }

      for (let r = 0; r < rowsCount; r += 1) {
        for (let c = 0; c < cols; c += 1) {
          const label = storage.gridSpec?.label_schema;
          const coord = `${label === 'numeric' ? r + 1 : String.fromCharCode(65 + r)}${c + 1}`;
          if (disabled.has(coord) || occupied.has(coord) || batchOccupied.has(coord)) continue;
          updateRowField(rowIndex, 'position_label', coord);
          return;
        }
      }
      toast({ variant: 'destructive', title: 'No slots available', description: 'All positions appear occupied or blocked.' });
    },
    [toast, updateRowField, getBatchOccupiedSlots, currentStorageId, liveOccupiedSlots],
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Batch import samples</DialogTitle>
          <DialogDescription>{stepDescription}</DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[65vh] flex-col gap-4 overflow-hidden">
          <div className="space-y-2 shrink-0">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{step === 'map_columns' ? 'Map columns' : step === 'preview' ? 'Review parsed data' : step === 'resolve' ? 'Fix or augment rows' : step === 'commit' ? 'Confirm import' : 'Upload CSV file'}</span>
              <span>{progressMeta.indicator}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted" aria-label={`Progress ${progressMeta.percent}%`}>
              <div
                className="h-2 rounded-full bg-primary transition-all"
                style={{ width: `${progressMeta.percent}%` }}
              />
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto pr-1">
            {globalError && (
              <Alert variant="destructive">
                <AlertTitle>Import issue</AlertTitle>
                <AlertDescription>{globalError}</AlertDescription>
              </Alert>
            )}

            {step === 'select' && (
              <ImportStepSelect
                file={file}
                onFileChange={handleFileChange}
                onRemoveFile={() => setFile(null)}
              />
            )}

            {step === 'map_columns' && (
              <ImportStepMap
                requiredFields={requiredFields}
                optionalFields={['position_label']}
                rawHeaders={rawHeaders}
                columnMapping={columnMapping}
                onMappingChange={(field, value) => setColumnMapping(prev => ({ ...prev, [field]: value }))}
              />
            )}

            {step === 'preview' && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant="secondary">Rows: {rows.length}</Badge>
                  <Badge variant="outline" className="text-green-600">
                    Valid: {validRows.length}
                  </Badge>
                  <Badge variant="outline" className="text-amber-600">
                    Needs attention: {invalidRows.length}
                  </Badge>
                </div>
                {/* Reusing ImportStepResolve for preview but read-only or just a simple table? 
                    The original code had a simple table for preview. 
                    I'll use ImportStepResolve but maybe I should have kept the simple table for preview.
                    Actually, the plan said "ImportStepResolve: The main editing interface (Preview/Resolve)".
                    So I can use it for both, or just skip preview and go to resolve?
                    The original flow had 'preview' then 'resolve'.
                    'preview' showed a table. 'resolve' showed the split view.
                    I'll keep the simple table for preview here to match original behavior, or just use ImportStepResolve in a "preview" mode.
                    For now, I'll just use ImportStepResolve for 'resolve' and keep the simple table for 'preview' if I can, or just reuse ImportStepResolve.
                    Let's reuse ImportStepResolve but maybe hide the editor?
                    Actually, let's just use the simple table code from before for 'preview' to avoid complexity in ImportStepResolve for now.
                */}
                <div className="rounded-md border">
                  <div className="max-h-80 w-full overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-muted">
                        <tr>
                          <th className="px-3 py-2 text-left">Status</th>
                          {requiredFields.map((field) => (
                            <th key={field} className="px-3 py-2 text-left capitalize">
                              {field.replace(/_/g, ' ')}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, idx) => (
                          <tr key={`preview-row-${idx}`} className="border-b last:border-0">
                            <td className="px-3 py-2">
                              <Badge variant={row.status === 'valid' ? 'secondary' : 'destructive'}>{row.status}</Badge>
                            </td>
                            {requiredFields.map((field) => (
                              <td key={field} className="px-3 py-2">
                                {row.normalized[field] ?? row.raw[field] ?? '—'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {step === 'resolve' && (
              <ImportStepResolve
                rows={rows}
                selectedRowIndex={selectedRowIndex}
                onSelectRow={setSelectedRowIndex}
                onRemoveRow={removeRow}
                onUpdateRow={updateRowField}
                bulkState={bulkState}
                setBulkState={setBulkState}
                onApplyBulk={applyBulkUpdate}
                onClearBulk={clearBulkInputs}
                onAutoAssignBulk={handleBulkAutoAssign}
                storageOptions={storageOptions}
                projectOptions={projectOptions}
                isLoadingProjects={isLoadingProjects}
                isLoadingStorageOptions={isLoadingStorageOptions}
                optionsById={optionsById}
                onApplyFieldToAll={applyFieldToAll}
                getBatchOccupiedSlots={getBatchOccupiedSlots}
                liveOccupiedSlots={liveOccupiedSlots}
                currentStorageId={currentStorageId}
                onAutoAssignSlot={autoAssignSlot}
              />
            )}

            {step === 'commit' && (
              <ImportStepCommit
                validRows={validRows}
                invalidRows={invalidRows}
                isCommitting={isCommitting}
                onCommit={handleCommit}
                onBack={goBack}
              />
            )}
          </div>
        </div>

        <DialogFooter className="mt-6 gap-2">
          {step !== 'commit' && (
            <>
              <Button variant="outline" onClick={goBack} disabled={isParsing || isCommitting}>
                Back
              </Button>
              {step === 'resolve' && (
                <Button variant="secondary" onClick={() => setRows((currentRows) => currentRows.filter((row) => row.status === 'valid'))}>
                  Remove invalid rows
                </Button>
              )}
              <Button onClick={goNext} disabled={!canContinue || isParsing}>
                {step === 'select' && isParsing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Continue
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}