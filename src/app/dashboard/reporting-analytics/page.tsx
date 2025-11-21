'use client';
import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Pie,
  PieChart,
  Cell,
} from 'recharts';
import { collection, query } from 'firebase/firestore'; // Removed 'where'
import { format, parseISO } from 'date-fns';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { Sample, Experiment } from '@/lib/types'; // Removed unused Reagent import
import { Skeleton } from '@/components/ui/skeleton';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'];

export default function ReportingAnalyticsPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  // FIX: Removed labId variable and simplified queries.
  const samplesQuery = useMemo(() => {
    if (!user) return null; // Guard against unauthenticated access
    return query(collection(firestore, 'samples'));
  }, [firestore, user]);
  const { data: samples, isLoading: isLoadingSamples } = useCollection<Sample>(samplesQuery);

  const experimentsQuery = useMemo(() => {
    if (!user) return null; // Guard against unauthenticated access
    return query(collection(firestore, 'experiments'));
  }, [firestore, user]);
  const { data: experiments, isLoading: isLoadingExperiments } = useCollection<Experiment>(experimentsQuery);

  const isLoading = isLoadingSamples || isLoadingExperiments;

  // 1. Samples processed over time
  const samplesOverTime = useMemo(() => {
    if (!samples) return [];
    const acc: { [month: string]: { month: string; count: number } } = {};
    samples.forEach(sample => {
      const month = format(parseISO(sample.date_received), 'yyyy-MM');
      if (!acc[month]) {
        acc[month] = { month, count: 0 };
      }
      acc[month].count++;
    });
    return Object.values(acc).sort((a, b) => a.month.localeCompare(b.month));
  }, [samples]);

  // 2. Experiments completed per month
  const experimentsOverTime = useMemo(() => {
    if (!experiments) return [];
    const acc: { [month: string]: { month: string; count: number } } = {};
    experiments
      .filter(exp => exp.status === 'completed' && exp.end_time)
      .forEach(exp => {
        const month = format(parseISO(exp.end_time!), 'yyyy-MM');
        if (!acc[month]) {
          acc[month] = { month, count: 0 };
        }
        acc[month].count++;
      });
    return Object.values(acc).sort((a, b) => a.month.localeCompare(b.month));
  }, [experiments]);

  // 3. Project sample distribution
  const projectSampleDistribution = useMemo(() => {
    if (!samples) return [];
    const acc: { [project: string]: { name: string; value: number } } = {};
    samples.forEach(sample => {
      const project = sample.project_id;
      if (!acc[project]) {
        acc[project] = { name: project, value: 0 };
      }
      acc[project].value++;
    });
    return Object.values(acc);
  }, [samples]);

  const renderLoadingState = () => (
    <div className="grid h-[300px] w-full place-items-center">
      <Skeleton className="h-full w-full" />
    </div>
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Reporting & Analytics"
        description="Visualize lab activities, resource utilization, and performance metrics."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Samples Received Over Time</CardTitle>
            <CardDescription>
              Number of samples registered in the system each month.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? renderLoadingState() : (
                <ResponsiveContainer width="100%" height={300}>
                <LineChart data={samplesOverTime}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }}/>
                    <Legend />
                    <Line
                    type="monotone"
                    dataKey="count"
                    name="Samples Received"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "hsl(var(--primary))" }}
                    />
                </LineChart>
                </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Experiments Completed</CardTitle>
            <CardDescription>
              Number of experiments marked as completed each month.
            </CardDescription>
          </CardHeader>
          <CardContent>
             {isLoading ? renderLoadingState() : (
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={experimentsOverTime}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }} />
                        <Legend />
                        <Line
                        type="monotone"
                        dataKey="count"
                        name="Experiments Completed"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ r: 4, fill: "hsl(var(--primary))" }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
         <Card>
          <CardHeader>
            <CardTitle>Sample Distribution by Project</CardTitle>
            <CardDescription>
              How samples are distributed among different projects.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? renderLoadingState() : (
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                    <Pie
                        data={projectSampleDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                        {projectSampleDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }} />
                    <Legend />
                    </PieChart>
                </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}