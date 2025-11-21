'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';

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
import { Reagent } from '@/lib/types';
import { ReactNode } from 'react';
import { useUser } from '@/firebase'; // FIX: Import the useUser hook

const formSchema = z.object({
  reagent_id: z.string().min(1, 'Reagent ID is required'),
  name: z.string().min(1, 'Reagent name is required'),
  lot_number: z.string().min(1, 'Lot number is required'),
  vendor: z.string().min(1, 'Vendor is required'),
  quantity: z.coerce.number().min(0, 'Quantity cannot be negative'),
  unit: z.enum(['kit', 'mL', 'unit', 'tube', 'µL']),
  expiry_date: z.date(),
  storage_condition: z.enum(['-20°C', '4°C', 'RT', '-80°C']),
  storage_location_id: z.string().min(1, 'Storage location is required'),
  min_threshold: z.coerce.number().min(0, 'Threshold cannot be negative'),
});

type FormValues = z.infer<typeof formSchema>;

type AddReagentDialogProps = {
  children: ReactNode;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Omit<Reagent, 'id' | 'createdAt' | 'createdBy' | 'labId'>) => void;
};

export function AddReagentDialog({
  children,
  isOpen,
  onOpenChange,
  onSubmit,
}: AddReagentDialogProps) {
  const { user } = useUser(); // FIX: Get the authenticated user
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      reagent_id: `RGT-${new Date().getFullYear()}-`,
      name: '',
      lot_number: '',
      vendor: '',
      quantity: 0,
      unit: 'mL',
      expiry_date: new Date(),
      storage_condition: 'RT',
      storage_location_id: '',
      min_threshold: 0,
    },
  });

  const { isSubmitting } = form.formState;

  const handleSubmit = (values: FormValues) => {
    // FIX: Add a guard clause and include 'createdById' in the payload
    if (!user) {
      console.error("User not authenticated. Cannot add reagent.");
      return;
    }

    const reagentData: Omit<Reagent, 'id' | 'createdAt' | 'createdBy' | 'labId'> = {
      ...values,
      expiry_date: values.expiry_date.toISOString(),
      createdById: user.uid,
    };
    onSubmit(reagentData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        form.reset();
      }
      onOpenChange(open);
    }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Reagent</DialogTitle>
          <DialogDescription>
            Enter the details for the new reagent. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reagent Name</FormLabel>
                    <FormControl><Input placeholder="e.g., DNeasy Blood & Tissue Kit" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reagent_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reagent ID</FormLabel>
                    <FormControl><Input placeholder="e.g., RGT-2025-0001" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lot_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lot Number</FormLabel>
                    <FormControl><Input placeholder="e.g., Q5A123" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="vendor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor</FormLabel>
                    <FormControl><Input placeholder="e.g., Qiagen" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl><Input type="number" placeholder="e.g., 5" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select a unit" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="kit">kit</SelectItem>
                        <SelectItem value="mL">mL</SelectItem>
                        <SelectItem value="µL">µL</SelectItem>
                        <SelectItem value="unit">unit</SelectItem>
                        <SelectItem value="tube">tube</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expiry_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Expiry Date</FormLabel>
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
                name="storage_condition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Storage Condition</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select storage condition" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="RT">Room Temp</SelectItem>
                        <SelectItem value="4°C">4°C</SelectItem>
                        <SelectItem value="-20°C">-20°C</SelectItem>
                        <SelectItem value="-80°C">-80°C</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="storage_location_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Storage Location</FormLabel>
                    <FormControl><Input placeholder="e.g., FRZ-A-R1-B2" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="min_threshold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Low Stock Threshold</FormLabel>
                    <FormControl><Input type="number" placeholder="e.g., 2" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Reagent
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}