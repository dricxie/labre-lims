'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { ReactNode, useMemo } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ExperimentSample, Sample, DnaExtract } from '@/lib/types';
import { useCollection, useFirestore, useUser } from '@/firebase';

const formSchema = z.object({
  sourceType: z.enum(['sample', 'dna_extract']),
  sourceId: z.string().min(1, 'You must select a source.'),
  role: z.enum(['test', 'control_positive', 'control_negative', 'marker']),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

type AddSampleToExperimentDialogProps = {
  children?: ReactNode;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Omit<ExperimentSample, 'id' | 'experiment_id'>) => void;
};

export function AddSampleToExperimentDialog({
  children,
  isOpen,
  onOpenChange,
  onSubmit,
}: AddSampleToExperimentDialogProps) {
  const { user } = useUser();
  const firestore = useFirestore();

  // FIX 1: Removed labId and simplified the queries
  const samplesQuery = useMemo(() => {
    if (!user) return null;
    return query(collection(firestore, 'samples'));
  }, [firestore, user]);
  const { data: samples } = useCollection<Sample>(samplesQuery);

  const dnaExtractsQuery = useMemo(() => {
    if (!user) return null;
    return query(collection(firestore, 'dna_extracts'));
  }, [firestore, user]);
  const { data: dnaExtracts } = useCollection<DnaExtract>(dnaExtractsQuery);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sourceType: 'sample',
      role: 'test',
    },
  });

  // FIX 2: Correctly get 'watch' from the main 'form' object, not 'form.formState'
  const { isSubmitting } = form.formState;
  const sourceType = form.watch('sourceType');

  const handleSubmit = (values: FormValues) => {
    const submissionData = {
      sample_id: values.sourceType === 'sample' ? values.sourceId : undefined,
      dna_id: values.sourceType === 'dna_extract' ? values.sourceId : undefined,
      role: values.role,
      notes: values.notes,
      createdById: user?.uid || '',
    };
    // The 'labId' property is correctly omitted from submissionData, so no change is needed here.
    onSubmit(submissionData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Sample to Experiment</DialogTitle>
          <DialogDescription>
            Select a sample or DNA extract to include in this experiment.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="sourceType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Select Source Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex space-x-4"
                    >
                      <FormItem className="flex items-center space-x-2">
                        <FormControl><RadioGroupItem value="sample" /></FormControl>
                        <FormLabel className="font-normal">Sample</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2">
                        <FormControl><RadioGroupItem value="dna_extract" /></FormControl>
                        <FormLabel className="font-normal">DNA Extract</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sourceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{sourceType === 'sample' ? 'Sample' : 'DNA Extract'}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder={`Select a ${sourceType?.replace('_', ' ')}...`} /></SelectTrigger></FormControl>
                    <SelectContent>
                      {sourceType === 'sample'
                        ? samples?.map(s => <SelectItem key={s.id} value={s.sample_id}>{s.sample_id}</SelectItem>)
                        : dnaExtracts?.map(d => <SelectItem key={d.id} value={d.dna_id}>{d.dna_id}</SelectItem>)
                      }
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role in Experiment</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="test">Test</SelectItem>
                      <SelectItem value="control_positive">Positive Control</SelectItem>
                      <SelectItem value="control_negative">Negative Control</SelectItem>
                      <SelectItem value="marker">Marker</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl><Input placeholder="e.g., Diluted to 10 ng/µL" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add to Experiment
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}