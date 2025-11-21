'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { notFound, useParams } from 'next/navigation';
import { addDoc, collection, doc, query, where, serverTimestamp } from 'firebase/firestore';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  ClipboardList,
  FlaskConical,
  PlayCircle,
  User,
  XCircle,
  Badge as BadgeIcon,
  Dna,
  Beaker,
  Package,
  FileCheck2,
  ListTodo,
  AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { useDoc, useFirestore, useUser, useCollection } from '@/firebase';
import { Task, UserProfile, Sample, DnaExtract, TaskSampleProgressStatus } from '@/lib/types';
import { isSampleSuccessful, requiresStorage, deriveSampleStatus, isTaskComplete } from '@/domains/science/task-logic';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getTaskStatusVariant, cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { useStorageOptions } from '@/hooks/use-storage-options';
import { useStorageTypes } from '@/hooks/use-storage-types';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Form, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { StorageLocationField } from '@/app/dashboard/samples/_components/storage-location-field';
import { StorageGridSlotPicker } from '@/app/dashboard/samples/_components/storage-grid-slot-picker';

function DetailItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-5 w-5 text-muted-foreground mt-0.5" />
      <div className="flex flex-col">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="font-medium">{value || '-'}</span>
      </div>
    </div>
  );
}

export default function TaskDetailPage() {
  const { taskId } = useParams();
  const firestore = useFirestore();
  const { user: currentUser } = useUser();
  const { toast } = useToast();
  const [isLoggingExtracts, setIsLoggingExtracts] = useState(false);
  const [updatingSampleId, setUpdatingSampleId] = useState<string | null>(null);
  const [savingExtractId, setSavingExtractId] = useState<string | null>(null);
  const [extractDrafts, setExtractDrafts] = useState<Record<string, { yield: string; purity: string; volume: string }>>({});
  const [storageSheetSampleId, setStorageSheetSampleId] = useState<string | null>(null);
  const [isSavingStorage, setIsSavingStorage] = useState(false);

  const { options: storageOptions, optionsById: storageOptionsById, isLoading: isLoadingStorageOptions } = useStorageOptions();
  const { typesById: storageTypesById } = useStorageTypes();
  const storageForm = useForm<{ storage_location_id: string; storage_position_label: string }>({
    defaultValues: {
      storage_location_id: '',
      storage_position_label: '',
    },
  });
  const allStorageFull = useMemo(() => {
    if (!storageOptions.length) return false;
    return storageOptions.every(option => typeof option.availableSlots === 'number' && option.availableSlots <= 0);
  }, [storageOptions]);
  const watchStorageId = storageForm.watch('storage_location_id');
  const watchStoragePosition = storageForm.watch('storage_position_label');
  const selectedStorage = watchStorageId ? storageOptionsById.get(watchStorageId) : undefined;
  const selectedStorageType = useMemo(() => {
    if (!selectedStorage?.type) return undefined;
    return storageTypesById.get(selectedStorage.type);
  }, [selectedStorage, storageTypesById]);
  const selectedStorageTemperatureC = useMemo(() => {
    if (typeof selectedStorage?.temperature === 'number') return selectedStorage.temperature;
    if (typeof selectedStorageType?.default_temperature === 'number') return selectedStorageType.default_temperature;
    if (typeof selectedStorageType?.defaults?.temperatureC === 'number') return selectedStorageType.defaults.temperatureC;
    return undefined;
  }, [selectedStorage?.temperature, selectedStorageType?.default_temperature, selectedStorageType?.defaults?.temperatureC]);
  const storageHasGrid = Boolean(selectedStorage?.gridSpec);
  const noSlotsAvailable = storageHasGrid && (selectedStorage?.availableSlots ?? 0) <= 0;

  const sampleProgressOptions: { value: TaskSampleProgressStatus; label: string }[] = [
    { value: 'pending', label: 'Pending' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'successful', label: 'Successful' },
    { value: 'failed', label: 'Failed' },
    { value: 'needs_review', label: 'Needs review' },
    { value: 'extracted', label: 'Extracted (final)' },
  ];

  const getProgressVariant = (status: TaskSampleProgressStatus): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'successful':
      case 'extracted':
        return 'secondary';
      case 'failed':
        return 'destructive';
      case 'needs_review':
        return 'outline';
      default:
        return 'default';
    }
  };

  const taskRef = useMemo(() => doc(firestore, 'tasks', taskId as string), [firestore, taskId]);
  const { data: task, isLoading: isLoadingTask } = useDoc<Task>(taskRef);

  const usersQuery = useMemo(() => {
    if (!firestore || !currentUser) return null;
    return query(collection(firestore, 'user_profiles'));
  }, [firestore, currentUser]);
  const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile>(usersQuery);

  const samplesQuery = useMemo(() => {
    if (!firestore || !currentUser) return null;
    return query(collection(firestore, 'samples'));
  }, [firestore, currentUser]);
  const { data: allSamples, isLoading: isLoadingSamples } = useCollection<Sample>(samplesQuery);

  const userMap = useMemo(() => {
    if (!users) return new Map<string, UserProfile>();
    return new Map(users.map(u => [u.id!, u]));
  }, [users]);

  const taskSamples = useMemo(() => {
    if (!task || !allSamples) return [];
    const sampleIdSet = new Set(task.sampleIds);
    // FIX: Compare the sample's document ID (s.id) with the IDs in the set.
    return allSamples.filter(s => sampleIdSet.has(s.id!));
  }, [task, allSamples]);

  const activityLogCollection = useMemo(() => (firestore ? collection(firestore, 'activity_log') : null), [firestore]);

  const taskLinkedExtractsQuery = useMemo(() => {
    if (!firestore || !taskId) return null;
    return query(collection(firestore, 'dna_extracts'), where('source_task_id', '==', taskId as string));
  }, [firestore, taskId]);
  const { data: taskLinkedExtracts } = useCollection<DnaExtract>(taskLinkedExtractsQuery);

  const existingExtractSampleIds = useMemo(() => {
    if (!taskLinkedExtracts) return new Set<string>();
    return new Set(taskLinkedExtracts.map(ext => ext.sample_id));
  }, [taskLinkedExtracts]);

  const extractBySampleId = useMemo(() => {
    if (!taskLinkedExtracts) return new Map<string, DnaExtract & { id?: string }>();
    return new Map(taskLinkedExtracts.map(ext => [ext.sample_id, ext]));
  }, [taskLinkedExtracts]);

  const sampleBySampleId = useMemo(() => {
    const map = new Map<string, Sample>();
    taskSamples.forEach(sample => {
      if (sample.sample_id) {
        map.set(sample.sample_id, sample);
      }
    });
    return map;
  }, [taskSamples]);

  const sampleProgress = useMemo(() => task?.sampleProgress ?? {}, [task]);

  const storageSheetOpen = Boolean(storageSheetSampleId);
  const storageSheetSample = storageSheetSampleId ? sampleBySampleId.get(storageSheetSampleId) : null;
  const storageSheetExtract = storageSheetSampleId ? extractBySampleId.get(storageSheetSampleId) : null;
  const storageSheetSampleStatus = storageSheetSampleId
    ? (sampleProgress[storageSheetSampleId] as TaskSampleProgressStatus | undefined)
    : undefined;

  const storageGridWarning = useMemo(() => {
    if (!storageSheetOpen || !storageHasGrid || !selectedStorage) return undefined;
    if (noSlotsAvailable) return 'All slots in this container appear occupied or blocked.';
    if (!watchStoragePosition) return 'Select an empty slot before saving.';
    return undefined;
  }, [noSlotsAvailable, selectedStorage, storageHasGrid, storageSheetOpen, watchStoragePosition]);

  useEffect(() => {
    if (!storageSheetOpen || !storageSheetExtract) {
      storageForm.reset({ storage_location_id: '', storage_position_label: '' });
      return;
    }
    storageForm.reset({
      storage_location_id: storageSheetExtract.storage_location_id ?? '',
      storage_position_label: storageSheetExtract.storage_position_label ?? '',
    });
  }, [storageForm, storageSheetExtract, storageSheetOpen]);

  const hasStorageForSample = useCallback(
    (sampleId: string) => {
      const linked = extractBySampleId.get(sampleId);
      if (!linked) return false;
      const locationId = linked.storage_location_id;
      if (!locationId || locationId === 'pending-location') return false;
      return true;
    },
    [extractBySampleId]
  );

  const getRowAccentClasses = useCallback((status: TaskSampleProgressStatus | undefined) => {
    switch (status) {
      case 'successful':
      case 'extracted':
        return 'bg-emerald-50 dark:bg-emerald-950/20 border-l-4 border-emerald-500 dark:border-emerald-500/40';
      case 'failed':
        return 'bg-red-50 dark:bg-red-950/20 border-l-4 border-red-500 dark:border-red-500/40';
      case 'needs_review':
        return 'bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 dark:border-amber-500/40';
      case 'in_progress':
        return 'bg-sky-50 dark:bg-sky-950/20 border-l-4 border-sky-500';
      case 'pending':
      default:
        return 'bg-muted/40 dark:bg-slate-900/30 border-l-4 border-slate-300 dark:border-slate-700';
    }
  }, []);

  const samplesMissingStorage = useMemo(() => {
    return taskSamples.filter(sample => {
      if (!sample.sample_id) return false;
      const status = sampleProgress[sample.sample_id] as TaskSampleProgressStatus | undefined;
      if (!status) return false;
      if (requiresStorage(status)) {
        return !hasStorageForSample(sample.sample_id);
      }
      return false;
    });
  }, [hasStorageForSample, sampleProgress, taskSamples]);

  const missingStorageCount = samplesMissingStorage.length;

  const handleStorageAutoAssign = useCallback(() => {
    if (!selectedStorage?.gridSpec) return;
    const rows = selectedStorage.gridSpec.rows ?? 0;
    const cols = selectedStorage.gridSpec.cols ?? 0;
    const disabled = new Set(selectedStorage.gridSpec.disabled_slots ?? []);
    const occupied = new Set(Object.keys(selectedStorage.occupiedSlots ?? {}));
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const coord = selectedStorage.gridSpec.label_schema === 'numeric'
          ? `${r + 1}-${c + 1}`
          : `${String.fromCharCode(65 + r)}${c + 1}`;
        if (disabled.has(coord) || occupied.has(coord)) continue;
        storageForm.setValue('storage_position_label', coord, { shouldDirty: true });
        return;
      }
    }
  }, [selectedStorage, storageForm]);

  const handleOpenStorageSheet = useCallback(
    (sampleId: string) => {
      const linked = extractBySampleId.get(sampleId);
      if (!linked?.id) {
        toast({ variant: 'destructive', title: 'No extract found', description: 'Capture the DNA extract before assigning storage.' });
        return;
      }
      setStorageSheetSampleId(sampleId);
    },
    [extractBySampleId, toast]
  );

  const handleStorageSheetChange = useCallback((open: boolean) => {
    if (!open) {
      setStorageSheetSampleId(null);
    }
  }, []);

  const handleStorageSubmit = useCallback(
    async (values: { storage_location_id: string; storage_position_label: string }) => {
      if (!storageSheetSampleId || !storageSheetExtract?.id) {
        toast({ variant: 'destructive', title: 'Missing extract', description: 'Link a DNA extract before assigning storage.' });
        return;
      }
      if (!currentUser || !currentUser.email || !activityLogCollection) {
        toast({ variant: 'destructive', title: 'Not authenticated' });
        return;
      }
      if (!values.storage_location_id) {
        storageForm.setError('storage_location_id', { type: 'manual', message: 'Select a storage location' });
        toast({ variant: 'destructive', title: 'Storage required', description: 'Choose where this extract will live.' });
        return;
      }
      if (storageHasGrid && !values.storage_position_label) {
        storageForm.setError('storage_position_label', { type: 'manual', message: 'Select an empty slot' });
        toast({ variant: 'destructive', title: 'Slot required', description: 'Pick a grid slot before saving.' });
        return;
      }
      if (storageHasGrid && noSlotsAvailable) {
        toast({ variant: 'destructive', title: 'Container full', description: 'Choose a different container with free capacity.' });
        return;
      }

      setIsSavingStorage(true);
      try {
        const extractRef = doc(firestore, 'dna_extracts', storageSheetExtract.id);
        await updateDocumentNonBlocking(extractRef, {
          storage_location_id: values.storage_location_id,
          storage_position_label: values.storage_position_label || null,
          status: storageSheetSampleStatus === 'failed' ? storageSheetExtract.status : 'stored',
        });

        if (storageSheetSample?.id && (storageSheetSampleStatus === 'successful' || storageSheetSampleStatus === 'extracted')) {
          await updateDocumentNonBlocking(doc(firestore, 'samples', storageSheetSample.id), { status: 'extracted' });
        }

        await addDocumentNonBlocking(activityLogCollection, {
          action: 'update',
          details: `Assigned storage for DNA extract ${storageSheetExtract.dna_id}`,
          target_entity: 'dna_extracts',
          target_id: storageSheetExtract.id,
          timestamp: new Date().toISOString(),
          user_email: currentUser.email,
          user_id: currentUser.uid,
        });

        toast({ title: 'Storage assigned', description: `Stored ${storageSheetExtract.dna_id} successfully.` });
        setStorageSheetSampleId(null);
      } catch (error) {
        console.error('Failed to assign storage', error);
        toast({ variant: 'destructive', title: 'Assignment failed', description: 'Could not update storage location.' });
      } finally {
        setIsSavingStorage(false);
      }
    },
    [activityLogCollection, currentUser, firestore, noSlotsAvailable, storageForm, storageHasGrid, storageSheetExtract, storageSheetSample, storageSheetSampleId, storageSheetSampleStatus, toast]
  );

  useEffect(() => {
    if (!taskLinkedExtracts) {
      setExtractDrafts({});
      return;
    }
    const drafts: Record<string, { yield: string; purity: string; volume: string }> = {};
    taskLinkedExtracts.forEach(ext => {
      drafts[ext.sample_id] = {
        yield: typeof ext.yield_ng_per_ul === 'number' ? String(ext.yield_ng_per_ul) : '',
        purity: typeof ext.a260_a280 === 'number' ? String(ext.a260_a280) : '',
        volume: typeof ext.volume_ul === 'number' ? String(ext.volume_ul) : '',
      };
    });
    setExtractDrafts(drafts);
  }, [taskLinkedExtracts]);

  type MetricField = 'yield' | 'purity' | 'volume';

  const handleExtractDraftChange = useCallback((sampleId: string, field: MetricField, value: string) => {
    setExtractDrafts(prev => ({
      ...prev,
      [sampleId]: {
        yield: field === 'yield' ? value : prev[sampleId]?.yield ?? '',
        purity: field === 'purity' ? value : prev[sampleId]?.purity ?? '',
        volume: field === 'volume' ? value : prev[sampleId]?.volume ?? '',
      },
    }));
  }, []);

  const hasDraftChanges = useCallback(
    (sampleId: string) => {
      const draft = extractDrafts[sampleId];
      const linked = extractBySampleId.get(sampleId);
      if (!draft || !linked) return false;
      const toStringOrEmpty = (value: number | null | undefined) =>
        typeof value === 'number' ? String(value) : '';
      return (
        draft.yield !== toStringOrEmpty(linked.yield_ng_per_ul ?? null) ||
        draft.purity !== toStringOrEmpty(linked.a260_a280 ?? null) ||
        draft.volume !== toStringOrEmpty(linked.volume_ul ?? null)
      );
    },
    [extractBySampleId, extractDrafts]
  );

  const handleInlineExtractSave = useCallback(
    async (sampleId: string) => {
      const linked = extractBySampleId.get(sampleId);
      if (!linked?.id) {
        toast({ variant: 'destructive', title: 'No extract found', description: 'Create an extract before saving metrics.' });
        return;
      }
      if (!currentUser || !currentUser.email || !activityLogCollection) {
        toast({ variant: 'destructive', title: 'Not authenticated' });
        return;
      }
      const draft = extractDrafts[sampleId];
      const parseNumber = (value: string | undefined) => {
        if (!value?.trim()) return null;
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
      };

      const payload: Partial<DnaExtract> = {
        yield_ng_per_ul: parseNumber(draft?.yield),
        a260_a280: parseNumber(draft?.purity),
        volume_ul: parseNumber(draft?.volume),
      };

      setSavingExtractId(sampleId);
      try {
        await updateDocumentNonBlocking(doc(firestore, 'dna_extracts', linked.id), payload);
        await addDocumentNonBlocking(activityLogCollection, {
          action: 'update',
          details: `Updated metrics for DNA extract ${linked.dna_id}`,
          target_entity: 'dna_extracts',
          target_id: linked.id,
          timestamp: new Date().toISOString(),
          user_email: currentUser.email,
          user_id: currentUser.uid,
        });
        toast({ title: 'Metrics saved', description: `${linked.dna_id} metrics updated.` });
      } catch (error) {
        console.error('Failed to update extract metrics', error);
        toast({ variant: 'destructive', title: 'Save failed', description: 'Could not update extract metrics.' });
      } finally {
        setSavingExtractId(null);
      }
    },
    [activityLogCollection, currentUser, extractBySampleId, extractDrafts, firestore, toast]
  );

  const isLoading = isLoadingTask || isLoadingUsers || isLoadingSamples;

  const pendingSamplesForExtraction = useMemo(() => {
    if (!task || task.type !== 'DNA Extraction') return [];
    return taskSamples.filter(
      (sample) => sample.sample_id && !existingExtractSampleIds.has(sample.sample_id)
    );
  }, [existingExtractSampleIds, task, taskSamples]);

  const extractionStats = useMemo(() => {
    const total = taskSamples.length;
    const logged = taskSamples.filter(sample => sample.sample_id && existingExtractSampleIds.has(sample.sample_id)).length;
    const pending = total - logged;
    const completion = total ? Math.round((logged / total) * 100) : 0;
    return { total, logged, pending, completion };
  }, [existingExtractSampleIds, taskSamples]);

  const autoGenerateDnaExtracts = useCallback(async () => {
    if (!firestore || !task || task.type !== 'DNA Extraction') return;
    if (!currentUser || !currentUser.email || !activityLogCollection) {
      toast({ variant: 'destructive', title: 'Not authenticated' });
      return;
    }

    const eligibleSamples = taskSamples.filter(
      (sample) => sample.sample_id && !existingExtractSampleIds.has(sample.sample_id)
    );

    if (eligibleSamples.length === 0) {
      return;
    }

    const operatorName = userMap.get(task.assignedTo)?.name || currentUser.displayName || currentUser.email || 'Unknown operator';
    const userEmail = currentUser.email as string;
    const timestamp = new Date();
    const timestampSlug = format(timestamp, 'yyyyMMdd-HHmmss');
    const dnaExtractsCollection = collection(firestore, 'dna_extracts');

    try {
      await Promise.all(
        eligibleSamples.map(async (sample) => {
          const dnaId = `DNA-${sample.sample_id}-${timestampSlug}`;
          const extractPayload: Omit<DnaExtract, 'id'> = {
            dna_id: dnaId,
            sample_id: sample.sample_id,
            project_id: sample.project_id,
            barcode: dnaId,
            date_extracted: timestamp.toISOString(),
            operator: operatorName,
            yield_ng_per_ul: null,
            a260_a280: null,
            a260_a230: null,
            volume_ul: null,
            storage_location_id: sample.storage_location_id ?? 'pending-location',
            storage_position_label: sample.position_label ?? null,
            status: 'stored',
            source_task_id: taskId as string,
            extraction_method: 'auto-generated',
            notes: 'Auto-generated placeholder. Update with actual metrics.',
            technician: operatorName,
            technician_id: currentUser.uid,
            createdAt: serverTimestamp(),
            createdBy: userEmail,
            createdById: currentUser.uid,
          };

          const docRef = await addDoc(dnaExtractsCollection, extractPayload);
          await addDoc(activityLogCollection, {
            action: 'create',
            details: `Auto-generated DNA extract ${dnaId} from task ${task.taskId}`,
            target_entity: 'dna_extracts',
            target_id: docRef.id,
            timestamp: new Date().toISOString(),
            user_email: userEmail,
            user_id: currentUser.uid,
          });
        })
      );

      toast({
        title: 'DNA extracts captured',
        description: `Stored ${eligibleSamples.length} DNA extracts for this task.`,
      });
    } catch (error) {
      console.error('Failed to auto-generate DNA extracts', error);
      toast({
        variant: 'destructive',
        title: 'DNA extract sync failed',
        description: 'We could not automatically log the extracts. Please review manually.',
      });
    }
  }, [
    activityLogCollection,
    currentUser,
    existingExtractSampleIds,
    firestore,
    task,
    taskId,
    taskSamples,
    toast,
    userMap,
  ]);

  const handleSampleProgressChange = useCallback(
    async (sampleId: string, newStatus: TaskSampleProgressStatus) => {
      if (!task || !sampleId) return;
      if (!currentUser || !currentUser.email || !activityLogCollection) {
        toast({ variant: 'destructive', title: 'Not authenticated' });
        return;
      }
      if (requiresStorage(newStatus) && !hasStorageForSample(sampleId)) {
        toast({
          variant: 'destructive',
          title: 'Storage required',
          description: 'Assign a storage location before marking this sample successful.',
        });
        return;
      }

      setUpdatingSampleId(sampleId);
      const nextProgress = {
        ...(task.sampleProgress ?? {}),
        [sampleId]: newStatus,
      };

      const sampleDoc = sampleBySampleId.get(sampleId);
      const sampleDocRef = sampleDoc?.id ? doc(firestore, 'samples', sampleDoc.id) : null;
      const linkedExtract = extractBySampleId.get(sampleId);
      const extractDocRef = linkedExtract?.id ? doc(firestore, 'dna_extracts', linkedExtract.id) : null;

      const nextSampleStatus: Sample['status'] = deriveSampleStatus(newStatus, hasStorageForSample(sampleId));

      const nextExtractStatus = (() => {
        if (!linkedExtract) return undefined;
        if (newStatus === 'failed') return 'disposed';
        if (isSampleSuccessful(newStatus)) {
          return linkedExtract.storage_location_id ? 'stored' : 'stored';
        }
        return undefined;
      })();

      try {
        await updateDocumentNonBlocking(taskRef, { sampleProgress: nextProgress });

        const writes: Promise<unknown>[] = [];

        if (sampleDocRef) {
          writes.push(updateDocumentNonBlocking(sampleDocRef, { status: nextSampleStatus }));
        }

        if (extractDocRef && nextExtractStatus) {
          writes.push(updateDocumentNonBlocking(extractDocRef, { status: nextExtractStatus }));
        }

        await Promise.all(writes);

        await addDocumentNonBlocking(activityLogCollection, {
          action: 'update',
          details: `Marked sample ${sampleId} as ${newStatus} for task ${task.taskId}`,
          target_entity: 'tasks',
          target_id: task.id ?? (taskId as string),
          timestamp: new Date().toISOString(),
          user_email: currentUser.email,
          user_id: currentUser.uid,
        });

        if (sampleDocRef) {
          await addDocumentNonBlocking(activityLogCollection, {
            action: 'update',
            details: `Sample ${sampleId} status synced to ${nextSampleStatus}`,
            target_entity: 'samples',
            target_id: sampleDoc?.id ?? sampleId,
            timestamp: new Date().toISOString(),
            user_email: currentUser.email,
            user_id: currentUser.uid,
          });
        }

        if (extractDocRef && nextExtractStatus) {
          await addDocumentNonBlocking(activityLogCollection, {
            action: 'update',
            details: `DNA extract for ${sampleId} marked ${nextExtractStatus}`,
            target_entity: 'dna_extracts',
            target_id: linkedExtract?.id ?? sampleId,
            timestamp: new Date().toISOString(),
            user_email: currentUser.email,
            user_id: currentUser.uid,
          });
        }

        toast({
          title: 'Sample status updated',
          description: `${sampleId} set to ${newStatus.replace('_', ' ')}`,
        });
      } catch (error) {
        console.error('Failed to update sample progress', error);
        toast({ variant: 'destructive', title: 'Update failed', description: 'Could not update sample progress.' });
      } finally {
        setUpdatingSampleId(null);
      }
    },
    [activityLogCollection, currentUser, extractBySampleId, firestore, hasStorageForSample, sampleBySampleId, task, taskId, taskRef, toast]
  );

  const handleCaptureExtracts = useCallback(async () => {
    if (pendingSamplesForExtraction.length === 0) {
      toast({ title: 'All extracts logged', description: 'Every sample in this task already has a DNA extract.' });
      return;
    }
    try {
      setIsLoggingExtracts(true);
      await autoGenerateDnaExtracts();
    } finally {
      setIsLoggingExtracts(false);
    }
  }, [autoGenerateDnaExtracts, pendingSamplesForExtraction.length, toast]);

  const handleStatusUpdate = async (newStatus: Task['status']) => {
    if (!currentUser || !currentUser.email || !activityLogCollection) {
      toast({ variant: 'destructive', title: 'Not authenticated' });
      return;
    }
    if (!task) {
      toast({ variant: 'destructive', title: 'Task not ready' });
      return;
    }

    try {
      await updateDocumentNonBlocking(taskRef, { status: newStatus });
      await addDocumentNonBlocking(activityLogCollection, {
        action: 'update',
        details: `Updated task "${task.title}" status to ${newStatus}`,
        target_entity: 'tasks',
        target_id: taskId as string,
        timestamp: new Date().toISOString(),
        user_email: currentUser.email,
        user_id: currentUser.uid,
      });

      if (newStatus === 'Completed' && task.type === 'DNA Extraction') {
        await autoGenerateDnaExtracts();
      }

      toast({ title: 'Task Updated', description: `Task status has been set to ${newStatus}.` });
    } catch (error) {
      console.error('Failed to update task status', error);
      toast({
        variant: 'destructive',
        title: 'Task update failed',
        description: 'Something went wrong while updating the task.',
      });
    }
  };

  const progressCounts = useMemo(() => {
    const counts: Record<TaskSampleProgressStatus, number> = {
      pending: 0,
      in_progress: 0,
      successful: 0,
      failed: 0,
      needs_review: 0,
      extracted: 0,
    };
    taskSamples.forEach(sample => {
      const status = (sample.sample_id && sampleProgress[sample.sample_id]) || 'pending';
      counts[status as TaskSampleProgressStatus] = (counts[status as TaskSampleProgressStatus] ?? 0) + 1;
    });
    return counts;
  }, [sampleProgress, taskSamples]);

  const allSamplesHaveFinalStatus = useMemo(() => {
    if (taskSamples.length === 0) return true;
    return taskSamples.every(sample => {
      const status = sample.sample_id ? sampleProgress[sample.sample_id] : undefined;
      return isSampleSuccessful(status as TaskSampleProgressStatus) || status === 'failed';
    });
  }, [sampleProgress, taskSamples]);

  const allSamplesHaveStorageWhenNeeded = useMemo(() => {
    if (taskSamples.length === 0) return true;
    return taskSamples.every(sample => {
      if (!sample.sample_id) return true;
      const status = sampleProgress[sample.sample_id] as TaskSampleProgressStatus | undefined;
      if (requiresStorage(status as TaskSampleProgressStatus)) {
        return hasStorageForSample(sample.sample_id);
      }
      return true;
    });
  }, [hasStorageForSample, sampleProgress, taskSamples]);

  const allSamplesResolved = taskSamples.length === 0 ? true : allSamplesHaveFinalStatus && allSamplesHaveStorageWhenNeeded;

  const completionBlockers = useMemo(() => {
    const blockers: string[] = [];
    if (!allSamplesHaveFinalStatus) {
      blockers.push('Finalize a status for every sample');
    }
    if (!allSamplesHaveStorageWhenNeeded) {
      blockers.push('Assign storage to all successful extracts');
    }
    return blockers;
  }, [allSamplesHaveFinalStatus, allSamplesHaveStorageWhenNeeded]);

  const unresolvedCount = taskSamples.length - (progressCounts.successful + progressCounts.failed + progressCounts.extracted);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader title={<Skeleton className="h-8 w-64" />} />
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-1"><CardContent><Skeleton className="h-48" /></CardContent></Card>
          <Card className="md:col-span-2"><CardContent><Skeleton className="h-48" /></CardContent></Card>
        </div>
      </div>
    );
  }

  if (!task) {
    notFound();
  }

  const assignedUser = userMap.get(task.assignedTo);
  const createdByUser = userMap.get(task.createdById);
  const canUpdateStatus = (currentUser?.uid === task.assignedTo || currentUser?.uid === task.createdById) && task.status !== 'Completed' && task.status !== 'Cancelled';
  const canEditSampleProgress = task.status !== 'Completed' && (currentUser?.uid === task.assignedTo || currentUser?.uid === task.createdById);

  return (
    <div className="space-y-6">
      <PageHeader
        title={<div className="flex items-center gap-3"><ClipboardList className="h-6 w-6 text-muted-foreground" /><span>{task.title}</span></div>}
        description={`Details for task ${task.taskId}.`}
      >
        <Button variant="outline" asChild><Link href="/dashboard/tasks"><ArrowLeft className="mr-2 h-4 w-4" />Back to Tasks</Link></Button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Details & Actions */}
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Task Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <DetailItem icon={BadgeIcon} label="Status" value={<Badge variant={getTaskStatusVariant(task.status)} className="capitalize">{task.status}</Badge>} />
              <DetailItem icon={User} label="Assigned To" value={assignedUser?.name || 'Unknown User'} />
              <DetailItem icon={Calendar} label="Created On" value={format((task.createdAt as any).toDate(), 'PPp')} />
              <DetailItem icon={User} label="Created By" value={createdByUser?.name || 'Unknown User'} />
              <DetailItem icon={FlaskConical} label="Sample Count" value={task.sampleIds.length} />
            </CardContent>
          </Card>

          {task?.type === 'DNA Extraction' && (
            <Card>
              <CardHeader>
                <CardTitle>Extraction Progress</CardTitle>
                <CardDescription>Monitor sample throughput for this task.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span>Total Samples</span>
                  <span className="font-medium">{extractionStats.total}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Extracts Logged</span>
                  <span className="font-medium text-green-600 dark:text-green-400">{extractionStats.logged}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Pending</span>
                  <span className="font-medium text-amber-600 dark:text-amber-400">{extractionStats.pending}</span>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Completion</span>
                    <span>{extractionStats.completion}%</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary transition-all"
                      style={{ width: `${extractionStats.completion}%` }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { label: 'Successful', value: progressCounts.successful, accent: 'text-green-600 dark:text-green-400' },
                    { label: 'Failed', value: progressCounts.failed, accent: 'text-red-600 dark:text-red-400' },
                    { label: 'In Progress', value: progressCounts.in_progress, accent: 'text-blue-600 dark:text-blue-400' },
                    { label: 'Pending', value: progressCounts.pending, accent: 'text-amber-600 dark:text-amber-400' },
                    { label: 'Needs Review', value: progressCounts.needs_review, accent: 'text-purple-600 dark:text-purple-400' },
                  ].map(summary => (
                    <div key={summary.label} className="flex items-center justify-between rounded-md bg-muted px-2 py-1">
                      <span>{summary.label}</span>
                      <span className={`font-semibold ${summary.accent}`}>{summary.value}</span>
                    </div>
                  ))}
                </div>
                {!allSamplesResolved && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    {unresolvedCount} sample{unresolvedCount === 1 ? '' : 's'} still need a final status before completion.
                  </p>
                )}
                {missingStorageCount > 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    {missingStorageCount} successful sample{missingStorageCount === 1 ? '' : 's'} still missing storage assignments.
                  </p>
                )}
                {pendingSamplesForExtraction.length > 0 && (
                  <Button
                    className="w-full"
                    onClick={handleCaptureExtracts}
                    disabled={isLoggingExtracts}
                  >
                    {isLoggingExtracts ? 'Logging extracts…' : 'Log extracts for pending samples'}
                  </Button>
                )}
                {pendingSamplesForExtraction.length === 0 && (
                  <p className="text-xs text-muted-foreground">All samples for this task have DNA extracts recorded.</p>
                )}
              </CardContent>
            </Card>
          )}

          {canUpdateStatus && (
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
                <CardDescription>Update the status of this task.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row md:flex-col gap-2">
                {task.status === 'Pending' && <Button onClick={() => handleStatusUpdate('In Progress')}><PlayCircle className="mr-2 h-4 w-4" /> Start Task</Button>}
                {task.status === 'In Progress' && (
                  <div className="flex flex-col gap-1">
                    <Button onClick={() => handleStatusUpdate('Completed')} disabled={!allSamplesResolved}>
                      <CheckCircle className="mr-2 h-4 w-4" /> Complete Task
                    </Button>
                    {!allSamplesResolved && (
                      <div className="space-y-1 text-xs text-muted-foreground">
                        {completionBlockers.map(blocker => (
                          <p key={blocker}>{blocker}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <Button variant="destructive" onClick={() => handleStatusUpdate('Cancelled')}><XCircle className="mr-2 h-4 w-4" /> Cancel Task</Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Samples */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Associated Samples</CardTitle>
              <CardDescription>All samples included in this task assignment.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sample</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Metrics</TableHead>
                    <TableHead>Storage</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taskSamples.map(sample => {
                    const sampleId = sample.sample_id;
                    const sampleStatus = sampleId ? (sampleProgress[sampleId] as TaskSampleProgressStatus | undefined) : undefined;
                    const linkedExtract = sampleId ? extractBySampleId.get(sampleId) : undefined;
                    const storageMeta = linkedExtract?.storage_location_id
                      ? storageOptionsById.get(linkedExtract.storage_location_id)
                      : undefined;
                    const storageBreadcrumb = storageMeta?.breadcrumb ?? linkedExtract?.storage_location_id;
                    const isMissingStorage = sampleId ? !hasStorageForSample(sampleId) : false;
                    return (
                      <TableRow
                        key={sample.id}
                        className={cn(
                          'align-top text-sm transition-colors',
                          sampleStatus ? getRowAccentClasses(sampleStatus) : ''
                        )}
                      >
                        <TableCell className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="font-medium">{sample.sample_id}</div>
                            <Badge variant="outline" className="capitalize">{sample.sample_type}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">Project {sample.project_id}</p>
                          {linkedExtract ? (
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <Badge variant="outline" className="bg-white dark:bg-slate-900">Captured</Badge>
                              {linkedExtract.id && (
                                <Button variant="link" size="sm" className="h-auto p-0" asChild>
                                  <Link href={`/dashboard/dna-extracts/${linkedExtract.id}`}>View extract</Link>
                                </Button>
                              )}
                              <span className="text-muted-foreground">{linkedExtract.dna_id}</span>
                            </div>
                          ) : (
                            <Badge variant="secondary">Pending extract</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {sampleId ? (
                            <div className="flex flex-col gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant={getProgressVariant((sampleStatus ?? 'pending') as TaskSampleProgressStatus)} className="capitalize">
                                  {sampleStatus?.replace('_', ' ') ?? 'pending'}
                                </Badge>
                                {canEditSampleProgress && (
                                  <Select
                                    value={(sampleStatus ?? 'pending') as TaskSampleProgressStatus}
                                    onValueChange={value => handleSampleProgressChange(sampleId, value as TaskSampleProgressStatus)}
                                    disabled={updatingSampleId === sampleId}
                                  >
                                    <SelectTrigger className="h-8 w-[160px]">
                                      <SelectValue placeholder="Set status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {sampleProgressOptions.map(option => (
                                        <SelectItem key={option.value} value={option.value}>
                                          {option.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              </div>
                              {updatingSampleId === sampleId && (
                                <span className="text-xs text-muted-foreground">Saving…</span>
                              )}
                            </div>
                          ) : (
                            <Badge variant="secondary">Unknown sample</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {sampleId && linkedExtract ? (
                            <div className="space-y-2">
                              <div className="grid grid-cols-3 gap-2">
                                {(['yield', 'purity', 'volume'] as const).map(field => {
                                  const labelMap: Record<MetricField, string> = {
                                    yield: 'Yield',
                                    purity: 'Purity',
                                    volume: 'Volume',
                                  };
                                  const unitMap: Record<MetricField, string> = {
                                    yield: 'ng/µL',
                                    purity: '',
                                    volume: 'µL',
                                  };
                                  return (
                                    <label key={field} className="text-xs font-medium text-muted-foreground">
                                      <span>{labelMap[field]}</span>
                                      <Input
                                        type="number"
                                        step={field === 'purity' ? '0.01' : '0.1'}
                                        value={extractDrafts[sampleId]?.[field] ?? ''}
                                        onChange={e => handleExtractDraftChange(sampleId, field, e.target.value)}
                                        className="mt-1 h-8"
                                        placeholder={unitMap[field]}
                                      />
                                    </label>
                                  );
                                })}
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => handleInlineExtractSave(sampleId)}
                                  disabled={!hasDraftChanges(sampleId) || savingExtractId === sampleId}
                                >
                                  {savingExtractId === sampleId ? 'Saving…' : 'Save metrics'}
                                </Button>
                                {!hasDraftChanges(sampleId) && (
                                  <span className="text-xs text-muted-foreground">Up to date</span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">No extract yet</p>
                          )}
                        </TableCell>
                        <TableCell>
                          {linkedExtract ? (
                            <div className="space-y-2">
                              {hasStorageForSample(sampleId!) ? (
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                                    <Package className="h-3.5 w-3.5" />
                                    <span>Stored</span>
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    <p className="font-medium text-foreground truncate max-w-[180px]" title={storageBreadcrumb}>
                                      {storageBreadcrumb ?? 'Unknown location'}
                                    </p>
                                    {linkedExtract.storage_position_label && (
                                      <p>Slot {linkedExtract.storage_position_label}</p>
                                    )}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-xs justify-start -ml-2 text-muted-foreground hover:text-foreground"
                                    onClick={() => sampleId && handleOpenStorageSheet(sampleId)}
                                    disabled={allStorageFull || !sampleId}
                                  >
                                    Change location
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex flex-col gap-2 items-start">
                                  <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-500 text-xs font-medium">
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                    <span>Not assigned</span>
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs bg-white dark:bg-slate-950"
                                    onClick={() => sampleId && handleOpenStorageSheet(sampleId)}
                                    disabled={allStorageFull || !sampleId}
                                  >
                                    Assign Storage
                                  </Button>
                                  {allStorageFull && (
                                    <span className="text-[10px] text-destructive">Storage full</span>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">Log extract first</p>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/dashboard/samples/${sample.id}`}>View</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {/* This part will now only show if the list is truly empty */}
                  {!isLoading && taskSamples.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground pt-10">
                        No samples are associated with this task.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>

      <Sheet open={storageSheetOpen} onOpenChange={handleStorageSheetChange}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Assign storage</SheetTitle>
            <SheetDescription>
              {storageSheetSample ? `Sample ${storageSheetSample.sample_id}` : 'Select a sample to manage storage.'}
            </SheetDescription>
          </SheetHeader>
          {storageSheetExtract ? (
            <Form {...storageForm}>
              <form className="space-y-6" onSubmit={storageForm.handleSubmit(handleStorageSubmit)}>
                <div className="rounded-md border p-3 text-sm text-muted-foreground">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{storageSheetExtract.dna_id}</Badge>
                    {storageSheetSampleStatus && (
                      <Badge variant={getProgressVariant(storageSheetSampleStatus)} className="capitalize">
                        {storageSheetSampleStatus.replace('_', ' ')}
                      </Badge>
                    )}
                    {storageSheetSample && <span>Project {storageSheetSample.project_id}</span>}
                  </div>
                </div>

                <FormField
                  control={storageForm.control}
                  name="storage_location_id"
                  render={() => (
                    <FormItem className="space-y-2">
                      <FormLabel>Storage location</FormLabel>
                      <StorageLocationField
                        control={storageForm.control}
                        name="storage_location_id"
                        options={storageOptions}
                        isLoading={isLoadingStorageOptions}
                        disabled={isSavingStorage || allStorageFull}
                        description={allStorageFull ? 'All tracked storage units are currently full.' : 'Search freezers, racks, or boxes.'}
                        onSelect={(option) => {
                          storageForm.setValue('storage_location_id', option?.id ?? '', { shouldDirty: true });
                          storageForm.setValue('storage_position_label', '', { shouldDirty: true });
                        }}
                      />
                      {selectedStorage && (
                        <FormDescription>
                          {selectedStorage.breadcrumb}
                          {selectedStorageTemperatureC !== undefined && (
                            <span>{` • ${selectedStorageTemperatureC ?? '—'}°C`}</span>
                          )}
                          {typeof selectedStorage.availableSlots === 'number' && (
                            <span>{` • ${selectedStorage.availableSlots} slots free`}</span>
                          )}
                        </FormDescription>
                      )}
                      {!selectedStorage && (
                        <FormDescription>Choose a container to continue.</FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedStorage && storageHasGrid && (
                  <FormField
                    control={storageForm.control}
                    name="storage_position_label"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel>Grid slot</FormLabel>
                        <StorageGridSlotPicker
                          storage={selectedStorage}
                          value={field.value ?? ''}
                          onChange={(coord) => field.onChange(coord ?? '')}
                          onAutoAssign={handleStorageAutoAssign}
                        />
                        {storageGridWarning && (
                          <FormDescription className="text-amber-600 dark:text-amber-400">{storageGridWarning}</FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <SheetFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                  <SheetClose asChild>
                    <Button type="button" variant="outline" disabled={isSavingStorage}>
                      Cancel
                    </Button>
                  </SheetClose>
                  <Button type="submit" disabled={isSavingStorage || allStorageFull}>
                    {isSavingStorage ? 'Saving…' : 'Save storage'}
                  </Button>
                </SheetFooter>
              </form>
            </Form>
          ) : (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Select a sample with a DNA extract to update storage.
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}