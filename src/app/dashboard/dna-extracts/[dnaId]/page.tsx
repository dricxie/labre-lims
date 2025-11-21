'use client';

import { useMemo } from 'react';
import { notFound, useParams } from 'next/navigation';
import { doc } from 'firebase/firestore';
import {
  ArrowLeft,
  Beaker,
  Box,
  Calendar,
  ClipboardList,
  Dna,
  Fingerprint,
  FlaskConical,
  FolderKanban,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react'; // FIX: Import the new QR code component

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { useDoc, useFirestore } from '@/firebase';
import { DnaExtract } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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

export default function DnaExtractDetailPage() {
  const { dnaId } = useParams();
  const firestore = useFirestore();

  const extractRef = useMemo(
    () => (firestore && dnaId ? doc(firestore, 'dna_extracts', dnaId as string) : null),
    [firestore, dnaId]
  );

  const { data: extract, isLoading } = useDoc<DnaExtract>(extractRef);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader title={<Skeleton className="h-8 w-64" />} />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!extract) {
    notFound();
  }

  const getStatusVariant = (status: DnaExtract['status']): 'default' | 'secondary' | 'destructive' => {
      switch(status) {
          case 'stored': return 'default';
          case 'used': return 'secondary';
          case 'disposed': return 'destructive';
          default: return 'default';
      }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <Dna className="h-6 w-6 text-muted-foreground" />
            <span>{extract.dna_id}</span>
          </div>
        }
        description={`Details for DNA extract ${extract.dna_id}.`}
      >
        <Button variant="outline" asChild>
          <Link href="/dashboard/dna-extracts">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Extracts
          </Link>
        </Button>
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Main Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <DetailItem icon={Fingerprint} label="DNA ID" value={extract.dna_id} />
            <DetailItem icon={FlaskConical} label="Parent Sample ID" value={extract.sample_id} />
            <DetailItem icon={FolderKanban} label="Project" value={extract.project_id} />
            <DetailItem
              icon={ClipboardList}
              label="Status"
              value={
                <Badge variant={getStatusVariant(extract.status)} className="capitalize">
                  {extract.status}
                </Badge>
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Extraction & Quality</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <DetailItem icon={User} label="Operator" value={extract.operator} />
            <DetailItem icon={Calendar} label="Date Extracted" value={format(parseISO(extract.date_extracted), 'PPP p')} />
            <DetailItem icon={Beaker} label="Yield" value={`${extract.yield_ng_per_ul} ng/µL`} />
            <DetailItem icon={Beaker} label="Purity (A260/280)" value={extract.a260_a280} />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader><CardTitle>Storage & Barcode</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <DetailItem icon={Box} label="Storage Location" value={extract.storage_location_id} />
             <div className="flex flex-col items-center justify-center pt-4">
                {/* FIX: Replaced the external Image call with the local QRCodeSVG component */}
                <QRCodeSVG
                    value={extract.barcode}
                    size={150}
                    bgColor={"#ffffff"}
                    fgColor={"#000000"}
                    level={"L"}
                    includeMargin={false}
                />
                <p className="mt-2 text-xs text-muted-foreground font-mono">{extract.barcode}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}