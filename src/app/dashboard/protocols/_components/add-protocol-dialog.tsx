'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { Protocol } from '@/lib/types';
import { useUser } from '@/firebase'; // FIX: Import the useUser hook

const formSchema = z.object({
  protocol_id: z.string().min(1, 'Protocol ID is required'),
  title: z.string().min(1, 'Title is required'),
  version: z.string().min(1, 'Version is required'),
  content: z.string().min(20, 'Protocol content must be at least 20 characters'),
});

type FormValues = z.infer<typeof formSchema>;

type AddProtocolDialogProps = {
  children: ReactNode;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Omit<Protocol, 'id' | 'createdAt' | 'author' | 'labId'>) => void;
};

export function AddProtocolDialog({
  children,
  isOpen,
  onOpenChange,
  onSubmit,
}: AddProtocolDialogProps) {
  const { user } = useUser(); // FIX: Get the authenticated user
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      protocol_id: 'PROT-',
      version: '1.0',
    },
  });

  const { isSubmitting } = form.formState;

  const handleSubmit = (values: FormValues) => {
    // FIX: Add guard clause and include 'authorId' in the payload
    if (!user) {
        console.error("User not authenticated. Cannot create protocol.");
        return;
    }
    const protocolData = {
        ...values,
        authorId: user.uid,
    }
    onSubmit(protocolData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Protocol (SOP)</DialogTitle>
          <DialogDescription>
            Enter the details for the new protocol. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem className='md:col-span-3'>
                    <FormLabel>Protocol Title</FormLabel>
                    <FormControl><Input placeholder="e.g., Standard PCR Reaction Setup" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="protocol_id"
                render={({ field }) => (
                  <FormItem className='md:col-span-2'>
                    <FormLabel>Protocol ID</FormLabel>
                    <FormControl><Input placeholder="e.g., PROT-PCR-03" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="version"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Version</FormLabel>
                    <FormControl><Input placeholder="e.g., 1.0" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem className='md:col-span-3'>
                    <FormLabel>Protocol Content</FormLabel>
                    <FormControl><Textarea rows={12} placeholder="Enter the full text of the SOP..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Protocol
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}