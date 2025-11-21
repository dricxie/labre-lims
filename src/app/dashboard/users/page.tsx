'use client';
import { useMemo, useState } from 'react';
import { collection, doc, query, where, getDocs } from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/page-header';
import { UserProfile } from '@/lib/types';
import { PlusCircle } from 'lucide-react';
import { useAuth, useCollection, useFirestore, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { EditUserDialog } from './_components/edit-user-dialog';
import { AddUserDialog } from './_components/add-user-dialog';
import { DataTable } from '@/components/ui/data-table';
import { getColumns } from './columns';
import { Breadcrumbs } from '@/components/breadcrumbs';

export default function UsersPage() {
  const firestore = useFirestore();
  const { user: currentUser } = useUser();
  const auth = useAuth();
  const { toast } = useToast();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  const usersQuery = useMemo(() => {
    if (!firestore || !currentUser) return null;
    return query(collection(firestore, 'user_profiles'));
  }, [firestore, currentUser]);

  const activityLogCollection = useMemo(() => collection(firestore, 'activity_log'), [firestore]);
  const { data: users, isLoading } = useCollection<UserProfile>(usersQuery);

  const handleAddUser = async (formData: Omit<UserProfile, 'id' | 'active'>) => {
    if (!currentUser || !currentUser.email) {
      toast({ variant: 'destructive', title: 'Not authorized' });
      return;
    }

    const q = query(collection(firestore, 'user_profiles'), where('email', '==', formData.email));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      toast({ variant: 'destructive', title: 'User Exists', description: `A profile for ${formData.email} already exists.` });
      return;
    }

    const newProfileData: Omit<UserProfile, 'id'> = {
      ...formData,
      active: true,
    }

    await addDocumentNonBlocking(collection(firestore, 'user_profiles'), newProfileData);

    addDocumentNonBlocking(activityLogCollection, {
      action: 'create',
      details: `Pre-provisioned profile for ${formData.email}`,
      target_entity: 'user_profiles',
      target_id: formData.email,
      timestamp: new Date().toISOString(),
      user_email: currentUser.email,
      user_id: currentUser.uid,
    });

    toast({ title: 'Profile Created', description: `A profile for ${formData.email} has been created. They can now sign up.` });
    setIsAddDialogOpen(false);
  };

  const openEditDialog = (user: UserProfile) => {
    setSelectedUser(user);
    setIsEditDialogOpen(true);
  }

  const syncUserRoleClaims = async (targetUid: string, role: UserProfile['role']) => {
    const authUser = auth.currentUser;
    if (!authUser) {
      throw new Error('You must be signed in to change user roles.');
    }

    const idToken = await authUser.getIdToken(true);
    const response = await fetch(`/api/admin/users/${targetUid}/role`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ role }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.error || 'Failed to update custom claims');
    }
  };

  const handleEditUser = async (userId: string, formData: Omit<UserProfile, 'id' | 'email' | 'active'>) => {
    if (!currentUser?.email) return;
    const userDocRef = doc(firestore, 'user_profiles', userId);
    const previousUser = users?.find((user) => user.id === userId) || selectedUser;

    try {
      await updateDocumentNonBlocking(userDocRef, formData);

      if (previousUser && previousUser.role !== formData.role) {
        await syncUserRoleClaims(userId, formData.role);
      }

      addDocumentNonBlocking(activityLogCollection, {
        action: 'update',
        details: `Updated profile for user ID ${userId}`,
        target_entity: 'user_profiles',
        target_id: userId,
        timestamp: new Date().toISOString(),
        user_email: currentUser.email,
        user_id: currentUser.uid,
      });

      toast({
        title: 'User Updated',
        description:
          previousUser && previousUser.role !== formData.role
            ? 'Profile and role were updated. Ask the user to sign out and back in to receive new permissions.'
            : 'User profile has been successfully updated.',
      });
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error('Failed to update user', error);
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description:
          error instanceof Error
            ? error.message
            : 'Unable to update the user. Please try again.',
      });
    }
  };

  const handleToggleUserStatus = async (user: UserProfile) => {
    if (!currentUser?.email || !user.id) return;
    const newStatus = !(user.active ?? true);
    const userDocRef = doc(firestore, 'user_profiles', user.id);

    await updateDocumentNonBlocking(userDocRef, { active: newStatus });

    addDocumentNonBlocking(activityLogCollection, {
      action: 'update',
      details: `${newStatus ? 'Activated' : 'Deactivated'} user ${user.email}`,
      target_entity: 'user_profiles',
      target_id: user.id,
      timestamp: new Date().toISOString(),
      user_email: currentUser.email,
      user_id: currentUser.uid,
    });

    toast({ title: 'Status Updated', description: `${user.name}'s status has been updated to ${newStatus ? 'Active' : 'Inactive'}.` });
  }

  const columns = useMemo(() => getColumns({
    onEdit: openEditDialog,
    onToggleStatus: handleToggleUserStatus,
  }), []);

  return (
    <div className="space-y-8">
      <Breadcrumbs />
      <PageHeader
        title="User Management"
        description="Manage user accounts, roles, and permissions."
      >
        <AddUserDialog
          isOpen={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          onSubmit={handleAddUser}
        >
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Pre-Provision User
          </Button>
        </AddUserDialog>
      </PageHeader>

      <EditUserDialog
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        user={selectedUser}
        onSubmit={handleEditUser}
      />

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>A list of all user accounts in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={users || []}
            searchKey="name"
            searchPlaceholder="Search users..."
          />
        </CardContent>
      </Card>
    </div>
  );
}