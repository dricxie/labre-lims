'use client';

import { useMemo, useState, useEffect } from 'react';
import { notFound, useParams } from 'next/navigation';
import { collection, doc, query, where } from 'firebase/firestore';
import {
  ArrowLeft,
  Beaker,
  Calendar,
  CheckCircle,
  FlaskConical,
  FolderKanban,
  PlayCircle,
  PlusCircle,
  XCircle,
  Image as ImageIcon,
  Info,
  Badge as BadgeIcon,
  Eye,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { format, parseISO } from 'date-fns';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { useCollection, useDoc, useFirestore, useUser } from '@/firebase';
import { Experiment, ExperimentSample, Result } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardDescription,
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
import { useToast } from '@/hooks/use-toast';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { AddSampleToExperimentDialog } from './_components/add-sample-to-experiment-dialog';
import { LogResultDialog } from './_components/log-result-dialog';
import { Badge } from '@/components/ui/badge';
import { uploadFile, createSignedUrl, STORAGE_BUCKETS } from '@/services/storage-service';
import { Loader2, FileText, Download, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog';


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

// Component to handle file preview and signed URL fetching
function FileAttachmentCard({ attachment, onDelete }: { attachment: any, onDelete: () => void }) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);

  useEffect(() => {
    const fetchUrl = async () => {
      // If the URL is already a full URL (legacy), use it.
      // Otherwise, if it's a path or we want to refresh the signed URL:
      if (attachment.path) {
        try {
          setIsLoadingUrl(true);
          const url = await createSignedUrl(STORAGE_BUCKETS.ATTACHMENTS, attachment.path);
          setSignedUrl(url);
        } catch (error) {
          console.error("Error fetching signed URL:", error);
        } finally {
          setIsLoadingUrl(false);
        }
      } else {
        setSignedUrl(attachment.url);
      }
    };

    fetchUrl();
  }, [attachment]);

  const isImage = attachment.type.startsWith('image/');

  return (
    <Card className="relative group overflow-hidden">
      <CardContent className="p-0">
        <div className="aspect-video w-full bg-muted flex items-center justify-center relative">
          {isImage && signedUrl ? (
            <Image
              src={signedUrl}
              alt={attachment.name}
              fill
              className="object-cover"
            />
          ) : (
            <FileText className="h-12 w-12 text-muted-foreground" />
          )}

          {/* Overlay Actions */}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            {signedUrl && (
              <Button variant="secondary" size="sm" asChild>
                <a href={signedUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </a>
              </Button>
            )}
            {isImage && signedUrl && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="secondary" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl w-full p-0 overflow-hidden bg-transparent border-none shadow-none">
                  <DialogTitle className="sr-only">Image Preview: {attachment.name}</DialogTitle>
                  <div className="relative w-full h-[80vh]">
                    <Image
                      src={signedUrl}
                      alt={attachment.name}
                      fill
                      className="object-contain"
                    />
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        <div className="p-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium text-sm truncate" title={attachment.name}>{attachment.name}</p>
            <p className="text-xs text-muted-foreground truncate">{attachment.type}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}


export default function ExperimentDetailPage() {
  const { experimentId } = useParams();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const [isAddSampleOpen, setIsAddSampleOpen] = useState(false);
  const [isLogResultOpen, setIsLogResultOpen] = useState(false);
  const [selectedExperimentSample, setSelectedExperimentSample] = useState<ExperimentSample | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const experimentRef = useMemo(() => doc(firestore, 'experiments', experimentId as string), [firestore, experimentId]);
  const { data: experiment, isLoading: isLoadingExperiment } = useDoc<Experiment>(experimentRef);

  const experimentSamplesQuery = useMemo(() => experiment ? query(collection(firestore, 'experiment_samples'), where('experiment_id', '==', experiment.experiment_id)) : null, [firestore, experiment]);
  const { data: experimentSamples, isLoading: isLoadingExpSamples } = useCollection<ExperimentSample>(experimentSamplesQuery);

  const resultsQuery = useMemo(() => experiment ? query(collection(firestore, 'results'), where('experiment_id', '==', experiment.experiment_id)) : null, [firestore, experiment]);
  const { data: results, isLoading: isLoadingResults } = useCollection<Result>(resultsQuery);

  const isLoading = isLoadingExperiment || isLoadingExpSamples || isLoadingResults;

  const imageResults = useMemo(() => {
    return results?.filter(r => r.resultType === 'image' && r.fileDataUrl) || [];
  }, [results]);

  const getStatusVariant = (status: Experiment['status']) => {
    switch (status) {
      case 'completed': return 'default';
      case 'running': return 'secondary';
      case 'planned': return 'outline';
      case 'cancelled': return 'destructive';
      default: return 'default';
    }
  };

  const handleStatusUpdate = async (status: Experiment['status']) => {
    if (!user || !user.email) return;
    await updateDocumentNonBlocking(experimentRef, { status });
    await addDocumentNonBlocking(collection(firestore, 'activity_log'), {
      action: 'update',
      details: `Updated experiment ${experiment?.title} status to ${status}`,
      target_entity: 'experiments',
      target_id: experimentId as string,
      timestamp: new Date().toISOString(),
      user_email: user.email,
      user_id: user.uid,
    });
    toast({ title: "Status Updated", description: `Experiment status set to ${status}.` });
  };

  const handleAddSampleToExperiment = async (data: Omit<ExperimentSample, 'id' | 'experiment_id' | 'labId'>) => {
    if (!user || !experiment) return;
    const newDoc: Omit<ExperimentSample, 'id'> = {
      ...data,
      experiment_id: experiment.experiment_id,
    }
    await addDocumentNonBlocking(collection(firestore, 'experiment_samples'), newDoc);
    toast({ title: "Sample Added", description: "Sample has been added to the experiment." });
    setIsAddSampleOpen(false);
  }

  const handleLogResult = async (data: Omit<Result, 'id' | 'experiment_id' | 'result_id' | 'createdAt' | 'createdBy' | 'sampleId' | 'dnaId'>, expSample: ExperimentSample) => {
    if (!user || !user.email || !experiment) return;

    const newResult = {
      ...data,
      experiment_id: experiment.experiment_id,
      sampleId: expSample.sample_id,
      dnaId: expSample.dna_id,
      result_id: `RES-${Date.now()}`,
      createdAt: new Date().toISOString(),
      createdBy: user.email,
    }
    await addDocumentNonBlocking(collection(firestore, 'results'), newResult);
    toast({ title: "Result Logged", description: "Result has been successfully logged." });
    setIsLogResultOpen(false);
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !experiment) return;

    const file = e.target.files[0];
    setIsUploading(true);

    try {
      const path = `experiments/${experiment.experiment_id}/${Date.now()}-${file.name}`;
      await uploadFile(STORAGE_BUCKETS.ATTACHMENTS, path, file);

      // Store path instead of public URL
      const newAttachment = {
        name: file.name,
        path: path,
        type: file.type,
        uploadedAt: new Date().toISOString(),
      };

      const updatedAttachments = [...(experiment.attachments || []), newAttachment];

      await updateDocumentNonBlocking(experimentRef, { attachments: updatedAttachments });

      toast({
        title: "File Uploaded",
        description: "Attachment has been successfully added.",
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Could not upload the file. Please check your connection and Supabase configuration.",
      });
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteAttachment = async (attachmentIndex: number) => {
    if (!experiment || !experiment.attachments) return;

    const updatedAttachments = experiment.attachments.filter((_, i) => i !== attachmentIndex);
    await updateDocumentNonBlocking(experimentRef, { attachments: updatedAttachments });

    toast({
      title: "Attachment Removed",
      description: "The attachment has been removed from this experiment.",
    });
  };

  if (isLoading) {
    return <div className="space-y-6"><PageHeader title={<Skeleton className="h-8 w-64" />} /><Skeleton className="h-96" /></div>;
  }

  if (!experiment) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <Beaker className="h-6 w-6 text-muted-foreground" />
            <span>{experiment.title}</span>
          </div>
        }
        description={`Details for experiment ${experiment.experiment_id}.`}
      >
        <Button variant="outline" asChild>
          <Link href="/dashboard/experiments">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Experiments
          </Link>
        </Button>
      </PageHeader>

      <AddSampleToExperimentDialog
        isOpen={isAddSampleOpen}
        onOpenChange={setIsAddSampleOpen}
        onSubmit={handleAddSampleToExperiment}
      />
      {selectedExperimentSample && (
        <LogResultDialog
          isOpen={isLogResultOpen}
          onOpenChange={setIsLogResultOpen}
          onSubmit={(data) => handleLogResult(data, selectedExperimentSample)}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Experiment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <DetailItem icon={BadgeIcon} label="Status" value={<Badge variant={getStatusVariant(experiment.status)} className="capitalize">{experiment.status}</Badge>} />
              <DetailItem icon={FolderKanban} label="Project" value={experiment.project_id} />
              <DetailItem icon={Calendar} label="Start Time" value={format(parseISO(experiment.start_time), 'PPp')} />
              {experiment.end_time && <DetailItem icon={Calendar} label="End Time" value={format(parseISO(experiment.end_time), 'PPp')} />}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {experiment.status === 'planned' && <Button onClick={() => handleStatusUpdate('running')}><PlayCircle className="mr-2 h-4 w-4" />Start</Button>}
              {experiment.status === 'running' && <Button onClick={() => handleStatusUpdate('completed')}><CheckCircle className="mr-2 h-4 w-4" />Complete</Button>}
              {experiment.status !== 'completed' && experiment.status !== 'cancelled' && <Button variant="destructive" onClick={() => handleStatusUpdate('cancelled')}><XCircle className="mr-2 h-4 w-4" />Cancel</Button>}
              {experiment.status === 'completed' && <p className="text-sm text-muted-foreground">This experiment is complete.</p>}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Tabs defaultValue="samples">
            <div className="flex justify-between items-center mb-4">
              <TabsList>
                <TabsTrigger value="samples">Samples ({experimentSamples?.length || 0})</TabsTrigger>
                <TabsTrigger value="results">Results ({results?.length || 0})</TabsTrigger>
                <TabsTrigger value="attachments">Attachments ({experiment.attachments?.length || 0})</TabsTrigger>
              </TabsList>
              <Button onClick={() => setIsAddSampleOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Sample
              </Button>
            </div>
            <TabsContent value="samples">
              <Card>
                <CardHeader><CardTitle>Samples in Experiment</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sample/Extract ID</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {experimentSamples?.map(expSample => (
                        <TableRow key={expSample.id}>
                          <TableCell className="font-medium">{expSample.sample_id || expSample.dna_id}</TableCell>
                          <TableCell className="capitalize">{expSample.role.replace('_', ' ')}</TableCell>
                          <TableCell>{expSample.notes || '-'}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => {
                              setSelectedExperimentSample(expSample);
                              setIsLogResultOpen(true);
                            }}>Log Result</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {!isLoading && (!experimentSamples || experimentSamples.length === 0) && (
                    <p className="text-center text-sm text-muted-foreground py-10">No samples added to this experiment yet.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="results">
              <Card>
                <CardHeader><CardTitle>Results</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sample/Extract ID</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results?.map(res => (
                        <TableRow key={res.id}>
                          <TableCell>{res.sampleId || res.dnaId}</TableCell>
                          <TableCell>{res.resultType}</TableCell>
                          <TableCell>
                            {res.fileDataUrl ? (
                              <a href={res.fileDataUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline flex items-center gap-1">
                                <ImageIcon className="h-4 w-4" />
                                <span>{res.value}</span>
                              </a>
                            ) : (
                              `${res.value} ${res.unit || ''}`
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {!isLoading && (!results || results.length === 0) && (
                    <p className="text-center text-sm text-muted-foreground py-10">No results logged for this experiment yet.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="attachments">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Attachments</CardTitle>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="file-upload" className="cursor-pointer">
                        <div className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 rounded-md text-sm font-medium transition-colors">
                          {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                          {isUploading ? "Uploading..." : "Upload File"}
                        </div>
                      </Label>
                      <Input
                        id="file-upload"
                        type="file"
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={isUploading}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-medium mb-3 text-muted-foreground">Files & Documents</h3>
                      {experiment.attachments && experiment.attachments.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {experiment.attachments.map((att, index) => (
                            <FileAttachmentCard
                              key={index}
                              attachment={att}
                              onDelete={() => handleDeleteAttachment(index)}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground border border-dashed rounded-md">
                          No general files attached.
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div >
      </div >
    </div >
  );
}