'use client';
import { useMemo, useState } from 'react';
import { collection, query } from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/page-header';
import { Equipment } from '@/lib/types';
import { PlusCircle } from 'lucide-react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { AddEquipmentDialog } from './_components/add-equipment-dialog';
import { useToast } from '@/hooks/use-toast';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { DataTable } from '@/components/ui/data-table';
import { columns } from './columns';
import { Breadcrumbs } from '@/components/breadcrumbs';

export default function EquipmentPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const equipmentQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'equipment'));
  }, [firestore, user]);

  const activityLogCollection = useMemo(() => collection(firestore, 'activity_log'), [firestore]);
  const { data: equipment, isLoading } = useCollection<Equipment>(equipmentQuery);

  const handleAddEquipment = async (formData: Omit<Equipment, 'id'>) => {
    if (!user || !user.email) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'You must be logged in to add equipment.',
      });
      return;
    }

    const newEquipment = {
      ...formData,
    };

    try {
      const docRef = await addDocumentNonBlocking(collection(firestore, 'equipment'), newEquipment);

      if (docRef) {
        addDocumentNonBlocking(activityLogCollection, {
          action: 'create',
          details: `Added equipment ${formData.name}`,
          target_entity: 'equipment',
          target_id: docRef.id,
          timestamp: new Date().toISOString(),
          user_email: user.email,
          user_id: user.uid,
        });
      }

      toast({
        title: 'Equipment Added',
        description: `${formData.name} has been successfully added.`,
      });
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error adding equipment: ", error);
      toast({
        variant: 'destructive',
        title: 'Submission Error',
        description: 'Could not add the new equipment.',
      });
    }
  };

  return (
    <div className="space-y-8">
      <Breadcrumbs />
      <PageHeader
        title="Equipment Management"
        description="Track and manage all your laboratory equipment."
      >
        <AddEquipmentDialog
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onSubmit={handleAddEquipment}
        >
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Equipment
          </Button>
        </AddEquipmentDialog>
      </PageHeader>
      <Card>
        <CardHeader>
          <CardTitle>Equipment List</CardTitle>
          <CardDescription>A list of all equipment registered in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={equipment || []}
            searchKey="name"
            searchPlaceholder="Search equipment..."
          />
        </CardContent>
      </Card>
    </div>
  );
}