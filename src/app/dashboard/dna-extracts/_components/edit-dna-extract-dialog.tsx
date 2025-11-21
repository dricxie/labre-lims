'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format, parseISO } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { addDoc, collection, doc, updateDoc, query, where } from 'firebase/firestore';

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
import { useFirestore, useUser, useCollection } from '@/firebase';
import { DnaExtract } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useStorageOptions } from '@/hooks/use-storage-options';
import { useStorageOccupancy } from '@/hooks/use-storage-occupancy';
import { StorageLocationField } from '@/app/dashboard/samples/_components/storage-location-field';
import { useProjects } from '@/hooks/use-projects';
import { StorageGridSlotPicker } from '@/app/dashboard/samples/_components/storage-grid-slot-picker';

const optionalPositiveNumber = z.preprocess((value) => {
  if (value === '' || value === null || typeof value === 'undefined') {
    return undefined;
  }
  if (typeof value === 'number') {
    return value;
  }
  const coerced = Number(value);
  return Number.isNaN(coerced) ? value : coerced;
}, z.number().min(0, 'Value must be a positive number').optional());

const formSchema = z.object({
  dna_id: z.string().min(1, 'DNA ID is required'),
  sample_id: z.string().min(1, 'Parent Sample ID is required'),
  project_id: z.string().min(1, 'Project ID is required'),
  date_extracted: z.date(),
  operator: z.string().min(1, 'Operator is required'),
  yield_ng_per_ul: optionalPositiveNumber,
  a260_a280: optionalPositiveNumber,
  storage_location_id: z.string().min(1, 'Storage location is required'),
  storage_position_label: z.string().optional(),
  status: z.enum(['stored', 'used', 'disposed']),
});

export type EditDnaExtractFormValues = z.infer<typeof formSchema>;

type EditDnaExtractDialogProps = {
  extract: (DnaExtract & { id: string }) | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EditDnaExtractDialog({ extract, isOpen, onOpenChange }: EditDnaExtractDialogProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const activityLogCollection = collection(firestore, 'activity_log');
  const { options: storageOptions, optionsById: storageOptionsById, isLoading: isLoadingStorageOptions } = useStorageOptions();
  const { projectOptions, isLoading: isLoadingProjects } = useProjects();

  const form = useForm<EditDnaExtractFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dna_id: '',
      sample_id: '',
      project_id: '',
      operator: '',
      date_extracted: new Date(),
      yield_ng_per_ul: undefined,
      a260_a280: undefined,
      storage_location_id: '',
      storage_position_label: '',
      status: 'stored',
    },
  });

  const watchStorageId = form.watch('storage_location_id');
  const watchPosition = form.watch('storage_position_label');
  const selectedStorage = watchStorageId ? storageOptionsById.get(watchStorageId) : undefined;
  const storageHasGrid = Boolean(selectedStorage?.gridSpec);
  const noSlotsAvailable = storageHasGrid && (selectedStorage?.availableSlots ?? 0) <= 0;

  // FIX: Use unified hook to fetch live occupancy (samples + DNA extracts)
  const { occupiedSlots: liveOccupiedSlots } = useStorageOccupancy(watchStorageId);

  const gridWarning = useMemo(() => {
    if (!storageHasGrid || !selectedStorage) return undefined;
    if (noSlotsAvailable) return 'All slots in this container appear occupied or blocked.';
    if (!watchPosition) return 'Select an empty slot before saving.';
    return undefined;
  }, [noSlotsAvailable, selectedStorage, storageHasGrid, watchPosition]);

  const handleAutoAssign = useCallback(() => {
    if (!selectedStorage?.gridSpec) return;
    const rows = selectedStorage.gridSpec.rows ?? 0;
    const cols = selectedStorage.gridSpec.cols ?? 0;
    const disabled = new Set(selectedStorage.gridSpec.disabled_slots ?? []);
    const occupied = new Set(Object.keys(selectedStorage.occupiedSlots ?? {}));
    liveOccupiedSlots.forEach(slot => occupied.add(slot));
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const coord = selectedStorage.gridSpec?.label_schema === 'numeric'
          ? `${r + 1}-${c + 1}`
          : `${String.fromCharCode(65 + r)}${c + 1}`;
        if (disabled.has(coord) || occupied.has(coord)) continue;
        form.setValue('storage_position_label', coord);
        return;
      }
    }
  }, [form, selectedStorage]);

  useEffect(() => {
    if (!extract || !isOpen) {
      return;
    }

    form.reset({
      dna_id: extract.dna_id,
      sample_id: extract.sample_id,
      project_id: extract.project_id,
      operator: extract.operator,
      date_extracted: extract.date_extracted ? parseISO(extract.date_extracted) : new Date(),
      yield_ng_per_ul: extract.yield_ng_per_ul ?? undefined,
      a260_a280: extract.a260_a280 ?? undefined,
      storage_location_id: extract.storage_location_id,
      storage_position_label: extract.storage_position_label ?? '',
      status: extract.status,
    });
  }, [extract, form, isOpen]);

  const { isSubmitting } = form.formState;

  const handleSubmit = async (values: EditDnaExtractFormValues) => {
    if (!extract?.id) {
      toast({ variant: 'destructive', title: 'No extract selected' });
      return;
    }

    if (!user || !user.email) {
      toast({ variant: 'destructive', title: 'Authentication required' });
      return;
    }

    const payload: Partial<DnaExtract> = {
      dna_id: values.dna_id,
      sample_id: values.sample_id,
      project_id: values.project_id,
      operator: values.operator,
      date_extracted: values.date_extracted.toISOString(),
      yield_ng_per_ul: values.yield_ng_per_ul ?? null,
      a260_a280: values.a260_a280 ?? null,
      storage_location_id: values.storage_location_id,
      storage_position_label: values.storage_position_label || null,
      status: values.status,
      barcode: values.dna_id,
    } as Partial<DnaExtract> & { barcode: string };

    try {
      await updateDoc(doc(firestore, 'dna_extracts', extract.id), payload);

      await addDoc(activityLogCollection, {
        action: 'update',
        details: `Updated DNA extract ${values.dna_id}`,
        target_entity: 'dna_extracts',
        target_id: extract.id,
        timestamp: new Date().toISOString(),
        user_email: user.email,
        user_id: user.uid,
      });

      toast({ title: 'DNA extract updated', description: `${values.dna_id} has been saved.` });
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update DNA extract', error);
      toast({ variant: 'destructive', title: 'Update failed', description: 'Could not save DNA extract.' });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit DNA Extract</DialogTitle>
          <DialogDescription>
            Refine the extraction metadata. Fields you adjust here will overwrite the current record.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dna_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>DNA Extract ID</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., DNA-2025-0001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sample_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent Sample ID</FormLabel>
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
                          <SelectValue placeholder={isLoadingProjects ? "Loading..." : "Select project"} />
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
                name="operator"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Operator</FormLabel>
                    <FormControl>
                      <Input placeholder="Technician name" {...field} />
                    </FormControl>
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
                        <SelectItem value="stored">Stored</SelectItem>
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
                name="yield_ng_per_ul"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Yield (ng/µL)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" placeholder="e.g., 50.5" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="a260_a280"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>A260/A280 Ratio</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="e.g., 1.85" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="storage_location_id"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Storage Location</FormLabel>
                    <StorageLocationField
                      control={form.control}
                      name="storage_location_id"
                      options={storageOptions}
                      isLoading={isLoadingStorageOptions}
                      description="Update where this extract lives."
                      onSelect={(option) => {
                        field.onChange(option?.id ?? '');
                        form.setValue('storage_position_label', '');
                      }}
                    />
                    {storageHasGrid && selectedStorage && (
                      <div className="space-y-2">
                        <StorageGridSlotPicker
                          storage={selectedStorage}
                          value={watchPosition ?? ''}
                          onChange={(coord) => form.setValue('storage_position_label', coord ?? '')}
                          onAutoAssign={handleAutoAssign}
                          additionalOccupiedSlots={liveOccupiedSlots}
                        />
                        {gridWarning && (
                          <p className="text-sm text-amber-600 dark:text-amber-400">{gridWarning}</p>
                        )}
                      </div>
                    )}
                    {!storageHasGrid && selectedStorage && (
                      <FormDescription>
                        {selectedStorage.breadcrumb} ({selectedStorage.type})
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="storage_position_label"
                render={({ field }) => <input type="hidden" {...field} />}
              />
              <FormField
                control={form.control}
                name="date_extracted"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date Extracted</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {extract?.source_task_id && (
              <div className="rounded-md border bg-muted/30 px-4 py-3 text-sm">
                Linked task: <span className="font-medium">{extract.source_task_id}</span>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
