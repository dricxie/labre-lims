// src/app/dashboard/samples/[sampleId]/page.tsx

'use client';

import { useMemo, useState } from 'react';
import { notFound, useParams, useRouter } from 'next/navigation';
import { doc, deleteDoc } from 'firebase/firestore'; // REFINEMENT: Import deleteDoc
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';
import {
  ArrowLeft, ArrowUpRight, Beaker, Box, Calendar, ClipboardList, Droplets, Edit,
  Fingerprint, FlaskConical, FolderKanban, ShieldAlert, Trash2, User,
} from 'lucide-react';

// REFINEMENT: Import hooks and components for RBAC and actions
import { useDoc, useFirestore, useUser } from '@/firebase';
import { AuthenticatedUser, Sample } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

// UI Components
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getSampleStatusVariant } from '@/lib/utils';


function DetailItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode; }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-5 w-5 text-muted-foreground mt-0.5" />
      <div className="flex flex-col">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="font-medium">{value || '-'}</span>
      </div>
    </div>
  );
}

export default function SampleDetailPage() {
  const { sampleId } = useParams(); // REFINEMENT: Changed from sampleId to id
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const { user, isLoading: isLoadingUser } = useUser(); // REFINEMENT: Get current user for RBAC
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const sampleRef = useMemo(
    () => (firestore && sampleId ? doc(firestore, 'samples', sampleId as string) : null),
    [firestore, sampleId]
  );

  const { data: sample, isLoading: isLoadingSample } = useDoc<Sample>(sampleRef);


  const isLoading = isLoadingSample || isLoadingUser;

  // --- RBAC Permission Logic ---
  // FIX: Cast the generic 'user' object to your specific 'AuthenticatedUser' type 
  // to safely access the custom 'role' property.
  const typedUser = user as AuthenticatedUser | null;

  const isOwner = typedUser?.uid === sample?.createdById;
  const isSupervisor = typedUser?.role === 'supervisor';
  const isAdmin = typedUser?.role === 'admin';

  const canEdit = isOwner || isSupervisor || isAdmin;
  const canDelete = isSupervisor || isAdmin;
  
  // --- Actions ---
  const handleDeleteSample = async () => {
    if (!sampleRef || !sample) return;
    try {
        await deleteDoc(sampleRef);
        toast({ title: 'Success', description: `Sample ${sample.sample_id} has been deleted.` });
        router.push('/dashboard/samples');
    } catch (error) {
        console.error("Failed to delete sample:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the sample. You may not have permission.' });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader title={<Skeleton className="h-8 w-64" />} />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"><Skeleton className="h-64" /><Skeleton className="h-64" /><Skeleton className="h-64" /></div>
      </div>
    );
  }

  if (!sample) {
    notFound();
  }

  const statusVariant = getSampleStatusVariant(sample.status);

  return (
    <>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>
                    <div className="flex items-center gap-2"><ShieldAlert className="h-6 w-6 text-destructive" />Are you sure?</div>
                </AlertDialogTitle>
                <AlertDialogDescription>This will permanently delete sample <span className="font-semibold">{sample.sample_id}</span>. This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteSample} className="bg-destructive hover:bg-destructive/90">Yes, delete sample</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-6">
        <PageHeader
          title={<div className="flex items-center gap-3"><FlaskConical className="h-6 w-6 text-muted-foreground" /><span>{sample.sample_id}</span></div>}
          description={`Details for sample ${sample.sample_id}.`}
        >
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild><Link href="/dashboard/samples"><ArrowLeft className="mr-2 h-4 w-4" />Back to Samples</Link></Button>
            {/* REFINEMENT: Conditionally render Edit and Delete buttons */}
            {canEdit && <Button asChild><Link href={`/dashboard/samples/${sampleId}/edit`}><Edit className="mr-2 h-4 w-4" />Edit</Link></Button>}
            {canDelete && <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}><Trash2 className="mr-2 h-4 w-4" />Delete</Button>}
          </div>
        </PageHeader>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader><CardTitle>Main Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <DetailItem icon={Fingerprint} label="Sample ID" value={sample.sample_id} />
              <DetailItem icon={FolderKanban} label="Project" value={sample.project_id} />
              <DetailItem icon={Beaker} label="Sample Type" value={<span className="capitalize">{sample.sample_type}</span>} />
              <DetailItem icon={ClipboardList} label="Status" value={<Badge variant={statusVariant} className="capitalize">{sample.status.replace('_', ' ')}</Badge>} />
              <DetailItem icon={Box} label="Source" value={sample.source} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Dates & Provenance</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <DetailItem icon={Calendar} label="Date Collected" value={format(parseISO(sample.date_collected), 'PPP p')} />
              <DetailItem icon={Calendar} label="Date Received" value={format(parseISO(sample.date_received), 'PPP p')} />
              <DetailItem icon={User} label="Collected By" value={sample.collected_by} />
              <DetailItem icon={User} label="Created By" value={sample.createdBy} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Volume & Storage</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <DetailItem icon={Droplets} label="Initial Volume" value={`${sample.initial_volume} mL`} />
              <DetailItem icon={Droplets} label="Current Volume" value={`${sample.current_volume} mL`} />
              <div className="flex items-start gap-3">
                <Box className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex flex-col gap-2">
                  <span className="text-sm text-muted-foreground">Storage Location</span>
                  <div className="flex flex-col gap-2">
                    <span className="font-medium">
                      {sample.storage_path_names?.length
                        ? sample.storage_path_names.join(' › ')
                        : sample.storage_location_id ?? 'Unassigned'}
                    </span>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {sample.position_label && (
                        <Badge variant="outline">Slot {sample.position_label}</Badge>
                      )}
                      {sample.storage_location_id && (
                        <Button variant="link" size="sm" className="h-auto p-0" asChild>
                          <Link href={`/dashboard/storage?focus=${sample.storage_location_id}`} className="inline-flex items-center gap-1">
                            Open storage <ArrowUpRight className="h-3 w-3" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="flex flex-col items-center justify-center p-6">
            <CardTitle className="mb-4">QR Code</CardTitle>
            <QRCodeSVG value={sample.barcode} size={200} includeMargin={true} className="rounded-lg border-4 border-white" />
          </Card>
        </div>
      </div>
    </>
  );
}