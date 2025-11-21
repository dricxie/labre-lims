'use client';

import { useMemo, useState } from 'react';
import { collection, query } from 'firebase/firestore';
import { PlusCircle } from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/page-header';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { Reagent, Consumable } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { AddReagentDialog } from './_components/add-reagent-dialog';
import { AddConsumableDialog } from './_components/add-consumable-dialog';
import { DataTable } from '@/components/ui/data-table';
import { reagentColumns, consumableColumns } from './columns';
import { Breadcrumbs } from '@/components/breadcrumbs';

export default function InventoryPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const [isReagentDialogOpen, setIsReagentDialogOpen] = useState(false);
  const [isConsumableDialogOpen, setIsConsumableDialogOpen] = useState(false);

  const reagentsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'reagents'));
  }, [firestore, user]);
  const { data: reagents, isLoading: isLoadingReagents } = useCollection<Reagent>(reagentsQuery);

  const consumablesQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'consumables'));
  }, [firestore, user]);
  const { data: consumables, isLoading: isLoadingConsumables } = useCollection<Consumable>(consumablesQuery);

  const handleAddReagent = async (formData: Omit<Reagent, 'id' | 'createdAt' | 'createdBy' | 'labId'>) => {
    if (!user || !user.email) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in.' });
      return;
    }

    try {
      const { createReagentAction } = await import('@/app/actions/lab-inventory');
      const result = await createReagentAction({
        ...formData,
      });

      if (result.success) {
        toast({ title: 'Reagent Added', description: `${formData.name} has been added.` });
        setIsReagentDialogOpen(false);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Error creating reagent:", error);
      toast({
        variant: "destructive",
        title: "Submission Error",
        description: "Failed to create reagent. Please try again.",
      });
    }
  };

  const handleAddConsumable = async (formData: Omit<Consumable, 'id' | 'createdAt' | 'createdBy' | 'expiry_date' | 'labId'>) => {
    if (!user || !user.email) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in.' });
      return;
    }

    try {
      const { createConsumableAction } = await import('@/app/actions/lab-inventory');
      const result = await createConsumableAction({
        ...formData,
        expiry_date: null,
      });

      if (result.success) {
        toast({ title: 'Consumable Added', description: `${formData.name} has been added.` });
        setIsConsumableDialogOpen(false);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Error creating consumable:", error);
      toast({
        variant: "destructive",
        title: "Submission Error",
        description: "Failed to create consumable. Please try again.",
      });
    }
  };

  return (
    <div className="space-y-8">
      <Breadcrumbs />
      <PageHeader
        title="Inventory Management"
        description="Monitor reagents, kits, and consumables."
      />
      <Tabs defaultValue="reagents">
        <TabsList>
          <TabsTrigger value="reagents">Reagents</TabsTrigger>
          <TabsTrigger value="consumables">Consumables</TabsTrigger>
        </TabsList>
        <TabsContent value="reagents">
          <Card>
            <CardHeader className="flex flex-row justify-between items-start">
              <div>
                <CardTitle>Reagents</CardTitle>
                <CardDescription>Track all your reagents, kits, and enzymes.</CardDescription>
              </div>
              <AddReagentDialog
                isOpen={isReagentDialogOpen}
                onOpenChange={setIsReagentDialogOpen}
                onSubmit={handleAddReagent}
              >
                <Button size="sm">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Reagent
                </Button>
              </AddReagentDialog>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={reagentColumns}
                data={reagents || []}
                searchKey="name"
                searchPlaceholder="Search reagents..."
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="consumables">
          <Card>
            <CardHeader className="flex flex-row justify-between items-start">
              <div>
                <CardTitle>Consumables</CardTitle>
                <CardDescription>Track tips, tubes, gloves, and other lab consumables.</CardDescription>
              </div>
              <AddConsumableDialog
                isOpen={isConsumableDialogOpen}
                onOpenChange={setIsConsumableDialogOpen}
                onSubmit={handleAddConsumable}
              >
                <Button size="sm">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Consumable
                </Button>
              </AddConsumableDialog>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={consumableColumns}
                data={consumables || []}
                searchKey="name"
                searchPlaceholder="Search consumables..."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}