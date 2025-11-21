'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Task, UserProfile, Sample } from '@/lib/types';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const taskInfoSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  type: z.enum(['DNA Extraction', 'PCR', 'Sample Reception', 'Analysis']),
  assignedTo: z.string().min(1, 'You must assign this task to a user'),
});

const sampleSelectionSchema = z.object({
    sampleIds: z.array(z.string()).min(1, 'You must select at least one sample'),
});

type TaskInfoFormValues = z.infer<typeof taskInfoSchema>;
type SampleSelectionFormValues = z.infer<typeof sampleSelectionSchema>;

type AddTaskDialogProps = {
  children: ReactNode;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Omit<Task, 'id' | 'createdAt' | 'createdBy' | 'status' | 'taskId' | 'labId'>) => void;
};

export function AddTaskDialog({
  children,
  isOpen,
  onOpenChange,
  onSubmit,
}: AddTaskDialogProps) {
  const [step, setStep] = useState(1);
  const [selectedSamples, setSelectedSamples] = useState<Record<string, boolean>>({});

  const firestore = useFirestore();
  const { user: currentUser } = useUser();

  // FIX 1: Removed labId and simplified queries.
  const usersQuery = useMemo(() => {
    if (!currentUser) return null;
    return query(collection(firestore, 'user_profiles'));
  }, [firestore, currentUser]);
  
  const samplesQuery = useMemo(() => {
    if (!currentUser) return null;
    return query(collection(firestore, 'samples'));
  }, [firestore, currentUser]);
  
  const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile>(usersQuery);
  const { data: samples, isLoading: isLoadingSamples } = useCollection<Sample>(samplesQuery);

  const taskInfoForm = useForm<TaskInfoFormValues>({
    resolver: zodResolver(taskInfoSchema),
    defaultValues: {
      title: '',
      type: 'DNA Extraction',
    },
  });

  const sampleSelectionForm = useForm<SampleSelectionFormValues>({
    resolver: zodResolver(sampleSelectionSchema),
    defaultValues: {
        sampleIds: [],
    },
  });

  const { isSubmitting } = taskInfoForm.formState;

  const handleNext = async () => {
    const isValid = await taskInfoForm.trigger();
    if (isValid) {
      setStep(2);
    }
  };
  
  const handleBack = () => setStep(step - 1);

  const handleSubmit = () => {
    // FIX 2: Add guard clause and include 'createdById' in the payload.
    if (!currentUser) {
        console.error("User not authenticated. Cannot create task.");
        return;
    }

    const sampleIds = Object.keys(selectedSamples).filter(id => selectedSamples[id]);
    sampleSelectionForm.setValue('sampleIds', sampleIds);
    const isValid = sampleSelectionForm.trigger();
    if (!isValid) return;

    const taskData = {
        ...taskInfoForm.getValues(),
        sampleIds,
        createdById: currentUser.uid,
    };
    onSubmit(taskData);
  }

  const selectedSampleCount = Object.values(selectedSamples).filter(Boolean).length;

  const availableSamples = useMemo(() => {
    return samples?.filter(s => s.status === 'in_storage' || s.status === 'received');
  }, [samples]);

  const resetForm = () => {
    taskInfoForm.reset();
    sampleSelectionForm.reset();
    setSelectedSamples({});
    setStep(1);
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) {
            resetForm();
        }
        onOpenChange(open);
    }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Create New Task Assignment</DialogTitle>
          <DialogDescription>
            {step === 1 && 'Fill in the task details and assign it to a user.'}
            {step === 2 && 'Select the samples to be included in this task.'}
            {step === 3 && 'Review the task details before saving.'}
          </DialogDescription>
        </DialogHeader>
        
        {/* Step 1: Task Info */}
        <div className={cn(step !== 1 && 'hidden')}>
            <Form {...taskInfoForm}>
            <div className="space-y-4 py-4">
              <FormField
                control={taskInfoForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Title</FormLabel>
                    <FormControl><Input placeholder="e.g., DNA Extraction Batch 2024-A" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={taskInfoForm.control}
                    name="type"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Task Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                            <SelectItem value="DNA Extraction">DNA Extraction</SelectItem>
                            <SelectItem value="PCR">PCR</SelectItem>
                            <SelectItem value="Sample Reception">Sample Reception</SelectItem>
                            <SelectItem value="Analysis">Analysis</SelectItem>
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={taskInfoForm.control}
                    name="assignedTo"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Assign To</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger>
                            <SelectValue placeholder={isLoadingUsers ? "Loading users..." : "Select a user"}/>
                        </SelectTrigger></FormControl>
                        <SelectContent>
                            {users?.map(user => (
                                <SelectItem key={user.id} value={user.id!}>{user.name} ({user.email})</SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
              </div>
            </div>
          </Form>
        </div>

        {/* Step 2: Select Samples */}
        <div className={cn("flex-1 min-h-0", step !== 2 && 'hidden')}>
            <ScrollArea className="h-full pr-6">
                <Table>
                    <TableHeader className="sticky top-0 bg-background">
                        <TableRow>
                            <TableHead className="w-[50px]"><Checkbox 
                                checked={availableSamples && selectedSampleCount === availableSamples.length}
                                onCheckedChange={(checked) => {
                                    const newSelectedSamples: Record<string, boolean> = {};
                                    if(checked) {
                                        availableSamples?.forEach(s => newSelectedSamples[s.id!] = true);
                                    }
                                    setSelectedSamples(newSelectedSamples);
                                }}
                            /></TableHead>
                            <TableHead>Sample ID</TableHead>
                            <TableHead>Project</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoadingSamples && <TableRow><TableCell colSpan={4}><Loader2 className="mx-auto my-10 h-8 w-8 animate-spin text-muted-foreground"/></TableCell></TableRow>}
                        {availableSamples?.map(sample => (
                            <TableRow key={sample.id}>
                                <TableCell><Checkbox 
                                    checked={selectedSamples[sample.id!] || false}
                                    onCheckedChange={(checked) => setSelectedSamples(prev => ({...prev, [sample.id!]: !!checked}))}
                                /></TableCell>
                                <TableCell>{sample.sample_id}</TableCell>
                                <TableCell>{sample.project_id}</TableCell>
                                <TableCell><Badge variant="outline" className="capitalize">{sample.status.replace('_', ' ')}</Badge></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                 {!isLoadingSamples && (!availableSamples || availableSamples.length === 0) && (
                    <div className="text-center py-10 text-muted-foreground">
                        No available samples found (must be 'Received' or 'In Storage').
                    </div>
                )}
            </ScrollArea>
        </div>

        {/* Step 3: Confirmation */}
        <div className={cn(step !== 3 && 'hidden')}>
            <div className="space-y-4 py-4">
                <h4 className="font-medium">Task Details</h4>
                <p><strong>Title:</strong> {taskInfoForm.getValues().title}</p>
                <p><strong>Type:</strong> {taskInfoForm.getValues().type}</p>
                <p><strong>Assigned To:</strong> {users?.find(u => u.id === taskInfoForm.getValues().assignedTo)?.name}</p>
                <h4 className="font-medium pt-4">Samples ({selectedSampleCount})</h4>
                <ScrollArea className="h-40">
                    <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                        {samples?.filter(s => selectedSamples[s.id!]).map(s => <li key={s.id}>{s.sample_id}</li>)}
                    </ul>
                </ScrollArea>
            </div>
        </div>

        <DialogFooter className="pt-4">
            {step > 1 && <Button type="button" variant="outline" onClick={handleBack} disabled={isSubmitting}><ArrowLeft className="mr-2 h-4 w-4"/> Back</Button>}
            <div className="flex-grow" />
            {step === 1 && <Button type="button" onClick={handleNext}>Next <ArrowRight className="ml-2 h-4 w-4"/></Button>}
            {step === 2 && 
                <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">{selectedSampleCount} samples selected</span>
                     <Button type="button" onClick={() => {
                        const sampleIds = Object.keys(selectedSamples).filter(id => selectedSamples[id]);
                        const validationResult = sampleSelectionSchema.safeParse({sampleIds});
                        if (!validationResult.success) {
                            sampleSelectionForm.setError('sampleIds', { type: 'manual', message: validationResult.error.errors[0].message });
                            return;
                        }
                        sampleSelectionForm.clearErrors('sampleIds');
                        setStep(3)
                     }}>Review Task <ArrowRight className="ml-2 h-4 w-4"/></Button>
                     {sampleSelectionForm.formState.errors.sampleIds && <p className="text-sm text-destructive">{sampleSelectionForm.formState.errors.sampleIds.message}</p>}
                </div>
            }
            {step === 3 && <Button type="submit" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Task
            </Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}