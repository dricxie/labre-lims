'use client';

import { useState } from 'react';
import { collection, getDocs, Timestamp } from 'firebase/firestore';
import Papa from 'papaparse';
import {
  Download,
  Loader2,
  FlaskConical,
  Dna,
  Beaker,
  Boxes,
  Package,
  FileText,
  FolderKanban,
  Wrench,
  History,
  Users,
  ClipboardList,
  Truck,
  Clock,
} from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

type CollectionKey =
  | 'samples'
  | 'dna_extracts'
  | 'experiments'
  | 'reagents'
  | 'consumables'
  | 'protocols'
  | 'projects'
  | 'equipment'
  | 'equipment_usage_logs'
  | 'activity_log'
  | 'user_profiles'
  | 'tasks'
  | 'shipments';

const EXPORTABLE_COLLECTIONS: {
  key: CollectionKey;
  name: string;
  description: string;
  icon: React.ElementType;
}[] = [
  { key: 'samples', name: 'Samples', description: 'Export all registered samples.', icon: FlaskConical },
  { key: 'dna_extracts', name: 'DNA Extracts', description: 'Export all DNA extract records.', icon: Dna },
  { key: 'experiments', name: 'Experiments', description: 'Export all experiment records.', icon: Beaker },
  { key: 'reagents', name: 'Reagents', description: 'Export your reagent inventory.', icon: Boxes },
  { key: 'consumables', name: 'Consumables', description: 'Export your consumable inventory.', icon: Package },
  { key: 'protocols', name: 'Protocols', description: 'Export all SOPs and protocols.', icon: FileText },
  { key: 'projects', name: 'Projects', description: 'Export all project details.', icon: FolderKanban },
  { key: 'equipment', name: 'Equipment', description: 'Export your equipment list.', icon: Wrench },
  { key: 'equipment_usage_logs', name: 'Equipment Usage', description: 'Export equipment usage history.', icon: Clock },
  { key: 'tasks', name: 'Tasks', description: 'Export all assigned tasks.', icon: ClipboardList },
  { key: 'shipments', name: 'Shipments', description: 'Export all shipment logs.', icon: Truck },
  { key: 'user_profiles', name: 'User Profiles', description: 'Export all user profile data.', icon: Users },
  { key: 'activity_log', name: 'Audit Log', description: 'Export the complete activity log.', icon: History },
];

export default function SettingsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [loadingStates, setLoadingStates] = useState<
    Record<CollectionKey, boolean>
  >(
    EXPORTABLE_COLLECTIONS.reduce(
      (acc, { key }) => ({ ...acc, [key]: false }),
      {} as Record<CollectionKey, boolean>
    )
  );

  const handleExport = async (
    collectionKey: CollectionKey,
    fileName: string
  ) => {
    if (!firestore) {
      toast({
        variant: 'destructive',
        title: 'Firestore Not Available',
        description: 'Cannot connect to the database. Please try again later.',
      });
      return;
    }

    setLoadingStates((prev) => ({ ...prev, [collectionKey]: true }));
    try {
      const collectionRef = collection(firestore, collectionKey);
      const snapshot = await getDocs(collectionRef);

      if (snapshot.empty) {
        toast({
          variant: 'default',
          title: 'No Data to Export',
          description: `The "${collectionKey}" collection is empty.`,
        });
        return;
      }

      const data: Record<string, any>[] = [];
      snapshot.docs.forEach((doc) => {
        const docData = doc.data();
        const sanitizedData: Record<string, any> = { id: doc.id };

        for (const key in docData) {
          const value = docData[key];
          if (value instanceof Timestamp) {
            sanitizedData[key] = value.toDate().toISOString();
          } else if (
            value &&
            typeof value === 'object' &&
            'seconds' in value &&
            'nanoseconds' in value
          ) {
            try {
              const date = new Timestamp(
                value.seconds,
                value.nanoseconds
              ).toDate();
              sanitizedData[key] = date.toISOString();
            } catch (e) {
              sanitizedData[key] = 'Invalid Date';
            }
          } else {
            sanitizedData[key] = value;
          }
        }
        data.push(sanitizedData);
      });

      const csv = Papa.unparse(data);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${fileName}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export Successful',
        description: `Successfully exported ${data.length} records from "${collectionKey}".`,
      });
    } catch (error) {
      console.error(`Failed to export ${collectionKey}:`, error);
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: `An error occurred while exporting ${collectionKey}. Check the console for details.`,
      });
    } finally {
      setLoadingStates((prev) => ({ ...prev, [collectionKey]: false }));
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings & Data Management"
        description="Manage application settings and export data for backups or external analysis."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {EXPORTABLE_COLLECTIONS.map(({ key, name, description, icon: Icon }) => (
          <Card key={key}>
            <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                <Icon className="h-8 w-8 text-muted-foreground" />
                <div className="grid gap-1">
                    <CardTitle>{name}</CardTitle>
                    <CardDescription>
                        {description}
                    </CardDescription>
                </div>
            </CardHeader>
            <CardFooter>
              <Button
                className="w-full"
                variant="outline"
                size="sm"
                onClick={() => handleExport(key, `${key}-export`)}
                disabled={loadingStates[key]}
              >
                {loadingStates[key] ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Export CSV
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
