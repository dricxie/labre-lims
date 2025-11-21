'use client';

import { useMemo } from 'react';
import { parseISO } from 'date-fns';
import { collection, query } from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { ActivityLog } from '@/lib/types';
import { DataTable } from '@/components/ui/data-table';
import { columns } from './columns';
import { Breadcrumbs } from '@/components/breadcrumbs';

export default function AuditLogPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const activityLogQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'activity_log'));
  }, [firestore, user]);

  const { data: activityLog, isLoading } =
    useCollection<ActivityLog>(activityLogQuery);

  const sortedLog = useMemo(() => {
    if (!activityLog) return [];
    return [...activityLog].sort(
      (a, b) =>
        parseISO(b.timestamp).getTime() - parseISO(a.timestamp).getTime()
    );
  }, [activityLog]);

  return (
    <div className="space-y-8">
      <Breadcrumbs />
      <PageHeader
        title="Audit Log"
        description="A chronological record of all actions performed in the system."
      />
      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
          <CardDescription>All records are read-only.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={sortedLog}
            searchKey="details"
            searchPlaceholder="Search log details..."
          />
        </CardContent>
      </Card>
    </div>
  );
}