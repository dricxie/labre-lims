'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LogOut, PanelLeft, Settings, User } from 'lucide-react';

import { useAuth, useUser } from '@/firebase';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Logo } from './logo';
import { Nav } from './nav';
import { ThemeToggle } from './theme-toggle';

function UserNavSkeleton() {
  return (
    <div className="flex items-center gap-2">
      <Skeleton className="h-9 w-24" />
      <Skeleton className="h-9 w-9 rounded-full" />
    </div>
  );
}

export function Header() {
  const { user, isLoading } = useUser();
  const auth = useAuth();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const getInitials = (displayName?: string | null, email?: string | null) => {
    if (displayName) {
      return displayName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  const closeSheet = () => setIsSheetOpen(false);

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-border/60 bg-background/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="flex items-center gap-2">
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <Button size="icon" variant="ghost" className="shrink-0 lg:hidden">
              <PanelLeft className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="flex flex-col gap-4 p-0 sm:max-w-xs">
            <SheetTitle className="sr-only">Main Menu</SheetTitle>
            <div className="flex h-16 items-center justify-between border-b px-4">
              <Link href="/dashboard" className="flex items-center gap-2" onClick={closeSheet}>
                <Logo className="h-7 w-auto" />
                <span className="text-lg font-semibold">LabRe</span>
              </Link>
              <ThemeToggle />
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              <Nav variant="full" onNavLinkClick={closeSheet} className="px-4" />
            </div>
          </SheetContent>
        </Sheet>

        <Link href="/dashboard" className="flex items-center gap-2">
          <Logo className="h-5 w-auto" />
          <span className="hidden text-lg font-semibold tracking-tight sm:inline">LabRe</span>
        </Link>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <ThemeToggle className="hidden sm:flex" />

        {/* User Navigation: Skeleton while loading, DropdownMenu when loaded */}
        {isLoading ? (
          <UserNavSkeleton />
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                    {getInitials(user?.displayName, user?.email)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user?.displayName || 'User'}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email || 'No email provided'}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/profile">
                  <User className="mr-2 h-4 w-4" />
                  <span>My Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => auth.signOut()}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}