// src/app/dashboard/samples/_components/sample-form.tsx

'use client';

import { UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { StorageOption } from '@/hooks/use-storage-options';
import { StorageLocationField } from './storage-location-field';

// You can move the formSchema here as well to co-locate it with the form
export const formSchema = z.object({
  sample_id: z.string().min(1, 'Sample ID is required'),
  project_id: z.string().min(1, 'Project ID is required'),
  sample_type: z.enum(['blood', 'tissue', 'hair', 'dna', 'other']),
  status: z.enum(['received', 'in_storage', 'processing', 'extracted', 'used', 'disposed']),
  source: z.string().min(1, 'Source is required'),
  storage_location_id: z.string().min(1, 'Storage location is required'),
  collected_by: z.string().min(1, 'Collector is required'),
  date_collected: z.date(),
  date_received: z.date(),
  initial_volume: z.coerce.number().positive(),
  current_volume: z.coerce.number().positive(),
});

export type FormValues = z.infer<typeof formSchema>;

interface SampleFormProps {
  form: UseFormReturn<FormValues>;
  onSubmit: (values: FormValues) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  submitButtonText?: string;
  storageOptions?: StorageOption[];
  isLoadingStorageOptions?: boolean;
}

export function SampleForm({
  form,
  onSubmit,
  onCancel,
  isSubmitting,
  submitButtonText = 'Save Sample',
  storageOptions = [],
  isLoadingStorageOptions,
}: SampleFormProps) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="sample_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sample ID</FormLabel>
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
                <FormControl><Input placeholder="e.g., PROJ-01" {...field} /></FormControl>
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
              <FormItem>
                <FormLabel>Source</FormLabel>
                <FormControl><Input placeholder="e.g., Sapi Bali #32" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <StorageLocationField
            control={form.control}
            name="storage_location_id"
            options={storageOptions}
            isLoading={isLoadingStorageOptions}
            description="Search by storage ID, name, or breadcrumb."
          />
          <FormField
            control={form.control}
            name="collected_by"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Collected By</FormLabel>
                <FormControl><Input placeholder="e.g., field_team" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="date_collected"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date Collected</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}
                      >
                        {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
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
                <FormLabel>Date Received</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}
                      >
                        {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
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
            name="initial_volume"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Initial Volume (mL)</FormLabel>
                <FormControl><Input type="number" placeholder="e.g., 10" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="current_volume"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Current Volume (mL)</FormLabel>
                <FormControl><Input type="number" placeholder="e.g., 8" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitButtonText}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}