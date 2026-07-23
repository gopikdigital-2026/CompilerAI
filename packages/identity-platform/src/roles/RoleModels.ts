import type { OrganizationScopedEntity } from '../types/shared';

export type RoleType = 'SYSTEM' | 'CUSTOM';
export type SystemRoleName = 'PlatformAdmin' | 'OrganizationAdmin' | 'Developer' | 'Operator' | 'Auditor' | 'Viewer';

export interface Role extends OrganizationScopedEntity {
  name: string;
  description: string;
  type: RoleType;
  permissionIds: string[];
  parentRoleId: string | null;
  isSystem: boolean;
}

export const SYSTEM_ROLES: Record<SystemRoleName, string[]> = {
  PlatformAdmin: ['*'],
  OrganizationAdmin: [
    'users:read', 'users:write', 'users:delete',
    'roles:read', 'roles:write',
    'apikeys:read', 'apikeys:write', 'apikeys:delete',
    'sessions:read', 'sessions:delete',
    'audit:read',
    'org:read', 'org:write',
  ],
  Developer: [
    'users:read',
    'roles:read',
    'apikeys:read', 'apikeys:write',
    'sessions:read',
    'audit:read',
  ],
  Operator: [
    'users:read',
    'roles:read',
    'apikeys:read',
    'sessions:read', 'sessions:delete',
    'audit:read',
  ],
  Auditor: [
    'users:read',
    'roles:read',
    'apikeys:read',
    'sessions:read',
    'audit:read',
    'org:read',
  ],
  Viewer: [
    'users:read',
    'roles:read',
    'audit:read',
    'org:read',
  ],
};

export function isSystemRole(name: string): boolean {
  return name in SYSTEM_ROLES;
}

export function isPlatformAdminRole(role: Role): boolean {
  return role.name === 'PlatformAdmin' && role.isSystem;
}

export function isOrgAdminRole(role: Role): boolean {
  return role.name === 'OrganizationAdmin' && role.isSystem;
}

export function isPrivilegedRole(role: Role): boolean {
  return isPlatformAdminRole(role) || isOrgAdminRole(role);
}
