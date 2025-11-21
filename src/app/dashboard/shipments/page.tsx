'use client';

import { useMemo, useState, useEffect } from 'react';
import { collection, query } from 'firebase/firestore';
import { PlusCircle } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/page-header';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { Shipment } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { AddShipmentDialog } from './_components/add-shipment-dialog';
import { TrackingDetailsDialog } from './_components/tracking-details-dialog';
import { DataTable } from '@/components/ui/data-table';
import { getColumns } from './columns';
import { Breadcrumbs } from '@/components/breadcrumbs';

export default function ShipmentsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const shipmentsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'shipments'));
  }, [firestore, user]);

  const { data: shipments, isLoading } = useCollection<Shipment>(shipmentsQuery);
  const searchParams = useSearchParams();

  // Tracking State
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [trackingData, setTrackingData] = useState<import('@/app/actions/binderbyte').BinderByteData | null>(null);
  const [isTrackingLoading, setIsTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);

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

  const handleTrackShipment = async (courier: string, awb: string) => {
    setIsTrackingOpen(true);
    setIsTrackingLoading(true);
    setTrackingError(null);
    setTrackingData(null);

    try {
      const { trackShipment } = await import('@/app/actions/binderbyte');
      const response = await trackShipment(courier, awb);

      if (response.status === 200 && response.data) {
        setTrackingData(response.data);
      } else {
        setTrackingError(response.message || 'Failed to retrieve tracking information.');
      }
    } catch (error) {
      console.error('Tracking error:', error);
      setTrackingError('An unexpected error occurred.');
    } finally {
      setIsTrackingLoading(false);
    }
  };

  const handleAddShipment = async (formData: Omit<Shipment, 'id' | 'createdAt' | 'createdBy' | 'labId'>) => {
    if (!user || !user.email) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'You must be logged in to create a shipment.',
      });
      return;
    }

    try {
      const { createShipmentAction } = await import('@/app/actions/shipments');
      const result = await createShipmentAction(formData);

      if (result.success) {
        toast({
          title: 'Shipment Created',
          description: `Shipment for ${formData.item_name} has been successfully logged.`,
        });
        setIsDialogOpen(false);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Error creating shipment: ", error);
      toast({
        variant: 'destructive',
        title: 'Submission Error',
        description: 'Could not log the new shipment.',
      });
    }
  };

  const columns = useMemo(() => getColumns({
    onTrack: handleTrackShipment
  }), []);

  return (
    <div className="space-y-8">
      <Breadcrumbs />
      <PageHeader
        title="Shipment & Transfer Log"
        description="Track all items shipped to or from the lab."
      >
        <AddShipmentDialog
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onSubmit={handleAddShipment}
        >
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Shipment
          </Button>
        </AddShipmentDialog>
      </PageHeader>

      <DataTable
        columns={columns}
        data={shipments || []}
        searchKey="item_name"
        searchPlaceholder="Search shipments..."
      />

      {/* Tracking Details Dialog */}
      <TrackingDetailsDialog
        isOpen={isTrackingOpen}
        onOpenChange={setIsTrackingOpen}
        trackingData={trackingData}
        isLoading={isTrackingLoading}
        error={trackingError}
      />
    </div>
  );
}