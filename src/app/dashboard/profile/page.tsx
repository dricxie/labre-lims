'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Loader2, KeyRound, User, Mail } from 'lucide-react';
import { useMemo } from 'react';
import { doc } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/page-header';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { updateName, changePassword, type State } from './actions';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { UserProfile } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

const initialState: State = { message: null, errors: {} };

function UpdateNameForm({ user, userProfile }: { user: { name?: string; email?: string | null }, userProfile?: UserProfile | null }) {
  const { toast } = useToast();
  const [state, dispatch] = useActionState(updateName, initialState);
  const { pending } = useFormStatus();

  const currentName = userProfile?.name || user.name || '';

  useEffect(() => {
    if (state.message) {
      if (state.errors) {
        toast({
          variant: 'destructive',
          title: 'Update Failed',
          description: state.message,
        });
      } else {
        toast({
          title: 'Success',
          description: state.message,
        });
        // Force a page refresh to show updated name
        setTimeout(() => window.location.reload(), 1000);
      }
    }
  }, [state, toast]);

  return (
    <form action={dispatch}>
      <Card>
        <CardHeader>
          <CardTitle>Display Name</CardTitle>
          <CardDescription>
            This is the name that will be displayed throughout the application.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              name="name"
              defaultValue={currentName}
              placeholder="Enter your full name"
              required
              minLength={2}
            />
            {state.errors?.name && (
              <p className="text-sm text-destructive mt-1">{state.errors.name[0]}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Your name will be visible to other users in the laboratory.
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

function ChangePasswordForm() {
  const { toast } = useToast();
  const [state, dispatch] = useActionState(changePassword, initialState);
  const { pending } = useFormStatus();
  
  useEffect(() => {
    if (state.message) {
      if (state.errors) {
        toast({
          variant: 'destructive',
          title: 'Update Failed',
          description: state.message,
        });
      } else {
        toast({
          title: 'Success',
          description: state.message,
        });
      }
    }
  }, [state, toast]);

  return (
    <form action={dispatch}>
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>
            Enter a new password for your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input id="newPassword" name="newPassword" type="password" required />
             {state.errors?.newPassword && (
                <p className="text-sm text-destructive">{state.errors.newPassword.join(', ')}</p>
             )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input id="confirmPassword" name="confirmPassword" type="password" required />
             {state.errors?.confirmPassword && (
                <p className="text-sm text-destructive">{state.errors.confirmPassword[0]}</p>
             )}
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={pending}>
             {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Change Password
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

export default function ProfilePage() {
  const { user, isLoading: isLoadingAuth } = useUser();
  const firestore = useFirestore();
  
  // Fetch user profile from Firestore
  const userProfileRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'user_profiles', user.uid);
  }, [firestore, user]);
  
  const { data: userProfile, isLoading: isLoadingProfile } = useDoc<UserProfile>(userProfileRef);
  const isLoading = isLoadingAuth || isLoadingProfile;

  // Get display values with fallbacks
  const displayName = userProfile?.name || user?.displayName || user?.email?.split('@')[0] || 'User';
  const displayRole = userProfile?.role || user?.role || 'student';
  const displayEmail = user?.email || userProfile?.email || 'No email';

  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader title="My Profile" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-64" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Could not load user information. Please try signing in again.</AlertDescription>
      </Alert>
    );
  }

  const getRoleBadgeVariant = (role?: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'supervisor':
        return 'default';
      case 'technician':
        return 'secondary';
      case 'assistant':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="My Profile"
        description="Manage your account settings and personal information."
      />
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your account details and role</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-primary/10 p-3">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground mb-1">Name</p>
                <p className="font-medium text-lg truncate">{displayName}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-primary/10 p-3">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground mb-1">Email</p>
                <p className="font-medium truncate">{displayEmail}</p>
                {user.emailVerified ? (
                  <Badge variant="outline" className="mt-1 text-xs">
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="mt-1 text-xs">
                    Unverified
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-primary/10 p-3">
                <KeyRound className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground mb-1">Role</p>
                <Badge variant={getRoleBadgeVariant(displayRole)} className="capitalize">
                  {displayRole}
                </Badge>
              </div>
            </div>
            {userProfile?.active === false && (
              <Alert variant="destructive">
                <AlertTitle>Account Inactive</AlertTitle>
                <AlertDescription>
                  Your account has been deactivated. Please contact an administrator.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
        <div className="lg:col-span-2 space-y-8">
          <UpdateNameForm user={user} userProfile={userProfile} />
          <ChangePasswordForm />
        </div>
      </div>
    </div>
  );
}
