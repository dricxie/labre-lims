'use client';

import { useMemo, useState, useEffect } from 'react';
import { Filter, PlusCircle, Search } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { collection, addDoc, serverTimestamp, query, where, writeBatch, doc } from 'firebase/firestore';
import Link from 'next/link';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/page-header';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { Experiment } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { AddExperimentDialog } from './_components/add-experiment-dialog';

const ALL_STATUSES: Experiment['status'][] = ['planned', 'running', 'completed', 'cancelled'];

import { useRouter, useSearchParams } from 'next/navigation';

// ... imports

import { DataTable } from '@/components/ui/data-table';
import { columns } from './columns';
import { Breadcrumbs } from '@/components/breadcrumbs';

// ... imports

export default function ExperimentsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get('status');
  const initialType = searchParams.get('type');

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Firestore queries
  const experimentsQuery = useMemo(() => query(collection(firestore, 'experiments')), [firestore]);
  const { data: experiments, isLoading } = useCollection<Experiment>(experimentsQuery);

  // Handle action=new query parameter from Quick Actions
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'new' && !isDialogOpen) {
      setIsDialogOpen(true);
      // Clean up URL parameter for better UX
      const url = new URL(window.location.href);
      url.searchParams.delete('action');
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams, isDialogOpen]);

  const handleAddExperiment = async (formData: Omit<Experiment, 'id' | 'createdAt' | 'createdBy' | 'experiment_id'>) => {
    if (!user || !user.email) {
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: "You must be logged in to add an experiment.",
      });
      return;
    }

    try {
      const { createExperimentAction } = await import('@/app/actions/experiments');
      const result = await createExperimentAction({
        ...formData,
      });

      if (result.success) {
        toast({
          title: "Experiment Added",
          description: `${formData.title} has been successfully added.`,
        });
        setIsDialogOpen(false);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Error creating experiment:", error);
      toast({
        variant: "destructive",
        title: "Submission Error",
        description: "Failed to create experiment. Please try again.",
      });
    }
  };

  return (
    <div className="space-y-8">
      <Breadcrumbs />
      <PageHeader
        title="Experiment Management"
        description="Plan, execute, and track your lab experiments."
      >
        <AddExperimentDialog isOpen={isDialogOpen} onOpenChange={setIsDialogOpen} onSubmit={handleAddExperiment}>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Experiment
          </Button>
        </AddExperimentDialog>
      </PageHeader>
      <Card>
        <CardHeader>
          <CardTitle>Experiments</CardTitle>
          <CardDescription>
            A list of all experiments in the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={experiments || []}
              searchKey="title"
              searchPlaceholder="Search by Title..."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
