'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';

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
import { Consumable } from '@/lib/types';
import { ReactNode } from 'react';
import { useUser } from '@/firebase'; // FIX: Import the useUser hook

const formSchema = z.object({
  consumable_id: z.string().min(1, 'Consumable ID is required'),
  name: z.string().min(1, 'Consumable name is required'),
  lot_number: z.string().optional(),
  vendor: z.string().min(1, 'Vendor is required'),
  quantity: z.coerce.number().min(0, 'Quantity cannot be negative'),
  unit: z.enum(['box', 'pack', 'item']),
  storage_location_id: z.string().min(1, 'Storage location is required'),
  min_threshold: z.coerce.number().min(0, 'Threshold cannot be negative'),
});

type FormValues = z.infer<typeof formSchema>;

type AddConsumableDialogProps = {
  children: ReactNode;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Omit<Consumable, 'id' | 'createdAt' | 'createdBy' | 'expiry_date' | 'labId'>) => void;
};

export function AddConsumableDialog({
  children,
  isOpen,
  onOpenChange,
  onSubmit,
}: AddConsumableDialogProps) {
  const { user } = useUser(); // FIX: Get the authenticated user
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      consumable_id: `CNS-${new Date().getFullYear()}-`,
      unit: 'box',
    },
  });

  const { isSubmitting } = form.formState;

  const handleSubmit = (values: FormValues) => {
    // FIX: Add guard clause and include 'createdById' in the payload
    if (!user) {
        console.error("User not authenticated. Cannot add consumable.");
        return;
    }

    const consumableData = {
      ...values,
      lot_number: values.lot_number || 'N/A',
      createdById: user.uid,
    };
    onSubmit(consumableData);
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
          <DialogTitle>Add New Consumable</DialogTitle>
          <DialogDescription>
            Enter the details for the new consumable item. Click save when you're done.
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
                    <FormLabel>Consumable Name</FormLabel>
                    <FormControl><Input placeholder="e.g., 1.5mL Microcentrifuge Tubes" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="consumable_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Consumable ID</FormLabel>
                    <FormControl><Input placeholder="e.g., CNS-2025-0001" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lot_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lot Number (Optional)</FormLabel>
                    <FormControl><Input placeholder="e.g., GT-8812" {...field} /></FormControl>
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
                    <FormControl><Input placeholder="e.g., Eppendorf" {...field} /></FormControl>
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
                        <SelectItem value="box">box</SelectItem>
                        <SelectItem value="pack">pack</SelectItem>
                        <SelectItem value="item">item</SelectItem>
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
                    <FormControl><Input placeholder="e.g., CAB-C-S1" {...field} /></FormControl>
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
                Save Consumable
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}