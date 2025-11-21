// src/app/dashboard/storage/components/add-storage-dialog.tsx

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { collection, query } from 'firebase/firestore';

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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { StorageType, StorageUnit } from '@/lib/types';
import { useStorageTypes } from '@/hooks/use-storage-types';
import { cn } from '@/lib/utils';
import { ChevronsUpDown, Loader2, Search } from 'lucide-react';

const LABEL_SCHEMAS = ['alpha-numeric', 'numeric', 'custom'] as const;
type LabelSchema = (typeof LABEL_SCHEMAS)[number];

type ParentOption = {
  id: string;
  label: string;
};

type AddStorageDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentOptions: ParentOption[];
  defaultParentId?: string | null;
  onSuccess?: (storageId: string) => void;
};

const numberField = z
  .union([z.string(), z.number()])
  .transform((val) => {
    if (val === '' || val === undefined || val === null) return undefined;
    const parsed = Number(val);
    return Number.isNaN(parsed) ? undefined : parsed;
  })
  .optional();

const formSchema = z.object({
  storage_id: z.string().min(1, 'Storage ID is required'),
  name: z.string().min(1, 'Name is required'),
  type: z.string().min(1, 'Type is required'),
  type_id: z.string().optional(),
  parent_storage_id: z.string().optional(),
  temperature: numberField,
  temperature_min: numberField,
  temperature_max: numberField,
  capacity_slots: numberField,
  grid_rows: numberField,
  grid_cols: numberField,
  label_schema: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function AddStorageDialog({
  open,
  onOpenChange,
  parentOptions,
  defaultParentId,
  onSuccess,
}: AddStorageDialogProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const buildDefaults = (parentId?: string | null) => ({
    storage_id: `STO-${new Date().getFullYear()}-`,
    name: '',
    type: 'cabinet',
    type_id: undefined,
    parent_storage_id: parentId ?? undefined,
    label_schema: 'alpha-numeric',
    temperature: undefined,
    temperature_min: undefined,
    temperature_max: undefined,
    capacity_slots: undefined,
    grid_rows: undefined,
    grid_cols: undefined,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: buildDefaults(defaultParentId),
  });

  const { isSubmitting } = form.formState;
  const {
    types: storageTypes,
    typesById,
    isLoading: isLoadingStorageTypes,
    isPermissionDenied: isStorageTypesPermissionDenied,
  } = useStorageTypes();
  const [typePopoverOpen, setTypePopoverOpen] = useState(false);
  const [typeSearchQuery, setTypeSearchQuery] = useState('');
  const [parentPopoverOpen, setParentPopoverOpen] = useState(false);
  const [parentSearchQuery, setParentSearchQuery] = useState('');

  const parentSelectOptions = useMemo(() => {
    return [...parentOptions].sort((a, b) => a.label.localeCompare(b.label));
  }, [parentOptions]);

  const fallbackTypesQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'storage_units'));
  }, [firestore, user]);

  const { data: fallbackUnits } = useCollection<StorageUnit>(fallbackTypesQuery);

  const fallbackTypeNames = useMemo(() => {
    if (!fallbackUnits) return [];
    const names = new Set<string>();
    for (const unit of fallbackUnits) {
      if (unit.type) {
        names.add(unit.type);
      }
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [fallbackUnits]);

  const storageTypeOptions = useMemo<TypeTemplateOption[]>(() => {
    const templateOptions = storageTypes.map((type) => ({ id: type.id, label: type.name }));
    const fallbackOptions = fallbackTypeNames
      .filter((name) => !templateOptions.some((option) => option.label.toLowerCase() === name.toLowerCase()))
      .map((name) => ({ id: `existing:${name}`, label: name, isFallback: true }));
    return [...templateOptions, ...fallbackOptions];
  }, [storageTypes, fallbackTypeNames]);

  const filteredStorageTypes = useMemo(() => {
    if (!typeSearchQuery.trim()) return storageTypeOptions;
    const normalized = typeSearchQuery.toLowerCase();
    return storageTypeOptions.filter((option) => option.label.toLowerCase().includes(normalized));
  }, [storageTypeOptions, typeSearchQuery]);

  const filteredParentOptions = useMemo(() => {
    if (!parentSearchQuery.trim()) return parentSelectOptions;
    const normalized = parentSearchQuery.toLowerCase();
    return parentSelectOptions.filter((option) => option.label.toLowerCase().includes(normalized));
  }, [parentSearchQuery, parentSelectOptions]);

  type TypeTemplateOption = {
    id: string;
    label: string;
    isFallback?: boolean;
  };

  const selectedTypeId = form.watch('type_id') ?? '';
  const watchedTypeLabel = form.watch('type');
  const selectedStorageType: StorageType | undefined = selectedTypeId ? typesById.get(selectedTypeId) : undefined;
  const selectedParentId = form.watch('parent_storage_id') ?? undefined;
  const selectedParentLabel = selectedParentId
    ? parentSelectOptions.find((option) => option.id === selectedParentId)?.label ?? 'Parent container'
    : 'Root (no parent)';
  const gridRows = form.watch('grid_rows');
  const gridCols = form.watch('grid_cols');
  const theoreticalSlots = typeof gridRows === 'number' && typeof gridCols === 'number' ? gridRows * gridCols : undefined;
  const disabledCellsCount = selectedStorageType?.grid_defaults?.disabled_slots?.length ?? 0;
  const effectiveSlots = theoreticalSlots !== undefined ? Math.max(theoreticalSlots - disabledCellsCount, 0) : undefined;
  const canEditGrid = !selectedStorageType || Boolean(selectedStorageType.grid_defaults);

  useEffect(() => {
    if (open) {
      form.reset(buildDefaults(defaultParentId));
    }
  }, [defaultParentId, open, form]);

  const applyTypeDefaults = useCallback((storageType?: StorageType) => {
    if (!storageType) return;
    const gridDefaults = storageType.grid_defaults;
    if (gridDefaults) {
      form.setValue('grid_rows', gridDefaults.rows ?? undefined);
      form.setValue('grid_cols', gridDefaults.cols ?? undefined);
      if (gridDefaults.label_schema) {
        form.setValue('label_schema', gridDefaults.label_schema);
      }
    } else {
      form.setValue('grid_rows', undefined);
      form.setValue('grid_cols', undefined);
    }
    form.setValue('temperature', storageType.default_temperature ?? undefined);
    form.setValue('temperature_min', storageType.temperature_min ?? undefined);
    form.setValue('temperature_max', storageType.temperature_max ?? undefined);
    form.setValue('capacity_slots', storageType.default_capacity ?? undefined);
  }, [form]);

  useEffect(() => {
    if (!canEditGrid) {
      form.setValue('grid_rows', undefined);
      form.setValue('grid_cols', undefined);
    }
  }, [canEditGrid, form]);

  useEffect(() => {
    if (!open) {
      setTypePopoverOpen(false);
      setParentPopoverOpen(false);
      setTypeSearchQuery('');
      setParentSearchQuery('');
    }
  }, [open]);

  const handleSubmit = async (values: FormValues) => {
    if (!firestore || !user) {
      toast({ title: 'Authentication required', description: 'Please sign in again to add storage.', variant: 'destructive' });
      return;
    }

    const toNumber = (val?: number) => (typeof val === 'number' && !Number.isNaN(val) ? val : undefined);
    const toNullableNumber = (val?: number) => (typeof val === 'number' && !Number.isNaN(val) ? val : null);
    const temperature = toNumber(values.temperature);
    const capacity = toNumber(values.capacity_slots);
    const rows = toNumber(values.grid_rows);
    const cols = toNumber(values.grid_cols);
    const resolvedSchema: LabelSchema = (values.label_schema as LabelSchema) ?? 'alpha-numeric';

    const payload: Omit<StorageUnit, 'id'> = {
      storage_id: values.storage_id,
      name: values.name,
      type: values.type,
      type_id: values.type_id ?? selectedStorageType?.id ?? null,
      type_label: selectedStorageType?.name ?? null,
      parent_storage_id: values.parent_storage_id ? values.parent_storage_id : null,
      temperature_min: toNullableNumber(values.temperature_min),
      temperature_max: toNullableNumber(values.temperature_max),
      path_ids: [],
      path_names: [],
      child_count: 0,
      sample_count: 0,
      occupied_slots: {},
      metadata: {},
      createdById: user.uid,
    };

    if (typeof temperature === 'number') {
      payload.temperature = temperature;
    }
    if (typeof capacity === 'number' && !selectedStorageType?.grid_defaults) {
      payload.capacity_slots = capacity;
    }
    if (typeof rows === 'number' && typeof cols === 'number' && canEditGrid && rows > 0 && cols > 0) {
      payload.grid_spec = {
        rows,
        cols,
        label_schema: resolvedSchema,
      };
      if (selectedStorageType?.grid_defaults?.disabled_slots?.length) {
        payload.grid_spec.disabled_slots = selectedStorageType.grid_defaults.disabled_slots;
      }
      payload.theoretical_slots = rows * cols;
      payload.effective_slots = effectiveSlots ?? payload.theoretical_slots;
      payload.capacity_mode = 'grid';
      payload.capacity_slots = payload.effective_slots;
    } else if (selectedStorageType?.default_capacity) {
      payload.capacity_mode = 'custom';
      payload.capacity_slots = selectedStorageType.default_capacity;
    } else {
      payload.capacity_mode = 'unbounded';
    }

    try {
      const docRef = await addDocumentNonBlocking(collection(firestore, 'storage_units'), payload);
      toast({ title: 'Storage added', description: `${values.name} created successfully.` });
      onOpenChange(false);
      form.reset(buildDefaults(defaultParentId));
      if (docRef && onSuccess) {
        onSuccess(docRef.id);
      }
    } catch (err) {
      console.error(err);
      toast({ title: 'Failed to add storage', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add storage unit</DialogTitle>
          <DialogDescription>Define a new storage container and optionally link it to a parent.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="storage_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Storage ID</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., STO-2025-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Freezer A" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type template</FormLabel>
                    <Popover open={typePopoverOpen} onOpenChange={setTypePopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          aria-expanded={typePopoverOpen}
                          className="justify-between"
                          disabled={isLoadingStorageTypes && !isStorageTypesPermissionDenied}
                        >
                          <div className="flex flex-col items-start text-left">
                            {selectedStorageType ? (
                              <>
                                <span className="font-medium text-sm">{selectedStorageType.name}</span>
                                <span className="text-xs text-muted-foreground">Pre-fills defaults</span>
                              </>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                {isStorageTypesPermissionDenied
                                  ? 'Insufficient permission to list types'
                                  : isLoadingStorageTypes
                                    ? 'Loading types…'
                                    : 'Select a template (optional)'}
                              </span>
                            )}
                          </div>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[320px] p-0" align="start">
                        {isLoadingStorageTypes && !isStorageTypesPermissionDenied ? (
                          <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading storage types…
                          </div>
                        ) : isStorageTypesPermissionDenied ? (
                          <div className="p-4 text-sm text-amber-600">
                            You do not have permission to read storage types. Enter details manually.
                          </div>
                        ) : storageTypeOptions.length === 0 ? (
                          <div className="p-4 text-sm text-muted-foreground">No storage types defined yet.</div>
                        ) : (
                          <div className="space-y-2">
                            <div className="p-2">
                              <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                  autoFocus
                                  placeholder="Filter types…"
                                  value={typeSearchQuery}
                                  onChange={(event) => setTypeSearchQuery(event.target.value)}
                                  className="pl-9"
                                />
                              </div>
                            </div>
                            <ScrollArea className="max-h-60">
                              <div className="flex flex-col divide-y">
                                {filteredStorageTypes.map((option) => (
                                  <button
                                    key={option.id}
                                    type="button"
                                    className={cn(
                                      'flex items-center justify-between px-3 py-2 text-sm text-left transition hover:bg-muted',
                                      option.id === field.value && 'bg-muted'
                                    )}
                                    onClick={() => {
                                      if (option.isFallback) {
                                        field.onChange(undefined);
                                        form.setValue('type', option.label);
                                        applyTypeDefaults(undefined);
                                      } else {
                                        field.onChange(option.id);
                                        form.setValue('type', option.label);
                                        applyTypeDefaults(typesById.get(option.id));
                                      }
                                      setTypePopoverOpen(false);
                                      setTypeSearchQuery('');
                                    }}
                                  >
                                    <span>{option.label}</span>
                                    {((!option.isFallback && option.id === field.value) ||
                                      (option.isFallback && watchedTypeLabel?.toLowerCase() === option.label.toLowerCase())) && (
                                        <span className="text-xs text-muted-foreground">Selected</span>
                                      )}
                                  </button>
                                ))}
                              </div>
                            </ScrollArea>
                            <div className="border-t p-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="w-full"
                                onClick={() => {
                                  field.onChange(undefined);
                                  applyTypeDefaults(undefined);
                                  setTypePopoverOpen(false);
                                  setTypeSearchQuery('');
                                }}
                              >
                                Clear template / manual entry
                              </Button>
                            </div>
                          </div>
                        )}
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      Picks defaults for grid, capacity, and temperature. When templates are unavailable, existing storage types are listed for
                      quick reuse.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="parent_storage_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent container</FormLabel>
                    <Popover open={parentPopoverOpen} onOpenChange={setParentPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="outline" role="combobox" className="w-full justify-between">
                          <span className="truncate text-left">{selectedParentLabel}</span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[320px] p-0" align="start">
                        <div className="space-y-2">
                          <div className="p-2">
                            <div className="relative">
                              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input
                                autoFocus
                                placeholder="Filter containers…"
                                value={parentSearchQuery}
                                onChange={(event) => setParentSearchQuery(event.target.value)}
                                className="pl-9"
                              />
                            </div>
                          </div>
                          <ScrollArea className="max-h-60">
                            <div className="flex flex-col divide-y">
                              <button
                                type="button"
                                className={cn(
                                  'px-3 py-2 text-left text-sm transition hover:bg-muted',
                                  !field.value && 'bg-muted font-medium'
                                )}
                                onClick={() => {
                                  field.onChange(undefined);
                                  setParentPopoverOpen(false);
                                  setParentSearchQuery('');
                                }}
                              >
                                Root (no parent)
                              </button>
                              {filteredParentOptions.map((option) => (
                                <button
                                  key={option.id}
                                  type="button"
                                  className={cn(
                                    'px-3 py-2 text-left text-sm transition hover:bg-muted',
                                    option.id === field.value && 'bg-muted font-medium'
                                  )}
                                  onClick={() => {
                                    field.onChange(option.id);
                                    setParentPopoverOpen(false);
                                    setParentSearchQuery('');
                                  }}
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      </PopoverContent>
                    </Popover>
                    <FormDescription>Select the container this storage lives inside. Leave empty for root.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type label</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Cryo Freezer, Ambient Cabinet"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(event) => field.onChange(event.target.value)}
                    />
                  </FormControl>
                  <FormDescription>
                    This is the human-readable type that will be saved on the container. Selecting a template above merely pre-fills defaults.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="temperature"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target temp (°C)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="e.g., -20"
                        value={field.value ?? ''}
                        onChange={(event) => {
                          const nextValue = event.target.value;
                          field.onChange(nextValue === '' ? undefined : Number(nextValue));
                        }}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="temperature_min"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Min temp (°C)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="e.g., -25"
                        value={field.value ?? ''}
                        onChange={(event) => {
                          const nextValue = event.target.value;
                          field.onChange(nextValue === '' ? undefined : Number(nextValue));
                        }}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="temperature_max"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max temp (°C)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="e.g., -15"
                        value={field.value ?? ''}
                        onChange={(event) => {
                          const nextValue = event.target.value;
                          field.onChange(nextValue === '' ? undefined : Number(nextValue));
                        }}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="capacity_slots"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g., 100"
                        value={field.value ?? ''}
                        onChange={(event) => {
                          const nextValue = event.target.value;
                          field.onChange(nextValue === '' ? undefined : Number(nextValue));
                        }}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        disabled={selectedStorageType?.grid_defaults !== undefined}
                      />
                    </FormControl>
                    {effectiveSlots !== undefined && (
                      <p className="text-xs text-muted-foreground">
                        Effective capacity: {effectiveSlots} slots (theoretical {theoreticalSlots} minus {disabledCellsCount} blocked)
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="grid_rows"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rows (grid)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="10"
                        disabled={!canEditGrid}
                        value={field.value ?? ''}
                        onChange={(event) => {
                          const nextValue = event.target.value;
                          field.onChange(nextValue === '' ? undefined : Number(nextValue));
                        }}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="grid_cols"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cols (grid)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="10"
                        disabled={!canEditGrid}
                        value={field.value ?? ''}
                        onChange={(event) => {
                          const nextValue = event.target.value;
                          field.onChange(nextValue === '' ? undefined : Number(nextValue));
                        }}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="label_schema"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Label schema</FormLabel>
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="alpha-numeric" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {LABEL_SCHEMAS.map((schema) => (
                        <SelectItem key={schema} value={schema}>
                          {schema.replace('-', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving…' : 'Create storage'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
