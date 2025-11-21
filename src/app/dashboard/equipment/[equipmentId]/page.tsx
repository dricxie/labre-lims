'use client';

import { useMemo, useState } from 'react';
import { notFound, useParams } from 'next/navigation';
import { collection, doc, query, where } from 'firebase/firestore';
import {
  ArrowLeft,
  Calendar,
  Clock,
  HardHat,
  Info,
  MapPin,
  PlusCircle,
  Wrench,
} from 'lucide-react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { useCollection, useDoc, useFirestore, useUser } from '@/firebase';
import { Equipment, EquipmentUsageLog } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import { LogUsageDialog, type FormValues } from './_components/log-usage-dialog';

function DetailItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
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

export default function EquipmentDetailPage() {
  const { equipmentId } = useParams();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [isLogUsageOpen, setIsLogUsageOpen] = useState(false);

  const equipmentRef = useMemo(
    () =>
      firestore && equipmentId
        ? doc(firestore, 'equipment', equipmentId as string)
        : null,
    [firestore, equipmentId]
  );
  const { data: equipment, isLoading: isLoadingEquipment } =
    useDoc<Equipment>(equipmentRef);

  const usageLogQuery = useMemo(() => {
    if (!firestore || !equipmentId) return null;
    return query(collection(firestore, 'equipment_usage_logs'), where('equipment_id', '==', equipmentId));
  }, [firestore, equipmentId]);

  const { data: usageLogs, isLoading: isLoadingLogs } = useCollection<EquipmentUsageLog>(usageLogQuery);
  
  const filteredLogs = useMemo(() => {
    if (!usageLogs) return [];
    return [...usageLogs].sort((a, b) => parseISO(b.start_time).getTime() - parseISO(a.start_time).getTime());
  }, [usageLogs]);

  const handleLogUsage = async (formData: FormValues) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Not authenticated.' });
      return;
    }

    const newLog: Omit<EquipmentUsageLog, 'id'> = {
      equipment_id: equipmentId as string,
      user_id: user.uid,
      log_id: `LOG-${Date.now()}`,
      experiment_id: formData.experiment_id,
      start_time: formData.start_time.toISOString(),
      end_time: formData.end_time.toISOString(),
      // FIX: Fall back to 'undefined' to match the type definition.
      notes: formData.notes || undefined,
    };
    
    await addDocumentNonBlocking(collection(firestore, 'equipment_usage_logs'), newLog);
    toast({ title: 'Usage Logged', description: `Usage for ${equipment?.name} has been recorded.`});
    setIsLogUsageOpen(false);
  };


  const isLoading = isLoadingEquipment || isLoadingLogs;

  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader title={<Skeleton className="h-8 w-64" />} />
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-1"><CardContent><Skeleton className="h-48" /></CardContent></Card>
          <Card className="md:col-span-2"><CardContent><Skeleton className="h-48" /></CardContent></Card>
        </div>
      </div>
    );
  }

  if (!equipment) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={<div className="flex items-center gap-3"><Wrench className="h-6 w-6 text-muted-foreground" /><span>{equipment.name}</span></div>}
        description={`Details for equipment ${equipment.equipment_id}.`}
      >
        <Button variant="outline" asChild><Link href="/dashboard/equipment"><ArrowLeft className="mr-2 h-4 w-4" />Back to Equipment</Link></Button>
      </PageHeader>
      <LogUsageDialog isOpen={isLogUsageOpen} onOpenChange={setIsLogUsageOpen} onSubmit={handleLogUsage} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader><CardTitle>Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <DetailItem icon={Info} label="Type" value={equipment.type} />
              <DetailItem icon={HardHat} label="Manufacturer" value={`${equipment.manufacturer} ${equipment.model}`} />
              <DetailItem icon={Info} label="Serial Number" value={equipment.serial_number} />
              <DetailItem icon={MapPin} label="Location" value={equipment.location} />
              <DetailItem icon={Calendar} label="Calibration Due" value={equipment.calibration_due_date ? format(parseISO(equipment.calibration_due_date), 'PP') : 'N/A'} />
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-2">
          <Tabs defaultValue="usage">
            <div className="flex justify-between items-center mb-4">
              <TabsList>
                <TabsTrigger value="usage"><Clock className="mr-2 h-4 w-4" />Usage Log</TabsTrigger>
                <TabsTrigger value="maintenance"><Wrench className="mr-2 h-4 w-4" />Maintenance</TabsTrigger>
              </TabsList>
              <Button onClick={() => setIsLogUsageOpen(true)}><PlusCircle className="mr-2 h-4 w-4" />Log Usage</Button>
            </div>
            <TabsContent value="usage">
              <Card>
                <CardHeader><CardTitle>Usage History</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User ID</TableHead>
                        <TableHead>Experiment ID</TableHead>
                        <TableHead>Start Time</TableHead>
                        <TableHead>End Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredLogs.map(log => (
                            <TableRow key={log.id}>
                                <TableCell className="truncate max-w-[100px] font-mono text-xs">{log.user_id}</TableCell>
                                <TableCell>{log.experiment_id}</TableCell>
                                <TableCell>{format(parseISO(log.start_time), 'PPp')}</TableCell>
                                <TableCell>{format(parseISO(log.end_time), 'PPp')}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                  {filteredLogs.length === 0 && <p className="text-center text-sm text-muted-foreground p-4">No usage logged yet.</p>}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="maintenance">
              <Card>
                <CardHeader><CardTitle>Maintenance History</CardTitle></CardHeader>
                <CardContent><p className="text-center text-sm text-muted-foreground p-4">No maintenance records found.</p></CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}