'use client';

import { useMemo, useState, useEffect } from 'react';
import { PlusCircle } from 'lucide-react';
import { collection, addDoc, serverTimestamp, writeBatch, query, doc } from 'firebase/firestore'; // Removed 'where'
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/page-header';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { Task, UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { AddTaskDialog } from './_components/add-task-dialog';
import { Badge } from '@/components/ui/badge';
import { getTaskStatusVariant } from '@/lib/utils';
import { canAccessFeature } from '@/lib/rbac';

import { DataTable } from '@/components/ui/data-table';
import { getColumns } from './columns';
import { Breadcrumbs } from '@/components/breadcrumbs';

// ... imports

export default function TasksPage() {
  const firestore = useFirestore();
  const { user: currentUser } = useUser();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const userRole = currentUser?.role;
  const canCreateTasks = canAccessFeature(userRole, 'tasks:create');
  const canListUsers = canAccessFeature(userRole, 'users:list');

  // FIX: Simplified the queries and updated the dependency arrays.
  const tasksQuery = useMemo(() => {
    if (!firestore || !currentUser) return null;
    return query(collection(firestore, 'tasks'));
  }, [firestore, currentUser]);

  const usersQuery = useMemo(() => {
    if (!firestore || !currentUser || !canListUsers) return null;
    return query(collection(firestore, 'user_profiles'));
  }, [firestore, currentUser, canListUsers]);

  const { data: tasks, isLoading: isLoadingTasks } = useCollection<Task>(tasksQuery);
  const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile>(usersQuery);

  const isLoading = isLoadingTasks || isLoadingUsers;

  // Handle action=new query parameter from Quick Actions
  const searchParams = useSearchParams();
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

  const userMap = useMemo(() => {
    if (!users || !canListUsers) return new Map<string, string>();
    return new Map(users.map(u => [u.id!, u.name]));
  }, [users, canListUsers]);

  const myTasks = useMemo(() => {
    if (!tasks || !currentUser) return [];
    return tasks.filter(task => task.assignedTo === currentUser.uid);
  }, [tasks, currentUser]);

  const columns = useMemo(() => getColumns(userMap, currentUser?.uid), [userMap, currentUser]);

  const handleAddTask = async (formData: Omit<Task, 'id' | 'createdAt' | 'createdBy' | 'status' | 'taskId' | 'labId'>) => {
    if (!currentUser || !currentUser.email || !canCreateTasks) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: canCreateTasks
          ? 'You must be logged in to create a task.'
          : 'You do not have permission to create tasks.',
      });
      return;
    }

    try {
      const { createTaskAction } = await import('@/app/actions/tasks');
      const result = await createTaskAction({
        title: formData.title,
        description: formData.description,
        type: formData.type,
        priority: formData.priority,
        assignedTo: formData.assignedTo,
        dueDate: formData.dueDate,
        sampleIds: formData.sampleIds,
      });

      if (result.success) {
        toast({
          title: 'Task Created',
          description: `Task "${formData.title}" created and ${formData.sampleIds.length} sample statuses updated to 'processing'.`,
        });
        setIsDialogOpen(false);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Error creating task: ", error);
      toast({
        variant: 'destructive',
        title: 'Submission Error',
        description: 'Could not create the new task or update sample statuses.',
      });
    }
  };

  return (
    <div className="space-y-8">
      <Breadcrumbs />
      <PageHeader
        title="Task Management"
        description="Assign and track tasks for your lab technicians."
      >
        {canCreateTasks && (
          <AddTaskDialog
            isOpen={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            onSubmit={handleAddTask}
          >
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Task
            </Button>
          </AddTaskDialog>
        )}
      </PageHeader>
      <Tabs defaultValue="my-tasks">
        <TabsList>
          <TabsTrigger value="my-tasks">My Tasks</TabsTrigger>
          <TabsTrigger value="all-tasks">All Tasks</TabsTrigger>
        </TabsList>
        <TabsContent value="my-tasks">
          <Card>
            <CardHeader>
              <CardTitle>My Tasks</CardTitle>
              <CardDescription>A list of tasks assigned to you.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <DataTable
                  columns={columns}
                  data={myTasks}
                  searchKey="title"
                  searchPlaceholder="Search my tasks..."
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="all-tasks">
          <Card>
            <CardHeader>
              <CardTitle>All Tasks</CardTitle>
              <CardDescription>A list of all tasks in the system.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <DataTable
                  columns={columns}
                  data={tasks || []}
                  searchKey="title"
                  searchPlaceholder="Search all tasks..."
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}