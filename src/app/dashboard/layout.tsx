'use client';
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { SidebarProvider } from '@/components/ui/sidebar';
import { useUser } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { Logo } from '@/components/logo';
import { Header } from '@/components/header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Info } from 'lucide-react';
import { getAllowedRolesForRoute, roleIsAllowed } from '@/lib/rbac';
import { Nav } from '@/components/nav';



function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const allowedRoles = useMemo(() => getAllowedRolesForRoute(pathname ?? ''), [pathname]);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (!isLoading && !user && !isRedirecting) {
      setIsRedirecting(true);
      router.replace('/login');
    }
  }, [isLoading, user, router, isRedirecting]);

  if (isLoading || (!user && !isRedirecting)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Logo className="h-10 w-auto" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Logo className="h-10 w-auto" />
          <p className="text-sm text-muted-foreground">Redirecting to sign in…</p>
        </div>
      </div>
    );
  }

  if (allowedRoles && !roleIsAllowed(user.role, allowedRoles)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background p-6">
        <Alert variant="destructive" className="max-w-lg">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Access restricted</AlertTitle>
          <AlertDescription>
            You don&apos;t have permission to view this page. Please contact your supervisor or an admin if you believe this is a mistake.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <SidebarProvider>
        <div className="flex min-h-screen flex-col bg-background text-foreground">
          <Header />
          <div className="flex flex-1 min-h-0 bg-muted/5">
            <aside className="group/sidebar sticky top-16 hidden h-[calc(100vh-4rem)] w-[69px] shrink-0 flex-col border-r border-border/60 bg-card/95 shadow-sm transition-[width] duration-300 lg:flex lg:hover:w-64">
              <div className="flex-1 overflow-y-auto px-3 py-0">
                <Nav className="px-0" />
              </div>
            </aside>

            <main className="relative z-10 flex-1 h-[calc(100vh-4rem)] overflow-y-auto bg-muted/5 px-4 py-6 md:px-8">
              <div className="mx-auto w-full max-w-6xl space-y-6">
                {children}
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </AuthGuard>
  );
}
