'use client';

import { useMemo, useState } from 'react';
import { PlusCircle } from 'lucide-react';
import { collection, addDoc, serverTimestamp, query } from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/page-header';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { Protocol } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { AddProtocolDialog } from './_components/add-protocol-dialog';
import { ViewProtocolDialog } from './_components/view-protocol-dialog';
import { DataTable } from '@/components/ui/data-table';
import { getColumns } from './columns';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';

export default function ProtocolsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedProtocol, setSelectedProtocol] = useState<Protocol | null>(null);

  const protocolsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'protocols'));
  }, [firestore, user]);

  const activityLogCollection = useMemo(() => collection(firestore, 'activity_log'), [firestore]);
  const { data: protocols, isLoading } = useCollection<Protocol>(protocolsQuery);

  const handleAddProtocol = async (formData: Omit<Protocol, 'id' | 'createdAt' | 'author' | 'labId'>) => {
    if (!user || !user.email) {
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: "You must be logged in to add a protocol.",
      });
      return;
    }

    const newProtocol: Omit<Protocol, 'id'> = {
      ...formData,
      createdAt: serverTimestamp(),
      author: user.email,
    };

    try {
      const docRef = await addDoc(collection(firestore, 'protocols'), newProtocol);

      addDocumentNonBlocking(activityLogCollection, {
        action: 'create',
        details: `Created protocol ${newProtocol.title} (v${newProtocol.version})`,
        target_entity: 'protocols',
        target_id: docRef.id,
        timestamp: new Date().toISOString(),
        user_email: user.email,
        user_id: user.uid,
      });

      toast({
        title: "Protocol Added",
        description: `SOP ${formData.title} has been successfully added.`,
      });
      setIsAddDialogOpen(false);
    } catch (error) {
      const contextualError = new FirestorePermissionError({
        path: `protocols/${newProtocol.protocol_id}`,
        operation: 'create',
        requestResourceData: newProtocol,
      });
      errorEmitter.emit('permission-error', contextualError);
    }
  };

  const handleViewProtocol = (protocol: Protocol) => {
    setSelectedProtocol(protocol);
    setIsViewDialogOpen(true);
  }

  const columns = useMemo(() => getColumns({ onView: handleViewProtocol }), []);

  return (
    <div className="space-y-8">
      <Breadcrumbs />
      <PageHeader
        title="Protocol Management"
        description="Manage your lab's Standard Operating Procedures (SOPs)."
      >
        <AddProtocolDialog isOpen={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} onSubmit={handleAddProtocol}>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Protocol
          </Button>
        </AddProtocolDialog>
      </PageHeader>

      <ViewProtocolDialog
        isOpen={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
        protocol={selectedProtocol}
      />

      <Card>
        <CardHeader>
          <CardTitle>SOP Library</CardTitle>
          <CardDescription>
            A list of all protocols and SOPs in the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={protocols || []}
            searchKey="title"
            searchPlaceholder="Search protocols..."
          />
        </CardContent>
      </Card>
    </div>
  );
}