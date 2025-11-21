// src/app/dashboard/samples/_components/edit-sample-dialog.tsx

'use client';

import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { doc, updateDoc, DocumentReference } from 'firebase/firestore'; 
import { parseISO } from 'date-fns';
import { useDocumentData } from 'react-firebase-hooks/firestore';

import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useFirestore } from '@/firebase';
import { Sample } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { SampleForm, formSchema, FormValues } from './sample-form';
import { useStorageOptions } from '@/hooks/use-storage-options';

interface EditSampleDialogProps {
  sampleId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditSampleDialog({ sampleId, isOpen, onOpenChange }: EditSampleDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const sampleRef = doc(firestore, 'samples', sampleId) as DocumentReference<Sample>; 
  const [sample, isLoading] = useDocumentData<Sample>(sampleRef);
  const {
    options: storageOptions,
    optionsById,
    isLoading: isLoadingStorageOptions,
  } = useStorageOptions();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sample_id: '',
      project_id: '',
      sample_type: 'blood',
      status: 'received',
      source: '',
      storage_location_id: '',
      collected_by: '',
      date_collected: new Date(), // Ensures this is a valid Date object on first render
      date_received: new Date(),   // Ensures this is a valid Date object on first render
      initial_volume: 0,
      current_volume: 0,
    },
  });

  // This effect runs when the sample data has loaded, pre-filling the form.
  useEffect(() => {
    if (sample) {
      form.reset({
        ...sample,
        date_collected: parseISO(sample.date_collected),
        date_received: parseISO(sample.date_received),
      });
    }
  }, [sample, form]);

  const { isSubmitting } = form.formState;

  const handleUpdateSample = async (values: FormValues) => {
    const selectedStorage = values.storage_location_id
      ? optionsById.get(values.storage_location_id)
      : undefined;

    const updatedData = {
      ...values,
      date_collected: values.date_collected.toISOString(),
      date_received: values.date_received.toISOString(),
      storage_path_ids: selectedStorage?.pathIds ?? sample?.storage_path_ids ?? [],
      storage_path_names: selectedStorage?.pathNames ?? sample?.storage_path_names ?? [],
    };

    try {
      await updateDoc(sampleRef, updatedData);
      toast({ title: 'Success', description: `${values.sample_id} has been updated.` });
      onOpenChange(false);
    } catch (error) {
      console.error("Update failed:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update sample.' });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Sample</DialogTitle>
          <DialogDescription>
            Modify the details for this sample. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        {isLoading || !sample ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <SampleForm
            form={form}
            onSubmit={handleUpdateSample}
            onCancel={() => onOpenChange(false)}
            isSubmitting={isSubmitting}
            submitButtonText="Save Changes"
            storageOptions={storageOptions}
            isLoadingStorageOptions={isLoadingStorageOptions}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}