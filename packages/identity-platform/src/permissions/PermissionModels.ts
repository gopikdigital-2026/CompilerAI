import type { BaseEntity } from '../types/shared';

export type PermissionAction = 'read' | 'write' | 'delete' | 'admin' | '*';

export interface Permission extends BaseEntity {
  resource: string;
  action: PermissionAction;
  description: string;
  isSystem: boolean;
}

export function formatPermission(resource: string, action: PermissionAction): string {
  return `${resource}:${action}`;
}

export function parsePermission(perm: string): { resource: string; action: PermissionAction } {
  const idx = perm.indexOf(':');
  if (idx === -1) return { resource: perm, action: '*' };
  return { resource: perm.substring(0, idx), action: perm.substring(idx + 1) as PermissionAction };
}

export function isValidPermission(perm: string): boolean {
  return /^[a-z-]+:(read|write|delete|admin|\*)$/.test(perm) || perm === '*';
}

export const SYSTEM_PERMISSIONS: Array<Omit<Permission, 'id' | 'version' | 'createdAt' | 'updatedAt' | 'metadata'>> = [
  { resource: 'users', action: 'read', description: 'View users', isSystem: true },
  { resource: 'users', action: 'write', description: 'Create and update users', isSystem: true },
  { resource: 'users', action: 'delete', description: 'Delete users', isSystem: true },
  { resource: 'roles', action: 'read', description: 'View roles', isSystem: true },
  { resource: 'roles', action: 'write', description: 'Create and update roles', isSystem: true },
  { resource: 'roles', action: 'delete', description: 'Delete roles', isSystem: true },
  { resource: 'apikeys', action: 'read', description: 'View API keys', isSystem: true },
  { resource: 'apikeys', action: 'write', description: 'Create and update API keys', isSystem: true },
  { resource: 'apikeys', action: 'delete', description: 'Revoke API keys', isSystem: true },
  { resource: 'sessions', action: 'read', description: 'View sessions', isSystem: true },
  { resource: 'sessions', action: 'delete', description: 'Revoke sessions', isSystem: true },
  { resource: 'audit', action: 'read', description: 'View audit log', isSystem: true },
  { resource: 'org', action: 'read', description: 'View organization', isSystem: true },
  { resource: 'org', action: 'write', description: 'Update organization', isSystem: true },
  { resource: 'org', action: 'delete', description: 'Delete organization', isSystem: true },
  { resource: 'policies', action: 'read', description: 'View policies', isSystem: true },
  { resource: 'policies', action: 'write', description: 'Create and update policies', isSystem: true },
  { resource: 'policies', action: 'delete', description: 'Delete policies', isSystem: true },
];

export class PermissionSet {
  private readonly perms: Set<string>;

  constructor(permissions: string[] = []) {
    this.perms = new Set(permissions);
  }

  has(perm: string): boolean {
    return this.perms.has(perm) || this.perms.has('*');
  }

  hasAny(perms: string[]): boolean {
    return perms.some((p) => this.has(p));
  }

  hasAll(perms: string[]): boolean {
    return perms.every((p) => this.has(p));
  }

  union(other: PermissionSet): PermissionSet {
    return new PermissionSet([...this.perms, ...other.perms]);
  }

  intersect(other: PermissionSet): PermissionSet {
    return new PermissionSet([...this.perms].filter((p) => other.perms.has(p)));
  }

  toArray(): string[] {
    return Array.from(this.perms);
  }

  get size(): number {
    return this.perms.size;
  }
}
