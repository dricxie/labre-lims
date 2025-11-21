// src/app/dashboard/samples/_components/add-sample-dialog.tsx

'use client';

import { ReactNode, useCallback, useEffect, useId, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { FieldErrors, useForm } from 'react-hook-form';
import { z } from 'zod';
import { format } from 'date-fns';
import { AlertTriangle, CalendarIcon, Loader2 } from 'lucide-react';
import { collection, query, where } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Sample } from '@/lib/types';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { useStorageOptions, StorageOption } from '@/hooks/use-storage-options';
import { useStorageOccupancy } from '@/hooks/use-storage-occupancy';
import { useProjects } from '@/hooks/use-projects';
import { StorageLocationField } from './storage-location-field';
import { StorageGridSlotPicker } from './storage-grid-slot-picker';
import { getGridCoordinateLabel } from '@/lib/storage-utils';
import { useToast } from '@/hooks/use-toast';

const optionalTempField = z
  .preprocess((value) => {
    if (value === '' || value === null || value === undefined) return undefined;
    const numeric = Number(value);
    return Number.isNaN(numeric) ? undefined : numeric;
  }, z.number().min(-200, 'Too cold to track').max(200, 'Too hot to track'))
  .optional();

const formSchema = z.object({
  sample_id: z.string().min(1, 'Sample ID is required'),
  project_id: z.string().min(1, 'Project ID is required'),
  sample_type: z.enum(['blood', 'tissue', 'hair', 'dna', 'other']),
  status: z.enum(['received', 'in_storage', 'processing', 'extracted', 'used', 'disposed']),
  source: z.string().min(1, 'Source is required'),
  storage_location_id: z.string().min(1, 'Storage location is required'),
  position_label: z.string().optional(),
  collected_by: z.string().min(1, 'Collector is required'),
  date_collected: z.date(),
  date_received: z.date(),
  initial_volume: z.coerce.number().positive(),
  current_volume: z.coerce.number().positive(),
  temperature_requirement: optionalTempField,
});

type FormValues = z.infer<typeof formSchema>;

type AddSampleDialogProps = {
  children?: ReactNode;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Omit<Sample, 'id' | 'createdAt' | 'createdBy' | 'barcode'>) => void;
};

export function AddSampleDialog({
  children,
  isOpen,
  onOpenChange,
  onSubmit,
}: AddSampleDialogProps) {
  const { user } = useUser(); // FIX: Get the authenticated user
  const firestore = useFirestore();
  const reactId = useId();
  const formId = useMemo(() => `add-sample-form-${reactId.replace(/[:]/g, '')}`, [reactId]);
  const {
    options: storageOptions,
    optionsById: storageOptionsById,
    isLoading: isLoadingStorageOptions,
  } = useStorageOptions();
  const { projectOptions, isLoading: isLoadingProjects } = useProjects();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sample_id: `SMP-${new Date().getFullYear()}-`,
      project_id: '',
      sample_type: 'blood',
      status: 'received',
      source: '',
      storage_location_id: '',
      position_label: '',
      collected_by: '',
      date_collected: new Date(),
      date_received: new Date(),
      initial_volume: 1,
      current_volume: 1,
      temperature_requirement: undefined,
    },
  });

  const { isSubmitting } = form.formState;
  useEffect(() => {
    if (!user) return;
    const fallback = user.displayName?.trim() || user.email || '';
    if (fallback && !form.getValues('collected_by')) {
      form.setValue('collected_by', fallback);
    }
  }, [user, form]);
  const { toast } = useToast();
  const watchStorageId = form.watch('storage_location_id');
  const watchPosition = form.watch('position_label');
  const watchSampleId = form.watch('sample_id');
  const temperatureRequirement = form.watch('temperature_requirement');
  const selectedStorage: StorageOption | undefined = watchStorageId ? storageOptionsById.get(watchStorageId) : undefined;
  const storageHasGrid = Boolean(selectedStorage?.gridSpec);
  const noSlotsAvailable = storageHasGrid && (selectedStorage?.availableSlots ?? 0) <= 0;

  const normalizedSampleId = watchSampleId?.trim() ?? '';
  const duplicateQuery = useMemo(() => {
    if (!firestore || !normalizedSampleId) return null;
    return query(collection(firestore, 'samples'), where('sample_id', '==', normalizedSampleId));
  }, [firestore, normalizedSampleId]);

  const {
    data: duplicateSamples,
    isLoading: isCheckingDuplicate,
  } = useCollection<Sample>(duplicateQuery);
  const duplicateSample = duplicateSamples?.[0];

  // FIX: Use unified hook to fetch live occupancy (samples + DNA extracts)
  const { occupiedSlots: liveOccupiedSlots } = useStorageOccupancy(watchStorageId);

  const gridWarning = useMemo(() => {
    if (!selectedStorage?.gridSpec) return undefined;
    if (noSlotsAvailable) return 'All slots in this container are occupied or blocked.';
    if (!watchPosition) return 'Select an empty slot to place the sample.';
    return undefined;
  }, [selectedStorage, noSlotsAvailable, watchPosition]);

  const temperatureWarning = useMemo(() => {
    if (temperatureRequirement === undefined || temperatureRequirement === null) return undefined;
    if (!selectedStorage) return undefined;
    const min = selectedStorage.temperatureMin ?? selectedStorage.temperature ?? null;
    const max = selectedStorage.temperatureMax ?? selectedStorage.temperature ?? null;
    if (min !== null && temperatureRequirement < min) {
      return `Sample requires ${temperatureRequirement}°C which is colder than container minimum of ${min}°C.`;
    }
    if (max !== null && temperatureRequirement > max) {
      return `Sample requires ${temperatureRequirement}°C which is warmer than container maximum of ${max}°C.`;
    }
    return undefined;
  }, [temperatureRequirement, selectedStorage]);

  const duplicateWarning = useMemo(() => {
    if (!duplicateSample || !normalizedSampleId) return undefined;
    const existingPath = duplicateSample.storage_path_names?.join(' › ') ?? 'inventory';
    return `Sample ID ${normalizedSampleId} already exists (${existingPath}). Consider using a new ID or link as an aliquot.`;
  }, [duplicateSample, normalizedSampleId]);

  const handleAutoAssign = useCallback(() => {
    if (!selectedStorage?.gridSpec) return;
    const rows = selectedStorage.gridSpec.rows ?? 0;
    const cols = selectedStorage.gridSpec.cols ?? 0;
    const disabled = new Set(selectedStorage.gridSpec.disabled_slots ?? []);
    const occupied = new Set([
      ...Object.keys(selectedStorage.occupiedSlots ?? {}),
      ...Array.from(liveOccupiedSlots)
    ]);
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const coord = getGridCoordinateLabel(r, c, selectedStorage.gridSpec?.label_schema);
        if (disabled.has(coord) || occupied.has(coord)) continue;
        form.setValue('position_label', coord);
        return;
      }
    }
  }, [selectedStorage, form]);

  const handleSubmit = async (values: FormValues) => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Authentication required',
        description: 'Please sign in again before adding a sample.',
      });
      return;
    }

    const selectedStorage = values.storage_location_id
      ? storageOptionsById.get(values.storage_location_id)
      : undefined;

    const { temperature_requirement, ...restValues } = values;
    const sampleData: Omit<Sample, 'id' | 'createdAt' | 'createdBy' | 'barcode'> = {
      ...restValues,
      date_collected: values.date_collected.toISOString(),
      date_received: values.date_received.toISOString(),
      createdById: user.uid,
      storage_path_ids: selectedStorage?.pathIds ?? [],
      storage_path_names: selectedStorage?.pathNames ?? [],
      position_label: storageHasGrid ? values.position_label : undefined,
      ...(temperature_requirement != null ? { temperature_requirement } : {}),
    };

    try {
      await onSubmit(sampleData);
      form.reset();
    } catch (error) {
      console.error('Failed to submit sample:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to save sample',
        description: error instanceof Error ? error.message : 'Unknown error occurred. Please try again.',
      });
    }
  };

  const handleInvalidSubmit = useCallback(
    (errors: FieldErrors<FormValues>) => {
      const firstError = Object.values(errors)[0];
      const message = typeof firstError?.message === 'string' ? firstError.message : 'Please check required fields and try again.';
      toast({
        variant: 'destructive',
        title: 'Cannot save sample yet',
        description: message,
      });
    },
    [toast]
  );

  const previewRows = [
    {
      label: 'Storage path',
      value: selectedStorage ? selectedStorage.fullPath : 'Select a container',
    },
    {
      label: 'Coordinate',
      value: storageHasGrid ? watchPosition || '—' : 'Not applicable',
    },
    {
      label: 'Temperature window',
      value:
        selectedStorage && (selectedStorage.temperatureMin !== null || selectedStorage.temperatureMax !== null)
          ? `${selectedStorage.temperatureMin ?? '—'}°C – ${selectedStorage.temperatureMax ?? '—'}°C`
          : selectedStorage?.temperature !== undefined
            ? `${selectedStorage.temperature}°C`
            : 'Not specified',
    },
    {
      label: 'Sample requirement',
      value: temperatureRequirement !== undefined && temperatureRequirement !== null
        ? `${temperatureRequirement}°C`
        : 'Not specified',
    },
  ];

  const warnings = [gridWarning, temperatureWarning, duplicateWarning].filter(Boolean);
  const capacitySnapshot = selectedStorage?.capacitySnapshot;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add New Sample</DialogTitle>
          <DialogDescription>
            Enter the details for the new sample. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto pr-1">
          <Form {...form}>
            <form id={formId} onSubmit={form.handleSubmit(handleSubmit, handleInvalidSubmit)} className="space-y-6">
              <section className="space-y-4 rounded-lg border bg-card/30 p-4">
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">General details</p>
                  <p className="text-xs text-muted-foreground">Basic identifiers and contextual metadata.</p>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="sample_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sample ID</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., SMP-2025-0001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="project_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project ID</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={isLoadingProjects ? "Loading projects..." : "Select a project"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {projectOptions.map((option) => (
                              <SelectItem key={option.id} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="sample_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sample Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a sample type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="blood">Blood</SelectItem>
                            <SelectItem value="tissue">Tissue</SelectItem>
                            <SelectItem value="hair">Hair</SelectItem>
                            <SelectItem value="dna">DNA</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="received">Received</SelectItem>
                            <SelectItem value="in_storage">In Storage</SelectItem>
                            <SelectItem value="processing">Processing</SelectItem>
                            <SelectItem value="extracted">Extracted</SelectItem>
                            <SelectItem value="used">Used</SelectItem>
                            <SelectItem value="disposed">Disposed</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="source"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Source</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Sapi Bali #32" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="collected_by"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Collected By</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., field_team" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="temperature_requirement"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Temperature requirement (°C) (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="e.g., -80"
                            value={field.value ?? ''}
                            onChange={(event) => field.onChange(event.target.value === '' ? undefined : Number(event.target.value))}
                          />
                        </FormControl>
                        <FormDescription>Used for compatibility warnings.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </section>

              <section className="space-y-4 rounded-lg border bg-card/30 p-4">
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Volumes & timeline</p>
                  <p className="text-xs text-muted-foreground">Track how much material you have and when it entered storage.</p>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="initial_volume"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Initial volume (mL)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="e.g., 10"
                            value={field.value ?? ''}
                            onChange={(event) => field.onChange(event.target.value === '' ? undefined : Number(event.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="current_volume"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current volume (mL)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="e.g., 8"
                            value={field.value ?? ''}
                            onChange={(event) => field.onChange(event.target.value === '' ? undefined : Number(event.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="date_collected"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Date collected</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn('w-full justify-between font-normal', !field.value && 'text-muted-foreground')}
                              >
                                {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                                <CalendarIcon className="ml-2 h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="date_received"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Date received</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn('w-full justify-between font-normal', !field.value && 'text-muted-foreground')}
                              >
                                {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                                <CalendarIcon className="ml-2 h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </section>

              <section className="space-y-4 rounded-lg border bg-card/30 p-4">
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Storage placement</p>
                  <p className="text-xs text-muted-foreground">Pick a container, reserve a slot, and review capacity. </p>
                </div>
                <div className="space-y-3">
                  <StorageLocationField
                    control={form.control}
                    name="storage_location_id"
                    options={storageOptions}
                    isLoading={isLoadingStorageOptions}
                    description="Search by storage ID, name, or breadcrumb."
                    onSelect={(option) => {
                      if (!option?.gridSpec) {
                        form.setValue('position_label', '');
                      }
                    }}
                  />
                  {storageHasGrid && selectedStorage && (
                    <div className="space-y-2">
                      <StorageGridSlotPicker
                        storage={selectedStorage}
                        value={watchPosition ?? ''}
                        onChange={(coord) => form.setValue('position_label', coord ?? '')}
                        onAutoAssign={handleAutoAssign}
                        additionalOccupiedSlots={liveOccupiedSlots}
                      />
                    </div>
                  )}
                </div>
                <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">Storage preview</p>
                      <p className="text-sm text-muted-foreground">Confirm coordinates and compatibility before saving.</p>
                    </div>
                    {capacitySnapshot && (
                      <div className="text-right text-xs text-muted-foreground">
                        <p>Theoretical: {capacitySnapshot.theoretical ?? '—'}</p>
                        <p>Effective: {capacitySnapshot.effective ?? '—'}</p>
                        <p>Available: {capacitySnapshot.available ?? '—'}</p>
                      </div>
                    )}
                  </div>
                  <dl className="grid gap-3 sm:grid-cols-2">
                    {previewRows.map((row) => (
                      <div key={row.label} className="space-y-1">
                        <dt className="text-xs font-semibold uppercase text-muted-foreground">{row.label}</dt>
                        <dd className="text-sm">{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                  {warnings.length > 0 && (
                    <div className="space-y-2">
                      {warnings.map((warning) => (
                        <div
                          key={warning}
                          className="flex items-center gap-2 rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-800"
                        >
                          <AlertTriangle className="h-4 w-4" />
                          <span>{warning}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {isCheckingDuplicate && normalizedSampleId && (
                    <p className="text-xs text-muted-foreground">Checking for duplicate Sample ID…</p>
                  )}
                </div>
              </section>
            </form>
          </Form>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Sample
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}