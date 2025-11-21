'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { ReactNode, useMemo, useState } from 'react';
import { collection, query } from 'firebase/firestore'; // Removed 'where'

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
import { Shipment, Sample, Reagent, Consumable } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCollection, useFirestore, useUser } from '@/firebase';

const formSchema = z.object({
  shipment_id: z.string().min(1, 'Shipment ID is required'),
  item_type: z.enum(['Sample', 'Reagent', 'Consumable', 'Other']),
  item_id: z.string().min(1, 'An item must be selected'),
  origin: z.string().min(1, 'Origin is required'),
  destination: z.string().min(1, 'Destination is required'),
  date_sent: z.date(),
  status: z.enum(['In Transit', 'Received', 'Cancelled']),
  courier: z.string().optional(),
  tracking_number: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

type AddShipmentDialogProps = {
  children: ReactNode;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Omit<Shipment, 'id' | 'createdAt' | 'createdBy' | 'labId'>) => void;
};

const COURIERS = [
  { value: 'jne', label: 'JNE' },
  { value: 'pos', label: 'POS Indonesia' },
  { value: 'tiki', label: 'TIKI' },
  { value: 'wahana', label: 'Wahana' },
  { value: 'jnt', label: 'J&T' },
  { value: 'rpx', label: 'RPX' },
  { value: 'sap', label: 'SAP' },
  { value: 'sicepat', label: 'SiCepat' },
  { value: 'pcp', label: 'PCP' },
  { value: 'jet', label: 'JET Express' },
  { value: 'dse', label: 'DSE' },
  { value: 'first', label: 'First Logistics' },
  { value: 'ninja', label: 'Ninja Xpress' },
  { value: 'lion', label: 'Lion Parcel' },
  { value: 'idl', label: 'IDL Cargo' },
  { value: 'rex', label: 'REX' },
  { value: 'ide', label: 'ID Express' },
  { value: 'sentral', label: 'Sentral Cargo' },
  { value: 'anteraja', label: 'AnterAja' },
];

export function AddShipmentDialog({
  children,
  isOpen,
  onOpenChange,
  onSubmit,
}: AddShipmentDialogProps) {
  const [selectedItemName, setSelectedItemName] = useState<string>('');
  const firestore = useFirestore();
  const { user } = useUser();

  // FIX 1: Removed labId and simplified all queries.
  const samplesQuery = useMemo(() => {
    if (!user) return null;
    return query(collection(firestore, 'samples'));
  }, [firestore, user]);
  const { data: samples, isLoading: isLoadingSamples } = useCollection<Sample>(samplesQuery);

  const reagentsQuery = useMemo(() => {
    if (!user) return null;
    return query(collection(firestore, 'reagents'));
  }, [firestore, user]);
  const { data: reagents, isLoading: isLoadingReagents } = useCollection<Reagent>(reagentsQuery);

  const consumablesQuery = useMemo(() => {
    if (!user) return null;
    return query(collection(firestore, 'consumables'));
  }, [firestore, user]);
  const { data: consumables, isLoading: isLoadingConsumables } = useCollection<Consumable>(consumablesQuery);

  const isLoadingItems = isLoadingSamples || isLoadingReagents || isLoadingConsumables;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      shipment_id: `SHP-${Date.now()}`,
      date_sent: new Date(),
      status: 'In Transit',
      item_type: 'Sample',
      courier: '',
      tracking_number: '',
      origin: '',
      destination: '',
      item_id: '',
    },
  });

  const { formState: { isSubmitting }, watch, setValue } = form;
  const itemType = watch('item_type');

  const itemOptions = useMemo(() => {
    switch (itemType) {
      case 'Sample':
        return samples?.map(s => ({ value: s.id!, label: s.sample_id })) || [];
      case 'Reagent':
        return reagents?.map(r => ({ value: r.id!, label: `${r.name} (${r.lot_number})` })) || [];
      case 'Consumable':
        return consumables?.map(c => ({ value: c.id!, label: c.name })) || [];
      default:
        return [];
    }
  }, [itemType, samples, reagents, consumables]);


  const handleSubmit = (values: FormValues) => {
    // FIX 2: Add guard clause and include 'createdById' in the payload.
    if (!user) {
      console.error("User not authenticated. Cannot create shipment.");
      return;
    }
    const shipmentData: Omit<Shipment, 'id' | 'createdAt' | 'createdBy' | 'labId'> = {
      ...values,
      item_name: selectedItemName || values.item_id,
      date_sent: values.date_sent.toISOString(),
      createdById: user.uid,
    };
    onSubmit(shipmentData);
  };

  const handleItemChange = (itemId: string) => {
    const selected = itemOptions.find(opt => opt.value === itemId);
    setSelectedItemName(selected?.label || '');
    setValue('item_id', itemId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Shipment</DialogTitle>
          <DialogDescription>
            Log a new item being shipped or transferred.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="shipment_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shipment ID</FormLabel>
                    <FormControl><Input placeholder="e.g., SHP-2025-001" {...field} /></FormControl>
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
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="In Transit">In Transit</SelectItem>
                        <SelectItem value="Received">Received</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="item_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item Type</FormLabel>
                    <Select onValueChange={(value) => { field.onChange(value); setValue('item_id', ''); setSelectedItemName(''); }} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Sample">Sample</SelectItem>
                        <SelectItem value="Reagent">Reagent</SelectItem>
                        <SelectItem value="Consumable">Consumable</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="item_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item to Ship</FormLabel>
                    <Select onValueChange={handleItemChange} defaultValue={field.value} disabled={itemType === 'Other' || isLoadingItems}>
                      <FormControl><SelectTrigger>
                        <SelectValue placeholder={isLoadingItems ? 'Loading items...' : 'Select an item'} />
                      </SelectTrigger></FormControl>
                      <SelectContent>
                        {itemOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {itemType === 'Other' && <FormControl><Input placeholder="Describe the item..." onChange={(e) => handleItemChange(e.target.value)} /></FormControl>}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="origin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Origin</FormLabel>
                    <FormControl><Input placeholder="e.g., Main Lab, Freezer A" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="destination"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Destination</FormLabel>
                    <FormControl><Input placeholder="e.g., Partner Lab, University Hospital" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="date_sent"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date Sent</FormLabel>
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
                name="courier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Courier (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select courier" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {COURIERS.map((c) => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tracking_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tracking Number (Optional)</FormLabel>
                    <FormControl><Input placeholder="e.g., JP123456789" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting || isLoadingItems}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Shipment
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}