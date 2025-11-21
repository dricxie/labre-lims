'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, Paperclip } from 'lucide-react';
import { ReactNode, useState } from 'react';

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
import { Result } from '@/lib/types';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase'; // FIX 2: Import useUser

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB

const formSchema = z.object({
  resultType: z.enum(['numeric', 'qualitative', 'image', 'gel_band']),
  value: z.string().min(1, 'Result value is required'),
  unit: z.string().optional(),
  file: z.any().optional(),
});

type FormValues = z.infer<typeof formSchema>;

type LogResultDialogProps = {
  children?: ReactNode;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Omit<Result, 'id' | 'experiment_id' | 'result_id' | 'createdAt' | 'createdBy' | 'sampleId' | 'dnaId'>) => void;
};

export function LogResultDialog({
  children,
  isOpen,
  onOpenChange,
  onSubmit,
}: LogResultDialogProps) {
  const { toast } = useToast();
  const { user } = useUser(); // FIX 2: Get the authenticated user
  const [fileName, setFileName] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      resultType: 'qualitative',
    },
  });

  // FIX 1: Get 'watch' from the main 'form' object, not 'form.formState'
  const { isSubmitting } = form.formState;
  const resultType = form.watch('resultType');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
        toast({
            variant: 'destructive',
            title: 'File too large',
            description: `Please select a file smaller than ${MAX_FILE_SIZE / 1024 / 1024}MB.`,
        });
        e.target.value = ''; // Reset the input
        return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
        form.setValue('file', reader.result as string);
        setFileName(file.name);
    };
    reader.readAsDataURL(file);
  };
  
  const handleSubmit = (values: FormValues) => {
    // FIX 2: Add guard clause and include 'createdById' in the payload
    if (!user) {
        toast({ variant: 'destructive', title: 'Not authenticated' });
        return;
    }

    const submissionData = {
        resultType: values.resultType,
        value: values.value,
        unit: values.unit,
        fileDataUrl: values.file,
        createdById: user.uid,
    }
    onSubmit(submissionData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if(!open) {
            form.reset();
            setFileName(null);
        }
        onOpenChange(open);
    }}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Log Result</DialogTitle>
          <DialogDescription>
            Enter the result for the selected sample.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
                control={form.control}
                name="resultType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Result Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="numeric">Numeric</SelectItem>
                        <SelectItem value="qualitative">Qualitative</SelectItem>
                        <SelectItem value="image">Image</SelectItem>
                        <SelectItem value="gel_band">Gel Band</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Value</FormLabel>
                    <FormControl><Textarea placeholder="e.g., Positive, 25.5, Band visible at 250bp" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit (Optional)</FormLabel>
                    <FormControl><Input placeholder="e.g., ng/µL, Ct, bp" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
             {resultType === 'image' && (
                <FormItem>
                    <FormLabel>Attach Image</FormLabel>
                    <FormControl>
                        <Input type="file" accept="image/*" onChange={handleFileChange} />
                    </FormControl>
                    {fileName && (
                        <div className="text-xs text-muted-foreground flex items-center gap-2 pt-1">
                            <Paperclip className="h-3 w-3" />
                            <span>{fileName}</span>
                        </div>
                    )}
                    <FormMessage />
                </FormItem>
             )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Log Result
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}