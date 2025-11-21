import { AuthenticatedUser } from '@/lib/types';

export type UserRole = NonNullable<AuthenticatedUser['role']>;

export const ALL_ROLES: UserRole[] = [
  'admin',
  'supervisor',
  'technician',
  'assistant',
  'student',
];

export const ROLE_GROUPS = {
  adminOnly: ['admin'] as UserRole[],
  leadership: ['admin', 'supervisor'] as UserRole[],
  staff: ['admin', 'supervisor', 'technician', 'assistant'] as UserRole[],
  everyone: ALL_ROLES,
};

export type RoutePermission = {
  pattern: string;
  allowedRoles: UserRole[];
};

// Add routes here when they need explicit RBAC restrictions.
export const ROUTE_PERMISSIONS: RoutePermission[] = [
  { pattern: '/dashboard/users', allowedRoles: ROLE_GROUPS.adminOnly },
  { pattern: '/dashboard/audit-log', allowedRoles: ROLE_GROUPS.leadership },
  { pattern: '/dashboard/reporting-analytics', allowedRoles: ROLE_GROUPS.leadership },
  { pattern: '/dashboard/sop-enforcer', allowedRoles: ROLE_GROUPS.staff },
  { pattern: '/dashboard/settings', allowedRoles: ROLE_GROUPS.staff },
  { pattern: '/dashboard/tasks', allowedRoles: ROLE_GROUPS.everyone },
];

export const FEATURE_PERMISSIONS = {
  'tasks:create': ROLE_GROUPS.staff,
  'users:list': ROLE_GROUPS.adminOnly,
  'users:manage': ROLE_GROUPS.adminOnly,
} as const;

export type FeaturePermissionKey = keyof typeof FEATURE_PERMISSIONS;

export function getAllowedRolesForFeature(feature: FeaturePermissionKey) {
  return FEATURE_PERMISSIONS[feature];
}

export function canAccessFeature(
  role: AuthenticatedUser['role'],
  feature: FeaturePermissionKey,
) {
  return roleIsAllowed(role, getAllowedRolesForFeature(feature));
}

export function roleIsAllowed(
  currentRole: AuthenticatedUser['role'],
  allowedRoles?: UserRole[],
) {
  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }
  if (!currentRole) {
    return false;
  }
  return allowedRoles.includes(currentRole);
}

export function findRoutePermission(pathname: string) {
  return ROUTE_PERMISSIONS.find(({ pattern }) =>
    pathname === pattern || pathname.startsWith(`${pattern}/`),
  );
}

export function getAllowedRolesForRoute(pathname: string) {
  return findRoutePermission(pathname)?.allowedRoles;
}
