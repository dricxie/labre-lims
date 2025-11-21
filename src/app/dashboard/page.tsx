'use client';

import { useMemo, useState } from 'react';
import {
  Activity,
  Beaker,
  FlaskConical,
  PackageMinus,
  Dna,
  ClipboardList,
  NotebookText,
  FolderKanban,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
  AreaChart,
  Area,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from 'recharts';
import { collection, query, where } from 'firebase/firestore';
import { format, formatDistanceToNow, startOfToday, subDays } from 'date-fns';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatCard } from '@/components/stat-card';
import { PageHeader } from '@/components/page-header';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { Sample, Experiment, Reagent, ActivityLog, DnaExtract, Task, Project, Shipment, StorageUnit } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { QuickActions } from './_components/quick-actions';
import { useRouter } from 'next/navigation';

const CHART_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'];


export default function DashboardPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const userRole = user?.role;
  const canViewActivityLog = userRole === 'admin' || userRole === 'supervisor';
  const today = startOfToday();
  const [selectedProjectId, setSelectedProjectId] = useState('all');

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    const name = user?.displayName?.split(' ')[0] ?? 'there';
    if (hour < 12) return `Good morning, ${name}`;
    if (hour < 18) return `Good afternoon, ${name}`;
    return `Good evening, ${name}`;
  }, [user]);

  const samplesQuery = useMemo(() => query(collection(firestore, 'samples')), [firestore]);
  const { data: samples, isLoading: isLoadingSamples } = useCollection<Sample>(samplesQuery);

  const dnaExtractsQuery = useMemo(() => query(collection(firestore, 'dna_extracts')), [firestore]);
  const { data: dnaExtracts, isLoading: isLoadingDnaExtracts } = useCollection<DnaExtract>(dnaExtractsQuery);

  const experimentsQuery = useMemo(() => query(collection(firestore, 'experiments')), [firestore]);
  const { data: experiments, isLoading: isLoadingExperiments } = useCollection<Experiment>(experimentsQuery);

  const reagentsQuery = useMemo(() => query(collection(firestore, 'reagents')), [firestore]);
  const { data: reagents, isLoading: isLoadingReagents } = useCollection<Reagent>(reagentsQuery);

  const activityLogQuery = useMemo(() => {
    if (!canViewActivityLog) return null;
    return query(collection(firestore, 'activity_log'));
  }, [firestore, canViewActivityLog]);
  const { data: activityLog, isLoading: isLoadingActivityLog } = useCollection<ActivityLog>(activityLogQuery);

  const tasksQuery = useMemo(() => query(collection(firestore, 'tasks')), [firestore]);
  const { data: tasks, isLoading: isLoadingTasks } = useCollection<Task>(tasksQuery);

  const projectsQuery = useMemo(() => query(collection(firestore, 'projects')), [firestore]);
  const { data: projects, isLoading: isLoadingProjects } = useCollection<Project>(projectsQuery);

  const shipmentsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'shipments'));
  }, [firestore]);

  const storageUnitsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'storage_units'));
  }, [firestore]);

  const { data: shipments, isLoading: isLoadingShipments } = useCollection<Shipment>(shipmentsQuery);
  const { data: storageUnits, isLoading: isLoadingStorage } = useCollection<StorageUnit>(storageUnitsQuery);

  const isLoadingActivity = canViewActivityLog ? isLoadingActivityLog : false;
  const isLoading =
    isLoadingSamples ||
    isLoadingExperiments ||
    isLoadingReagents ||
    isLoadingActivity ||
    isLoadingDnaExtracts ||
    isLoadingTasks ||
    isLoadingProjects ||
    isLoadingShipments ||
    isLoadingStorage;

  const filteredData = useMemo(() => {
    if (selectedProjectId === 'all') {
      return { samples, dnaExtracts, experiments, tasks };
    }
    const projectSampleIds = new Set(samples?.filter(s => s.project_id === selectedProjectId).map(s => s.id));
    return {
      samples: samples?.filter(s => s.project_id === selectedProjectId),
      dnaExtracts: dnaExtracts?.filter(d => d.project_id === selectedProjectId),
      experiments: experiments?.filter(e => e.project_id === selectedProjectId),
      tasks: tasks?.filter(t => t.sampleIds.some(sid => projectSampleIds.has(sid))),
    };
  }, [selectedProjectId, samples, dnaExtracts, experiments, tasks]);

  const lowStockReagents = useMemo(() => {
    if (!reagents) return 0;
    return reagents.filter(r => r.quantity <= r.min_threshold).length;
  }, [reagents]);

  const pendingTasks = useMemo(() => {
    if (!filteredData.tasks) return 0;
    return filteredData.tasks.filter(t => t.status === 'Pending').length;
  }, [filteredData.tasks]);

  const activeExperiments = useMemo(() => {
    if (!filteredData.experiments) return 0;
    return filteredData.experiments.filter(e => e.status === 'running' || e.status === 'planned').length;
  }, [filteredData.experiments]);

  const tasksByStatus = useMemo(() => {
    const list = filteredData.tasks ?? [];
    const completed = list.filter((t) => t.status === 'Completed').length;
    const inProgress = list.filter((t) => t.status === 'In Progress').length;
    const cancelled = list.filter((t) => t.status === 'Cancelled').length;
    return {
      total: list.length,
      completed,
      inProgress,
      cancelled,
      completionRate: list.length ? Math.round((completed / list.length) * 100) : 0,
    };
  }, [filteredData.tasks]);

  const sampleLifecycle = useMemo(() => {
    const list = filteredData.samples ?? [];
    const total = list.length;
    const usedOrDisposed = list.filter((s) => s.status === 'used' || s.status === 'disposed').length;
    const processing = list.filter((s) => s.status === 'processing').length;
    const extracted = list.filter((s) => s.status === 'extracted').length;
    return {
      total,
      turnoverRate: total ? Math.round((usedOrDisposed / total) * 100) : 0,
      processing,
      extracted,
    };
  }, [filteredData.samples]);

  const dnaQuality = useMemo(() => {
    if (!dnaExtracts || dnaExtracts.length === 0) {
      return { avgYield: 0, avgPurity: 0 };
    }
    const totalYield = dnaExtracts.reduce((acc, extract) => acc + (extract.yield_ng_per_ul || 0), 0);
    const totalPurity = dnaExtracts.reduce((acc, extract) => acc + (extract.a260_a280 || 0), 0);
    return {
      avgYield: totalYield / dnaExtracts.length,
      avgPurity: totalPurity / dnaExtracts.length,
    };
  }, [dnaExtracts]);

  const reagentAlertList = useMemo(() => {
    if (!reagents) return [];
    return reagents
      .filter((r) => r.quantity <= r.min_threshold)
      .sort((a, b) => a.quantity - b.quantity)
      .slice(0, 4);
  }, [reagents]);

  const recentActivity = useMemo(() => {
    if (!activityLog) return [];
    return [...activityLog]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);
  }, [activityLog]);

  const recentExperiments = useMemo(() => {
    if (!filteredData.experiments) return [];
    return [...filteredData.experiments]
      .sort((a, b) => {
        const aTime = a.createdAt && typeof a.createdAt === 'object' && 'toDate' in a.createdAt ? (a.createdAt as any).toDate().getTime() : 0;
        const bTime = b.createdAt && typeof b.createdAt === 'object' && 'toDate' in b.createdAt ? (b.createdAt as any).toDate().getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 5);
  }, [filteredData.experiments]);

  const myTasks = useMemo(() => {
    if (!filteredData.tasks || !user) return [];
    return filteredData.tasks.filter(t => t.assignedTo === user.uid);
  }, [filteredData.tasks, user]);

  const todaysActivities = useMemo(() => {
    if (!canViewActivityLog || !activityLog) return 0;
    const todayTimestamp = today.toISOString();
    // Activity log is not project-specific, so we don't filter it
    return activityLog.filter(log => log.timestamp >= todayTimestamp).length;
  }, [activityLog, today, canViewActivityLog]);

  const sampleStatusData = useMemo(() => {
    if (!filteredData.samples) return [];
    return Object.entries(
      filteredData.samples.reduce((acc, sample) => {
        const status = sample.status.replace('_', ' ');
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([name, count]) => ({ name, count }));
  }, [filteredData.samples]);

  const experimentTypeData = useMemo(() => {
    if (!filteredData.experiments) return [];
    return Object.entries(
      filteredData.experiments.reduce((acc, exp) => {
        acc[exp.type] = (acc[exp.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([name, count]) => ({ name, count }));
  }, [filteredData.experiments]);

  const StatCardSkeleton = () => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-7 w-1/3" />
        <Skeleton className="h-3 w-full mt-1" />
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{greeting}</h1>
          <p className="text-muted-foreground">
            {pendingTasks > 0
              ? `You have ${pendingTasks} pending ${pendingTasks === 1 ? 'task' : 'tasks'} today.`
              : "All caught up! No pending tasks."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            className="relative h-9 w-full justify-start rounded-[0.5rem] bg-background text-sm font-normal text-muted-foreground shadow-none sm:pr-12 md:w-40 lg:w-64"
            onClick={() => { }} // Placeholder for future implementation
          >
            <Search className="mr-2 h-4 w-4" />
            <span className="hidden lg:inline-flex">Search...</span>
            <span className="inline-flex lg:hidden">Search...</span>
            <kbd className="pointer-events-none absolute right-[0.3rem] top-[0.3rem] hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>
          <div className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-muted-foreground" />
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId} disabled={isLoadingProjects}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects?.map(p => (
                  <SelectItem key={p.id} value={p.project_id}>{p.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Badge variant="secondary" className="text-xs">
            {filteredData.samples?.length ?? 0} tracked samples
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-full lg:col-span-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? Array.from({ length: 6 }).map((_, i) => <StatCardSkeleton key={i} />) : (
            <>
              <StatCard
                title="Total Samples"
                value={filteredData.samples?.length ?? 0}
                icon={FlaskConical}
                description={selectedProjectId === 'all' ? "All registered samples" : "Samples in this project"}
              />
              <StatCard
                title="DNA Extracts"
                value={filteredData.dnaExtracts?.length ?? 0}
                icon={Dna}
                description={selectedProjectId === 'all' ? "All DNA extracts" : "Extracts in this project"}
              />
              <StatCard
                title="Active Experiments"
                value={activeExperiments}
                icon={NotebookText}
                description={selectedProjectId === 'all' ? "All active experiments" : "Active experiments in project"}
              />
              <StatCard
                title="Pending Tasks"
                value={pendingTasks}
                icon={ClipboardList}
                description={selectedProjectId === 'all' ? "All pending tasks" : "Pending tasks for project"}
              />
              <StatCard
                title="Low Stock Alerts"
                value={lowStockReagents}
                icon={PackageMinus}
                description="Global reagent alerts"
              />
              <StatCard
                title="Today's Activities"
                value={todaysActivities}
                icon={Activity}
                description="All actions logged today"
              />
            </>
          )}
        </div>
        <div className="col-span-full lg:col-span-2">
          <QuickActions />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="space-y-2">
            <CardTitle>Execution pace</CardTitle>
            <CardDescription>Completed tasks vs total assignments.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm font-medium">
              <span>{tasksByStatus.completed} completed</span>
              <span className="text-muted-foreground">{tasksByStatus.total} total</span>
            </div>
            <Progress value={tasksByStatus.completionRate} />
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <Badge variant="outline">In progress {tasksByStatus.inProgress}</Badge>
              <Badge variant="outline">Cancelled {tasksByStatus.cancelled}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-2">
            <CardTitle>Sample lifecycle</CardTitle>
            <CardDescription>Turnover across processing stages.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm font-medium">
              <span>Turnover rate</span>
              <span>{sampleLifecycle.turnoverRate}%</span>
            </div>
            <Progress value={sampleLifecycle.turnoverRate} />
            <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
              <div className="rounded-lg border border-border/70 p-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Processing</p>
                <p className="text-base font-semibold text-foreground">{sampleLifecycle.processing}</p>
              </div>
              <div className="rounded-lg border border-border/70 p-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Extracted</p>
                <p className="text-base font-semibold text-foreground">{sampleLifecycle.extracted}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-2">
            <CardTitle>DNA quality</CardTitle>
            <CardDescription>Average yield and purity.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm text-muted-foreground">
            <div>
              <p className="text-[11px] uppercase tracking-wide">Avg. yield</p>
              <p className="text-2xl font-semibold text-foreground">{dnaQuality.avgYield.toFixed(1)} ng/µL</p>
              <p>Target ≥ 5 ng/µL</p>
            </div>
            <Separator />
            <div>
              <p className="text-[11px] uppercase tracking-wide">Avg. purity</p>
              <p className="text-2xl font-semibold text-foreground">{dnaQuality.avgPurity.toFixed(2)}</p>
              <p>Ideal window 1.8 – 2.0</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sample Status</CardTitle>
            <CardDescription>
              Distribution of samples across different statuses for the selected scope.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[300px] w-full" /> : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={sampleStatusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} interval={0} tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      borderColor: 'hsl(var(--border))',
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="count"
                    name="No. of Samples"
                    radius={[4, 4, 0, 0]}
                    onClick={(data) => router.push(`/dashboard/samples?status=${data.name.toLowerCase().replace(' ', '_')}`)}
                    cursor="pointer"
                  >
                    {sampleStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Experiment Types</CardTitle>
            <CardDescription>
              Breakdown of experiments by their type for the selected scope.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[300px] w-full" /> : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={experimentTypeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      borderColor: 'hsl(var(--border))',
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="count"
                    name="No. of Experiments"
                    radius={[4, 4, 0, 0]}
                    onClick={(data) => router.push(`/dashboard/experiments?type=${data.name.toLowerCase()}`)}
                    cursor="pointer"
                  >
                    {experimentTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="h-full">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent activity</CardTitle>
              <CardDescription>Latest recorded actions across the lab.</CardDescription>
            </div>
            <Badge variant="outline">{recentActivity.length || 0} entries</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivity.length === 0 && (
              <p className="text-sm text-muted-foreground">No activity captured yet.</p>
            )}
            {recentActivity.map((log) => (
              <div key={log.id ?? log.timestamp} className="flex items-start justify-between gap-4 rounded-xl border border-border/60 p-3">
                <div>
                  <p className="font-medium text-sm text-foreground">{log.action} {log.target_entity}</p>
                  <p className="text-xs text-muted-foreground">{log.user_email}</p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Experiments</CardTitle>
              <CardDescription>Latest experiments in the selected scope.</CardDescription>
            </div>
            <Badge variant="outline">{recentExperiments.length || 0} recent</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentExperiments.length === 0 && (
              <p className="text-sm text-muted-foreground">No experiments found.</p>
            )}
            {recentExperiments.map((exp) => (
              <div key={exp.id} className="flex items-start justify-between gap-4 rounded-xl border border-border/60 p-3 cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => router.push(`/dashboard/experiments/${exp.id}`)}>
                <div className="flex-1">
                  <p className="font-medium text-sm text-foreground">{exp.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={exp.status === 'running' ? 'secondary' : exp.status === 'completed' ? 'default' : 'outline'} className="text-xs capitalize">
                      {exp.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{exp.type}</span>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {exp.experiment_id}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="h-full">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>My Tasks</CardTitle>
              <CardDescription>Tasks assigned specifically to you.</CardDescription>
            </div>
            <Badge variant={myTasks.filter(t => t.status === 'Pending').length > 0 ? 'destructive' : 'secondary'}>
              {myTasks.filter(t => t.status === 'Pending').length} pending
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {myTasks.length === 0 && (
              <p className="text-sm text-muted-foreground">You have no assigned tasks.</p>
            )}
            {myTasks.slice(0, 5).map((task) => (
              <div key={task.id} className="flex items-start justify-between gap-4 rounded-xl border border-border/60 p-3 cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => router.push(`/dashboard/tasks/${task.id}`)}>
                <div className="flex-1">
                  <p className="font-medium text-sm text-foreground">{task.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={task.status === 'Pending' ? 'destructive' : task.status === 'Completed' ? 'default' : 'secondary'} className="text-xs capitalize">
                      {task.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{task.sampleIds.length} samples</span>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {task.type}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Reagent alerts</CardTitle>
              <CardDescription>Consumables nearing their safety thresholds.</CardDescription>
            </div>
            <Badge variant={lowStockReagents > 0 ? 'destructive' : 'secondary'}>
              {lowStockReagents} critical
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {reagentAlertList.length === 0 ? (
              <p className="text-sm text-muted-foreground">Inventory looks healthy.</p>
            ) : (
              reagentAlertList.map((reagent) => {
                const percentage = Math.max(0, Math.round((reagent.quantity / Math.max(reagent.min_threshold, 1)) * 100));
                return (
                  <div key={reagent.id ?? reagent.reagent_id} className="space-y-2 rounded-xl border border-border/60 p-3">
                    <div className="flex items-center justify-between text-sm font-medium text-foreground">
                      <span>{reagent.name}</span>
                      <span>{reagent.quantity} {reagent.unit}</span>
                    </div>
                    <Progress value={Math.min(percentage, 100)} />
                    <p className="text-xs text-muted-foreground">Minimum threshold {reagent.min_threshold} {reagent.unit}</p>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
