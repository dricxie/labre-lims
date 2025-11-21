'use client';

import { useMemo } from 'react';
import { notFound, useParams } from 'next/navigation';
import { collection, doc, query } from 'firebase/firestore'; // Removed 'where'
import {
  ArrowLeft,
  Calendar,
  FlaskConical,
  FolderKanban,
  NotebookText,
  User,
  ClipboardList,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { useCollection, useDoc, useFirestore, useUser } from '@/firebase';
import { Project, Sample, Experiment, Task } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { StatCard } from '@/components/stat-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getSampleStatusVariant, getTaskStatusVariant } from '@/lib/utils';

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

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const firestore = useFirestore();
  const { user: currentUser } = useUser();

  // FIX: Removed the labId variable and all logic depending on it.
  const projectRef = useMemo(() => doc(firestore, 'projects', projectId as string), [firestore, projectId]);
  const { data: project, isLoading: isLoadingProject } = useDoc<Project>(projectRef);
  
  // FIX: Simplified all queries to remove labId and updated dependencies.
  const samplesQuery = useMemo(() => {
    if (!currentUser) return null;
    return query(collection(firestore, 'samples'));
  }, [firestore, currentUser]);
  const { data: allSamples, isLoading: isLoadingSamples } = useCollection<Sample>(samplesQuery);
  
  const experimentsQuery = useMemo(() => {
    if (!currentUser) return null;
    return query(collection(firestore, 'experiments'));
  }, [firestore, currentUser]);
  const { data: allExperiments, isLoading: isLoadingExperiments } = useCollection<Experiment>(experimentsQuery);

  const tasksQuery = useMemo(() => {
    if (!currentUser) return null;
    return query(collection(firestore, 'tasks'));
  }, [firestore, currentUser]);
  const { data: allTasks, isLoading: isLoadingTasks } = useCollection<Task>(tasksQuery);

  const isLoading = isLoadingProject || isLoadingSamples || isLoadingExperiments || isLoadingTasks;

  const projectData = useMemo(() => {
    if (!project) return null;
    const samples = allSamples?.filter(s => s.project_id === project.project_id) || [];
    const experiments = allExperiments?.filter(e => e.project_id === project.project_id) || [];
    const projectSampleIds = new Set(samples.map(s => s.id));
    const tasks = allTasks?.filter(t => t.sampleIds.some(sid => projectSampleIds.has(sid))) || [];
    return { samples, experiments, tasks };
  }, [project, allSamples, allExperiments, allTasks]);


  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader title={<Skeleton className="h-8 w-64" />} />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!project || !projectData) {
    notFound();
  }

  const { samples, experiments, tasks } = projectData;

  const pendingTasks = tasks.filter(t => t.status === 'Pending').length;

  const sampleStatusChartData = Object.entries(
    samples.reduce((acc, sample) => {
      const status = sample.status.replace('_', ' ');
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, count]) => ({ name, count }));

  const experimentTypeChartData = Object.entries(
      experiments.reduce((acc, exp) => {
          acc[exp.type] = (acc[exp.type] || 0) + 1;
          return acc;
      }, {} as Record<string, number>)
  ).map(([name, count]) => ({ name, count }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <FolderKanban className="h-6 w-6 text-muted-foreground" />
            <span>{project.title}</span>
          </div>
        }
        description={`Dashboard for project ${project.project_id}.`}
      >
        <Button variant="outline" asChild>
          <Link href="/dashboard/projects">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Link>
        </Button>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Samples" value={samples.length} icon={FlaskConical} />
        <StatCard title="Total Experiments" value={experiments.length} icon={NotebookText} />
        <StatCard title="Total Tasks" value={tasks.length} icon={ClipboardList} />
        <StatCard title="Pending Tasks" value={pendingTasks} icon={ClipboardList} />
      </div>

       <Tabs defaultValue="overview">
        <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="samples">Samples ({samples.length})</TabsTrigger>
            <TabsTrigger value="experiments">Experiments ({experiments.length})</TabsTrigger>
            <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Sample Status</CardTitle>
                        <CardDescription>Distribution of samples across different statuses.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={sampleStatusChartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} interval={0} tick={{fontSize: 12}} />
                            <YAxis allowDecimals={false} />
                            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }}/>
                            <Bar dataKey="count" name="No. of Samples" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}/>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Experiment Types</CardTitle>
                        <CardDescription>Breakdown of experiments by their type.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={experimentTypeChartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" tick={{fontSize: 12}} />
                            <YAxis allowDecimals={false} />
                            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }}/>
                            <Bar dataKey="count" name="No. of Experiments" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}/>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </TabsContent>
        <TabsContent value="samples">
             <Card>
                <CardHeader>
                    <CardTitle>Samples in Project</CardTitle>
                    <CardDescription>All samples associated with {project.title}.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Sample ID</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Received On</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {samples.map(sample => (
                                <TableRow key={sample.id}>
                                    <TableCell>{sample.sample_id}</TableCell>
                                    <TableCell className="capitalize">{sample.sample_type}</TableCell>
                                    <TableCell><Badge variant={getSampleStatusVariant(sample.status)}>{sample.status.replace('_', ' ')}</Badge></TableCell>
                                    <TableCell>{format(parseISO(sample.date_received), 'PP')}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" asChild>
                                            <Link href={`/dashboard/samples/${sample.id}`}>View</Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>
         <TabsContent value="experiments">
             <Card>
                <CardHeader>
                    <CardTitle>Experiments in Project</CardTitle>
                    <CardDescription>All experiments associated with {project.title}.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Experiment ID</TableHead>
                                <TableHead>Title</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {experiments.map(exp => (
                                <TableRow key={exp.id}>
                                    <TableCell>{exp.experiment_id}</TableCell>
                                    <TableCell>{exp.title}</TableCell>
                                    <TableCell>{exp.type}</TableCell>
                                    <TableCell><Badge variant={exp.status === 'completed' ? 'default' : 'secondary'}>{exp.status}</Badge></TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" asChild>
                                          <Link href={`/dashboard/experiments/${exp.id}`}>View</Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>
         <TabsContent value="tasks">
             <Card>
                <CardHeader>
                    <CardTitle>Tasks for Project</CardTitle>
                    <CardDescription>All tasks related to samples in {project.title}.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Task Title</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {tasks.map(task => (
                                <TableRow key={task.id}>
                                    <TableCell>{task.title}</TableCell>
                                    <TableCell>{task.type}</TableCell>
                                    <TableCell><Badge variant={getTaskStatusVariant(task.status)}>{task.status}</Badge></TableCell>
                                    <TableCell className="text-right">
                                         <Button variant="ghost" size="sm" asChild>
                                            <Link href={`/dashboard/tasks/${task.id}`}>View</Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}