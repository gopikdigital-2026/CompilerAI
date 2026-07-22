// ─── RBAC roles ────────────────────────────────────────────────────────────────

export type SystemRoleName =
  | 'PLATFORM_ADMIN'
  | 'ORGANIZATION_ADMIN'
  | 'WORKFLOW_EDITOR'
  | 'EXECUTION_OPERATOR'
  | 'APPROVER'
  | 'VIEWER';

export const SYSTEM_ROLE_NAMES: readonly SystemRoleName[] = [
  'PLATFORM_ADMIN',
  'ORGANIZATION_ADMIN',
  'WORKFLOW_EDITOR',
  'EXECUTION_OPERATOR',
  'APPROVER',
  'VIEWER',
];

export interface RoleDefinition {
  roleId:         string;
  name:           string;
  organizationId: string | null;
  description:    string;
  isSystem:       boolean;
  permissions:    string[];
  createdAt:      string;
  updatedAt:      string;
}

export const SYSTEM_ROLE_PERMISSIONS: Record<SystemRoleName, string[]> = {
  PLATFORM_ADMIN: [
    'execution:create', 'execution:read', 'execution:update', 'execution:cancel', 'execution:resume',
    'workflow:create', 'workflow:update', 'workflow:publish', 'workflow:delete', 'workflow:read',
    'approval:read', 'approval:decide', 'telemetry:read', 'memory:read', 'memory:write',
    'organization:manage', 'users:manage', 'api_keys:manage',
  ],
  ORGANIZATION_ADMIN: [
    'execution:create', 'execution:read', 'execution:update', 'execution:cancel', 'execution:resume',
    'workflow:create', 'workflow:update', 'workflow:publish', 'workflow:delete', 'workflow:read',
    'approval:read', 'approval:decide', 'telemetry:read', 'memory:read', 'memory:write',
    'organization:manage', 'users:manage', 'api_keys:manage',
  ],
  WORKFLOW_EDITOR: [
    'workflow:create', 'workflow:update', 'workflow:publish', 'workflow:read',
  ],
  EXECUTION_OPERATOR: [
    'execution:create', 'execution:read', 'execution:update', 'execution:cancel', 'execution:resume',
    'telemetry:read',
  ],
  APPROVER: [
    'approval:read', 'approval:decide', 'execution:read',
  ],
  VIEWER: [
    'execution:read', 'workflow:read', 'approval:read', 'telemetry:read', 'memory:read',
  ],
};

export function getRolePermissions(roleName: string): string[] {
  if (isSystemRole(roleName)) {
    return SYSTEM_ROLE_PERMISSIONS[roleName as SystemRoleName];
  }
  return [];
}

export function isSystemRole(name: string): boolean {
  return SYSTEM_ROLE_NAMES.includes(name as SystemRoleName);
}

export function isPlatformAdminRole(name: string): boolean {
  return name === 'PLATFORM_ADMIN';
}

export function isOrgAdminRole(name: string): boolean {
  return name === 'ORGANIZATION_ADMIN' || name === 'PLATFORM_ADMIN';
}
