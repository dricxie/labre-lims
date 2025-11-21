'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { ReactNode } from 'react';

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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Equipment } from '@/lib/types';
import { useUser } from '@/firebase';

const formSchema = z.object({
  equipment_id: z.string().min(1, 'Equipment ID is required'),
  name: z.string().min(1, 'Equipment name is required'),
  type: z.string().min(1, 'Equipment type is required'),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  serial_number: z.string().optional(),
  location: z.string().min(1, 'Location is required'),
  calibration_due_date: z.date().optional(),
});

type FormValues = z.infer<typeof formSchema>;

type AddEquipmentDialogProps = {
  children: ReactNode;
  isOpen: boolean;
  // FIX: Corrected the typo from 'onOpen-change' to 'onOpenChange'
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Omit<Equipment, 'id'>) => void;
};

export function AddEquipmentDialog({
  children,
  isOpen,
  onOpenChange,
  onSubmit,
}: AddEquipmentDialogProps) {
  const { user } = useUser();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      equipment_id: `EQP-${Date.now()}`,
    },
  });

  const { isSubmitting } = form.formState;

  const handleSubmit = (values: FormValues) => {
    if (!user) {
      console.error("User not authenticated. Cannot submit form.");
      return;
    }
    
    const equipmentData: Omit<Equipment, 'id'> = {
      ...values,
      manufacturer: values.manufacturer || 'N/A',
      model: values.model || 'N/A',
      serial_number: values.serial_number || 'N/A',
      calibration_due_date: values.calibration_due_date
        ? values.calibration_due_date.toISOString()
        : undefined,
      createdById: user.uid,
    };
    onSubmit(equipmentData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Equipment</DialogTitle>
          <DialogDescription>
            Enter the details for the new equipment. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* The rest of the form JSX remains unchanged */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Equipment Name</FormLabel>
                    <FormControl><Input placeholder="e.g., Thermal Cycler" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="equipment_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Equipment ID</FormLabel>
                    <FormControl><Input placeholder="e.g., EQP-2025-001" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <FormControl><Input placeholder="e.g., PCR Machine" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl><Input placeholder="e.g., Bench 3" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="manufacturer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Manufacturer (Optional)</FormLabel>
                    <FormControl><Input placeholder="e.g., Bio-Rad" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model (Optional)</FormLabel>
                    <FormControl><Input placeholder="e.g., T100" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="serial_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Serial Number (Optional)</FormLabel>
                    <FormControl><Input placeholder="e.g., SN-A9B8C7" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="calibration_due_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Next Calibration (Optional)</FormLabel>
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
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus/>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Equipment
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}