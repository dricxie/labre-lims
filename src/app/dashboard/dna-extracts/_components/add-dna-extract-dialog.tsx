'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { ReactNode, useCallback, useMemo } from 'react';

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
import { DnaExtract } from '@/lib/types';
import { useUser } from '@/firebase'; // FIX: Import the useUser hook
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

type FormValues = z.infer<typeof formSchema>;

type AddDnaExtractDialogProps = {
  children: ReactNode;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Omit<DnaExtract, 'id' | 'createdAt' | 'createdBy' | 'barcode' | 'labId'>) => void;
};

export function AddDnaExtractDialog({
  children,
  isOpen,
  onOpenChange,
  onSubmit,
}: AddDnaExtractDialogProps) {
  const { user } = useUser(); // FIX: Get the authenticated user
  const { options: storageOptions, optionsById: storageOptionsById, isLoading: isLoadingStorageOptions } = useStorageOptions();
  const { projectOptions, isLoading: isLoadingProjects } = useProjects();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dna_id: `DNA-${new Date().getFullYear()}-`,
      sample_id: '', // Add this
      project_id: '',
      date_extracted: new Date(),
      operator: '', // Add this
      yield_ng_per_ul: undefined,
      a260_a280: undefined,
      storage_location_id: '', // Add this
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

  const { isSubmitting } = form.formState;

  const handleSubmit = (values: FormValues) => {
    // FIX: Add a guard to ensure the user is available
    if (!user) {
      console.error("User not available. Cannot add document.");
      // Optionally, you can show a toast notification here
      return;
    }

    // FIX: Add the required 'createdById' field to the payload
    const extractData: Omit<DnaExtract, 'id' | 'createdAt' | 'createdBy' | 'barcode' | 'labId'> = {
      ...values,
      yield_ng_per_ul: values.yield_ng_per_ul ?? null,
      a260_a280: values.a260_a280 ?? null,
      date_extracted: values.date_extracted.toISOString(),
      storage_position_label: values.storage_position_label || null,
      createdById: user.uid,
    };
    onSubmit(extractData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {/* The rest of the JSX remains the same */}
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New DNA Extract</DialogTitle>
          <DialogDescription>
            Enter the details for the new DNA extract. Click save when you're done.
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
                    <FormControl><Input placeholder="e.g., DNA-2025-0001" {...field} /></FormControl>
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
                    <FormControl><Input placeholder="e.g., SMP-2025-0001" {...field} /></FormControl>
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
                    <FormControl><Input placeholder="Enter operator name" {...field} /></FormControl>
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
                      <FormControl><SelectTrigger><SelectValue placeholder="Select a status" /></SelectTrigger></FormControl>
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
                    <FormControl><Input type="number" step="0.1" placeholder="e.g., 50.5" {...field} /></FormControl>
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
                    <FormControl><Input type="number" step="0.01" placeholder="e.g., 1.85" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
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
                          <Button variant={'outline'} className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}>
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
                      description="Search freezers, racks, or cryoboxes."
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
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="storage_position_label"
                render={({ field }) => <input type="hidden" {...field} />}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Extract
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}