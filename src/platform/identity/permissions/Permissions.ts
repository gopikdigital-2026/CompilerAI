// ─── Permission catalog ─────────────────────────────────────────────────────────
// 18 permissions covering all platform resources and actions.

export interface Permission {
  name:        string;
  description: string;
  resource:    string;
  action:      string;
}

export const PERMISSIONS: readonly Permission[] = [
  { name: 'execution:create',  description: 'Create new executions',         resource: 'execution', action: 'create' },
  { name: 'execution:read',    description: 'Read execution data',           resource: 'execution', action: 'read' },
  { name: 'execution:update',  description: 'Update execution state',        resource: 'execution', action: 'update' },
  { name: 'execution:cancel',  description: 'Cancel running executions',     resource: 'execution', action: 'cancel' },
  { name: 'execution:resume',  description: 'Resume paused executions',      resource: 'execution', action: 'resume' },
  { name: 'workflow:create',   description: 'Create new workflows',          resource: 'workflow',  action: 'create' },
  { name: 'workflow:update',   description: 'Modify existing workflows',     resource: 'workflow',  action: 'update' },
  { name: 'workflow:publish',  description: 'Publish workflow versions',     resource: 'workflow',  action: 'publish' },
  { name: 'workflow:delete',   description: 'Delete workflows',              resource: 'workflow',  action: 'delete' },
  { name: 'workflow:read',     description: 'Read workflow definitions',     resource: 'workflow',  action: 'read' },
  { name: 'approval:read',     description: 'View approval requests',        resource: 'approval',  action: 'read' },
  { name: 'approval:decide',   description: 'Approve or reject requests',    resource: 'approval',  action: 'decide' },
  { name: 'telemetry:read',    description: 'Read telemetry data',           resource: 'telemetry', action: 'read' },
  { name: 'memory:read',       description: 'Read memory entries',           resource: 'memory',    action: 'read' },
  { name: 'memory:write',      description: 'Write to memory store',         resource: 'memory',    action: 'write' },
  { name: 'organization:manage', description: 'Manage organization settings', resource: 'organization', action: 'manage' },
  { name: 'users:manage',      description: 'Manage organization users',     resource: 'users',     action: 'manage' },
  { name: 'api_keys:manage',   description: 'Create and revoke API keys',    resource: 'api_keys',  action: 'manage' },
] as const;

export const ALL_PERMISSION_NAMES = PERMISSIONS.map(p => p.name) as readonly string[];

export function getPermission(name: string): Permission | undefined {
  return PERMISSIONS.find(p => p.name === name);
}

export function isValidPermission(name: string): boolean {
  return PERMISSIONS.some(p => p.name === name);
}

export function getPermissionsByResource(resource: string): Permission[] {
  return PERMISSIONS.filter(p => p.resource === resource);
}

// ─── Permission set ────────────────────────────────────────────────────────────

export class PermissionSet {
  private readonly perms: Set<string>;

  constructor(permissions: Iterable<string> = []) {
    this.perms = new Set(permissions);
  }

  has(permission: string): boolean {
    return this.perms.has(permission);
  }

  hasAny(permissions: string[]): boolean {
    return permissions.some(p => this.perms.has(p));
  }

  hasAll(permissions: string[]): boolean {
    return permissions.every(p => this.perms.has(p));
  }

  add(permission: string): void {
    this.perms.add(permission);
  }

  delete(permission: string): boolean {
    return this.perms.delete(permission);
  }

  toArray(): string[] {
    return Array.from(this.perms).sort();
  }

  get size(): number {
    return this.perms.size;
  }

  union(other: PermissionSet): PermissionSet {
    return new PermissionSet([...this.perms, ...other.perms]);
  }

  intersect(other: PermissionSet): PermissionSet {
    return new PermissionSet([...this.perms].filter(p => other.perms.has(p)));
  }
}
