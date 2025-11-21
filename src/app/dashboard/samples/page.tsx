// src/app/dashboard/samples/page.tsx

'use client';

import { useMemo, useState, useEffect } from 'react';
import {
  Filter,
  PlusCircle,
  Search,
  Download,
  Upload,
  MoreHorizontal,
  Edit,
  Trash2,
  ShieldAlert,
  ArrowUpRight
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { collection, writeBatch, serverTimestamp, doc, query, deleteDoc, increment, getDoc, deleteField } from 'firebase/firestore'; // Added deleteDoc, increment, getDoc, deleteField
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';

// UI Components
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PageHeader } from '@/components/page-header';
import { Skeleton } from '@/components/ui/skeleton';

// App-specific imports
import { useAuth, useCollection, useFirestore, useUser } from '@/firebase'; // Added useAuth
import { Sample, AuthenticatedUser } from '@/lib/types'; // NOTE: Assuming AuthenticatedUser type is defined with a 'role' property
import { useToast } from '@/hooks/use-toast';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { getSampleStatusVariant } from '@/lib/utils';
import { AddSampleDialog } from './_components/add-sample-dialog';
import { ImportSamplesDialog } from './_components/import-samples-dialog';
import { EditSampleDialog } from './_components/edit-sample-dialog';
import { createSampleAction, deleteSampleAction, importSamplesAction } from '@/app/actions/inventory';

const ALL_STATUSES: Sample['status'][] = [
  'received', 'in_storage', 'processing', 'extracted', 'used', 'disposed',
];

const CSV_HEADERS = [
  "sample_id", "project_id", "sample_type", "source", "storage_location_id",
  "collected_by", "date_collected", "date_received", "initial_volume", "current_volume"
];


import { DataTable } from '@/components/ui/data-table';
import { getColumns } from './columns';
import { Breadcrumbs } from '@/components/breadcrumbs';

// ... imports

export default function SamplesPage() {
  const firestore = useFirestore();
  const { user, isLoading: isLoadingUser } = useUser();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get('status');

  // State management
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [editingSampleId, setEditingSampleId] = useState<string | null>(null);

  // Firestore queries
  const samplesQuery = useMemo(() => query(collection(firestore, 'samples')), [firestore]);
  const { data: samples, isLoading: isLoadingSamples } = useCollection<Sample>(samplesQuery);
  const isLoading = isLoadingSamples || isLoadingUser;

  // Handle action=new query parameter from Quick Actions
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'new' && !isAddDialogOpen) {
      setIsAddDialogOpen(true);
      // Clean up URL parameter for better UX
      const url = new URL(window.location.href);
      url.searchParams.delete('action');
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams, isAddDialogOpen]);

  // --- CRUD Handlers ---

  const handleAddSample = async (formData: Omit<Sample, 'id' | 'createdAt' | 'createdBy' | 'barcode'>) => {
    if (!user || !user.email) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in to add a sample.' });
      return;
    }

    try {
      const result = await createSampleAction(
        {
          ...formData,
          barcode: formData.sample_id, // Ensure barcode matches ID for now
        }
      );

      if (result.success) {
        toast({ title: 'Sample Added', description: `${formData.sample_id} has been successfully added.` });
        setIsAddDialogOpen(false);
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error("Error during submission:", error);
      toast({ variant: 'destructive', title: 'Submission Error', description: error.message || 'Could not start the process of adding the sample.' });
    }
  };

  const handleDeleteSample = async (sampleId: string, sampleName: string) => {
    if (!user || !user.email) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in.' });
      return;
    }

    // Prevent race conditions by closing any open edit dialog for the same item
    if (editingSampleId === sampleId) {
      setEditingSampleId(null);
    }

    try {
      const result = await deleteSampleAction(sampleId);
      if (result.success) {
        toast({ title: 'Sample Deleted', description: `${sampleName} has been successfully deleted.` });
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error("Delete failed:", error);
      toast({ variant: 'destructive', title: 'Delete Error', description: error.message || 'Failed to delete sample.' });
    }
  };

  const handleBulkDelete = async (selectedSamples: Sample[]) => {
    if (!user || !user.email) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in.' });
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedSamples.length} samples? This cannot be undone.`)) {
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const sample of selectedSamples) {
      if (!sample.id) continue;
      try {
        const result = await deleteSampleAction(sample.id);
        if (result.success) successCount++;
        else failCount++;
      } catch (e) {
        failCount++;
      }
    }

    if (successCount > 0) {
      toast({ title: 'Bulk Delete Complete', description: `Successfully deleted ${successCount} samples.` });
    }
    if (failCount > 0) {
      toast({ variant: 'destructive', title: 'Bulk Delete Errors', description: `Failed to delete ${failCount} samples.` });
    }
  };

  const handleImportSamples = async (importedSamples: Omit<Sample, 'id' | 'createdAt' | 'createdBy' | 'barcode' | 'status'>[]) => {
    if (!user || !user.email) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in to import.' });
      return;
    }

    try {
      const samplesToImport = importedSamples.map(s => ({
        ...s,
        status: 'received',
        barcode: s.sample_id,
        // createdAt/By will be set by server action
      }));

      const result = await importSamplesAction(samplesToImport);
      if (result.success) {
        toast({ title: 'Import Successful', description: `Successfully imported ${importedSamples.length} samples.` });
        setIsImportDialogOpen(false);
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error("Batch import failed:", error);
      const contextualError = new FirestorePermissionError({
        path: 'samples', operation: 'create',
        requestResourceData: { note: `Batch of ${importedSamples.length} samples.` },
      });
      errorEmitter.emit('permission-error', contextualError);
      toast({ variant: 'destructive', title: 'Import Failed', description: error.message || 'Failed to import samples.' });
    }
  }

  const handleDownloadTemplate = () => {
    const csvContent = CSV_HEADERS.join(',') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', 'samples-template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const handleEditSample = (sampleId: string) => {
    setEditingSampleId(sampleId);
  };

  const columns = useMemo(() => getColumns(user, handleDeleteSample, handleEditSample), [user]);

  return (
    <div className="space-y-8">
      <Breadcrumbs />
      <PageHeader
        title="Sample Management"
        description="Track and manage all your lab samples."
      >
        <div className='flex items-center gap-2'>
          <div className='hidden sm:flex items-center gap-2'>
            <Button variant="outline" onClick={handleDownloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>
            <Button onClick={() => setIsImportDialogOpen(true)} disabled={isLoadingUser}>
              <Upload className="mr-2 h-4 w-4" />
              Import Samples
            </Button>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} disabled={isLoadingUser}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Sample
          </Button>
          <div className="sm:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">More actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>More Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsImportDialogOpen(true)} disabled={isLoadingUser}>
                  <Upload className="mr-2 h-4 w-4" /><span>Import Samples</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownloadTemplate}>
                  <Download className="mr-2 h-4 w-4" /><span>Download Template</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </PageHeader>

      <AddSampleDialog isOpen={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} onSubmit={handleAddSample} />
      <ImportSamplesDialog isOpen={isImportDialogOpen} onOpenChange={setIsImportDialogOpen} onImport={handleImportSamples} />
      {editingSampleId && (
        <EditSampleDialog
          sampleId={editingSampleId}
          isOpen={!!editingSampleId}
          onOpenChange={(open) => {
            if (!open) {
              setEditingSampleId(null);
            }
          }}
        />
      )}
      <Card>
        <CardHeader>
          <CardTitle>Sample Registry</CardTitle>
          <CardDescription>A list of all samples in the system.</CardDescription>
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
              data={samples || []}
              searchKey="sample_id"
              searchPlaceholder="Search by Sample ID..."
              onDelete={handleBulkDelete}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}