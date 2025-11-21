import { useMemo } from 'react';
import { collection, query, orderBy } from 'firebase/firestore';

import { useCollection, useFirestore, useUser } from '@/firebase';
import { Project } from '@/lib/types';

type ProjectOption = {
  id: string;
  value: string;
  label: string;
};

export function useProjects() {
  const firestore = useFirestore();
  const { user, isLoading: isLoadingUser } = useUser();

  const projectsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'projects'), orderBy('project_id', 'asc'));
  }, [firestore, user]);

  const {
    data: projects,
    isLoading: isLoadingProjects,
    error,
  } = useCollection<Project>(projectsQuery);

  const projectOptions: ProjectOption[] = useMemo(() => {
    if (!projects) return [];
    return projects.map(project => ({
      id: project.id,
      value: project.project_id,
      label: `${project.title} (${project.project_id})`,
    }));
  }, [projects]);

  const projectsById = useMemo(() => {
    if (!projects) return new Map<string, Project>();
    return new Map(projects.map(project => [project.id, project]));
  }, [projects]);

  const projectsByProjectId = useMemo(() => {
    if (!projects) return new Map<string, Project>();
    return new Map(projects.map(project => [project.project_id, project]));
  }, [projects]);

  return {
    projects,
    projectOptions,
    projectsById,
    projectsByProjectId,
    isLoading: isLoadingUser || isLoadingProjects,
    error,
  };
}
