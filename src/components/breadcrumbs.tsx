'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { Fragment } from 'react';

export function Breadcrumbs() {
    const pathname = usePathname();
    const segments = pathname.split('/').filter(Boolean);

    // Don't show breadcrumbs on the main dashboard page
    if (pathname === '/dashboard') {
        return null;
    }

    return (
        <nav aria-label="Breadcrumb" className="mb-4 flex items-center text-sm text-muted-foreground">
            <Link
                href="/dashboard"
                className="flex items-center hover:text-foreground transition-colors"
            >
                <Home className="h-4 w-4" />
                <span className="sr-only">Dashboard</span>
            </Link>

            {segments.map((segment, index) => {
                // Skip "dashboard" segment as we already have the Home icon
                if (segment === 'dashboard') return null;

                const href = `/${segments.slice(0, index + 1).join('/')}`;
                const isLast = index === segments.length - 1;
                const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');

                return (
                    <Fragment key={href}>
                        <ChevronRight className="h-4 w-4 mx-1" />
                        {isLast ? (
                            <span className="font-medium text-foreground">{label}</span>
                        ) : (
                            <Link
                                href={href}
                                className="hover:text-foreground transition-colors"
                            >
                                {label}
                            </Link>
                        )}
                    </Fragment>
                );
            })}
        </nav>
    );
}
