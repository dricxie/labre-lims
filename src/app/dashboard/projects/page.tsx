'use client';

import { useMemo, useState } from 'react';
import { collection, addDoc, serverTimestamp, query } from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/page-header';
import { Project } from '@/lib/types';
import { PlusCircle } from 'lucide-react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { AddProjectDialog } from './_components/add-project-dialog';
import { useToast } from '@/hooks/use-toast';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { DataTable } from '@/components/ui/data-table';
import { columns } from './columns';
import { Breadcrumbs } from '@/components/breadcrumbs';

export default function ProjectsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const projectsQuery = useMemo(() => query(collection(firestore, 'projects')), [firestore]);

  const activityLogCollection = useMemo(() => collection(firestore, 'activity_log'), [firestore]);
  const { data: projects, isLoading } = useCollection<Project>(projectsQuery);

  const handleAddProject = async (formData: Omit<Project, 'id'>) => {
    if (!user || !user.email) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'You must be logged in to create a project.',
      });
      return;
    }

    const newProject = {
      ...formData,
      createdById: user.uid,
    }

    try {
      const docRef = await addDocumentNonBlocking(collection(firestore, 'projects'), newProject);

      if (docRef) {
        addDocumentNonBlocking(activityLogCollection, {
          action: 'create',
          details: `Created project ${formData.title}`,
          target_entity: 'projects',
          target_id: docRef.id,
          timestamp: new Date().toISOString(),
          user_email: user.email,
          user_id: user.uid,
        });
      }

      toast({
        title: 'Project Created',
        description: `${formData.title} has been successfully created.`,
      });
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error creating project: ", error);
      toast({
        variant: 'destructive',
        title: 'Submission Error',
        description: 'Could not create the new project.',
      });
    }
  };

  return (
    <div className="space-y-8">
      <Breadcrumbs />
      <PageHeader
        title="Project Management"
        description="Oversee all research projects and their details."
      >
        <AddProjectDialog
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onSubmit={handleAddProject}
        >
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Project
          </Button>
        </AddProjectDialog>
      </PageHeader>
      <Card>
        <CardHeader>
          <CardTitle>Projects</CardTitle>
          <CardDescription>A list of all projects registered in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={projects || []}
            searchKey="title"
            searchPlaceholder="Search projects..."
          />
        </CardContent>
      </Card>
    </div>
  );
}
