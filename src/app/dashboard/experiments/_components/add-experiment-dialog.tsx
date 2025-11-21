'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { ReactNode, useMemo } from 'react';

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
  FormDescription,
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
import { Experiment, Sample } from '@/lib/types';
import { useUser, useFirestore, useCollection } from '@/firebase'; // FIX: Import useUser hook
import { collection, query, where } from 'firebase/firestore';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  type: z.enum(['DNA extraction', 'PCR', 'Electrophoresis', 'Sequencing']),
  protocol_id: z.string().min(1, 'Protocol ID is required'),
  project_id: z.string().min(1, 'Project ID is required'),
  taskId: z.string().optional(),
  start_time: z.date(),
  end_time: z.date().optional(),
  status: z.enum(['planned', 'running', 'completed', 'cancelled']),
  sampleIds: z.array(z.string()).optional(),
});

type FormValues = z.infer<typeof formSchema>;

type AddExperimentDialogProps = {
  children: ReactNode;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Omit<Experiment, 'id' | 'createdAt' | 'createdBy' | 'experiment_id' | 'labId'>) => void;
};

export function AddExperimentDialog({
  children,
  isOpen,
  onOpenChange,
  onSubmit,
}: AddExperimentDialogProps) {
  const firestore = useFirestore();
  const { user } = useUser(); // FIX: Get the authenticated user

  const samplesQuery = useMemo(() => {
    if (!user) return null;
    // Fetch samples that are available for experiments
    return query(collection(firestore, 'samples'));
  }, [firestore, user]);

  const { data: samples, isLoading: isLoadingSamples } = useCollection<Sample>(samplesQuery);

  const tasksQuery = useMemo(() => {
    if (!user) return null;
    return query(collection(firestore, 'tasks'), where('status', '!=', 'Completed'));
  }, [firestore, user]);
  const { data: tasks } = useCollection<any>(tasksQuery); // Use 'any' or Task type if imported

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      project_id: 'PROJ-01',
      protocol_id: 'PROT-PCR-03',
      type: 'PCR',
      status: 'planned',
      start_time: new Date(),
      sampleIds: [],
    },
  });

  // Filter samples based on project_id if entered, or just show all available
  const availableSamples = useMemo(() => {
    if (!samples) return [];
    const projectId = form.watch('project_id');
    let filtered = samples.filter(s => ['received', 'in_storage', 'extracted'].includes(s.status));

    if (projectId && projectId.length > 2) {
      // Optional: filter by project ID if user wants, but maybe too restrictive for now
      // filtered = filtered.filter(s => s.project_id.toLowerCase().includes(projectId.toLowerCase()));
    }
    return filtered;
  }, [samples, form.watch('project_id')]);

  const { isSubmitting } = form.formState;

  const handleSubmit = (values: FormValues) => {
    if (!user) {
      console.error("User not authenticated, cannot submit experiment.");
      return;
    }

    // FIX: Add the required 'createdById' field to the payload
    const experimentData: Omit<Experiment, 'id' | 'createdAt' | 'createdBy' | 'experiment_id' | 'labId'> = {
      ...values,
      start_time: values.start_time.toISOString(),
      end_time: values.end_time ? values.end_time.toISOString() : undefined,
      createdById: user.uid,
    };
    onSubmit(experimentData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Experiment</DialogTitle>
          <DialogDescription>
            Enter the details for the new experiment. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Experiment Title</FormLabel>
                    <FormControl><Input placeholder="e.g., Marker Gene PCR for Disease Resistance" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Experiment Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select a type" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="DNA extraction">DNA Extraction</SelectItem>
                        <SelectItem value="PCR">PCR</SelectItem>
                        <SelectItem value="Electrophoresis">Electrophoresis</SelectItem>
                        <SelectItem value="Sequencing">Sequencing</SelectItem>
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
                      <FormControl><SelectTrigger><SelectValue placeholder="Select a status" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="planned">Planned</SelectItem>
                        <SelectItem value="running">Running</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
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
                name="taskId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link to Task (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select a task" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {tasks?.map((task: any) => (
                          <SelectItem key={task.id} value={task.taskId}>
                            {task.title} ({task.taskId})
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
                name="protocol_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Protocol ID</FormLabel>
                    <FormControl><Input placeholder="e.g., PROT-PCR-03" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="start_time"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Time</FormLabel>
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
                name="end_time"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>End Time (Optional)</FormLabel>
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
            </div>

            <div className="space-y-2">
              <FormLabel>Input Samples</FormLabel>
              <div className="border rounded-md p-4">
                <ScrollArea className="h-[200px]">
                  {isLoadingSamples ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : availableSamples.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      No available samples found.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {availableSamples.map((sample) => (
                        <FormField
                          key={sample.id}
                          control={form.control}
                          name="sampleIds"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={sample.id}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(sample.id!)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...(field.value || []), sample.id])
                                        : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== sample.id
                                          )
                                        )
                                    }}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="font-normal">
                                    <span className="font-medium">{sample.sample_id}</span>
                                    <span className="text-muted-foreground ml-2">
                                      ({sample.sample_type}, {sample.status})
                                    </span>
                                  </FormLabel>
                                </div>
                              </FormItem>
                            )
                          }}
                        />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
              <FormDescription className="text-xs text-muted-foreground">
                Select samples to be used in this experiment.
              </FormDescription>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Experiment
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}