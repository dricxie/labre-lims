'use client';

import { usePathname } from 'next/navigation';
import {
  FlaskConical,
  Beaker,
  Boxes,
  ShieldCheck,
  History,
  LayoutDashboard,
  AreaChart,
  Dna,
  Warehouse,
  Wrench,
  FileText,
  Users,
  FolderKanban,
  ClipboardList,
  Truck,
  Info,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef } from 'react';

import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { useUser } from '@/firebase';
import { getAllowedRolesForRoute, roleIsAllowed } from '@/lib/rbac';
import { cn } from '@/lib/utils';

type NavProps = {
  onNavLinkClick?: () => void;
  variant?: 'rail' | 'full';
  className?: string;
};

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/tasks', label: 'Tasks', icon: ClipboardList },
  { href: '/dashboard/samples', label: 'Samples', icon: FlaskConical },
  { href: '/dashboard/dna-extracts', label: 'DNA Extracts', icon: Dna },
  { href: '/dashboard/inventory', label: 'Inventory', icon: Boxes },
  { href: '/dashboard/storage', label: 'Storage', icon: Warehouse },
  { href: '/dashboard/experiments', label: 'Experiments', icon: Beaker },
  { href: '/dashboard/equipment', label: 'Equipment', icon: Wrench },
  { href: '/dashboard/projects', label: 'Projects', icon: FolderKanban },
  { href: '/dashboard/shipments', label: 'Shipments', icon: Truck },
  { href: '/dashboard/protocols', label: 'Protocols', icon: FileText },
  { href: '/dashboard/users', label: 'Users', icon: Users },
  {
    href: '/dashboard/reporting-analytics',
    label: 'Reporting',
    icon: AreaChart,
  },
  { href: '/dashboard/sop-enforcer', label: 'SOP Enforcer', icon: ShieldCheck },
  { href: '/dashboard/audit-log', label: 'Audit Log', icon: History },
  { href: '/dashboard/about', label: 'About', icon: Info },
];

export function Nav({ onNavLinkClick, variant = 'rail', className }: NavProps) {
  const pathname = usePathname();
  const prevPathnameRef = useRef(pathname);
  const { user } = useUser();
  const userRole = user?.role;

  useEffect(() => {
    if (onNavLinkClick && prevPathnameRef.current !== pathname) {
      onNavLinkClick();
    }
    prevPathnameRef.current = pathname;
  }, [pathname, onNavLinkClick]);

  const mainNavLinks = links
    .filter((link) => link.href !== '/dashboard/settings')
    .filter((link) =>
      roleIsAllowed(userRole, getAllowedRolesForRoute(link.href))
    );

  const isRail = variant === 'rail';

  return (
    // Mengubah padding agar lebih rapi
    <SidebarMenu className={cn('gap-1 px-2 py-4', className)}>
      {mainNavLinks.map((link) => {
        const Icon = link.icon;
        const isActive =
          link.href === '/dashboard'
            ? pathname === link.href
            : pathname.startsWith(link.href);

        return (
          <SidebarMenuItem key={link.href}>
            <SidebarMenuButton
              isActive={isActive}
              tooltip={link.label}
              asChild
              className={cn(
                // Base Styles
                'group flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 ease-in-out',

                // Default State (Inactive): Transparent, muted colors
                'bg-transparent text-muted-foreground/60 hover:bg-transparent hover:text-foreground',

                // Active State: Minimalist - just text color change and maybe a subtle glow or very light bg
                'data-[active=true]:bg-primary/5 data-[active=true]:text-primary data-[active=true]:font-semibold',
              )}
            >
              <Link href={link.href} className="flex w-full items-center gap-3 overflow-hidden">
                <Icon className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-105" aria-hidden="true" />
                <span className={cn(
                  "truncate transition-opacity duration-300",
                  isRail ? "opacity-0 group-hover/sidebar:opacity-100" : "opacity-100"
                )}>
                  {link.label}
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}