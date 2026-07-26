import type { Role, RoleName, RolePermission, ResourceCategory, PermissionAction } from '../models.js';

const ROLE_PERMISSIONS: Record<RoleName, RolePermission[]> = {
  owner: [
    { resource: 'knowledge_graph', actions: ['read', 'write', 'execute', 'delete', 'admin'] },
    { resource: 'enterprise_rag', actions: ['read', 'write', 'execute', 'delete', 'admin'] },
    { resource: 'skills_marketplace', actions: ['read', 'write', 'execute', 'delete', 'admin'] },
    { resource: 'multi_agent', actions: ['read', 'write', 'execute', 'delete', 'admin'] },
    { resource: 'connectors', actions: ['read', 'write', 'execute', 'delete', 'admin'] },
    { resource: 'workflows', actions: ['read', 'write', 'execute', 'delete', 'admin'] },
    { resource: 'settings', actions: ['read', 'write', 'admin'] },
    { resource: 'audit', actions: ['read', 'admin'] },
    { resource: 'secrets', actions: ['read', 'write', 'delete', 'admin'] },
  ],
  admin: [
    { resource: 'knowledge_graph', actions: ['read', 'write', 'execute', 'delete'] },
    { resource: 'enterprise_rag', actions: ['read', 'write', 'execute', 'delete'] },
    { resource: 'skills_marketplace', actions: ['read', 'write', 'execute', 'delete'] },
    { resource: 'multi_agent', actions: ['read', 'write', 'execute', 'delete'] },
    { resource: 'connectors', actions: ['read', 'write', 'execute', 'delete'] },
    { resource: 'workflows', actions: ['read', 'write', 'execute', 'delete'] },
    { resource: 'settings', actions: ['read', 'write'] },
    { resource: 'audit', actions: ['read'] },
    { resource: 'secrets', actions: ['read', 'write'] },
  ],
  manager: [
    { resource: 'knowledge_graph', actions: ['read', 'write', 'execute'] },
    { resource: 'enterprise_rag', actions: ['read', 'write', 'execute'] },
    { resource: 'skills_marketplace', actions: ['read', 'write', 'execute'] },
    { resource: 'multi_agent', actions: ['read', 'write', 'execute'] },
    { resource: 'connectors', actions: ['read', 'execute'] },
    { resource: 'workflows', actions: ['read', 'write', 'execute'] },
    { resource: 'audit', actions: ['read'] },
  ],
  employee: [
    { resource: 'knowledge_graph', actions: ['read', 'execute'] },
    { resource: 'enterprise_rag', actions: ['read', 'execute'] },
    { resource: 'skills_marketplace', actions: ['read', 'execute'] },
    { resource: 'multi_agent', actions: ['read', 'execute'] },
    { resource: 'connectors', actions: ['read'] },
    { resource: 'workflows', actions: ['read', 'execute'] },
  ],
  auditor: [
    { resource: 'knowledge_graph', actions: ['read'] },
    { resource: 'enterprise_rag', actions: ['read'] },
    { resource: 'skills_marketplace', actions: ['read'] },
    { resource: 'multi_agent', actions: ['read'] },
    { resource: 'connectors', actions: ['read'] },
    { resource: 'workflows', actions: ['read'] },
    { resource: 'audit', actions: ['read'] },
    { resource: 'secrets', actions: ['read'] },
  ],
  viewer: [
    { resource: 'knowledge_graph', actions: ['read'] },
    { resource: 'enterprise_rag', actions: ['read'] },
    { resource: 'skills_marketplace', actions: ['read'] },
    { resource: 'multi_agent', actions: ['read'] },
    { resource: 'workflows', actions: ['read'] },
  ],
  ai_agent: [
    { resource: 'knowledge_graph', actions: ['read', 'write', 'execute'] },
    { resource: 'enterprise_rag', actions: ['read', 'execute'] },
    { resource: 'skills_marketplace', actions: ['read', 'execute'] },
    { resource: 'multi_agent', actions: ['read', 'write', 'execute'] },
    { resource: 'connectors', actions: ['read', 'execute'] },
    { resource: 'workflows', actions: ['read', 'write', 'execute'] },
  ],
};

const ROLE_PRIORITY: Record<RoleName, number> = {
  owner: 100,
  admin: 90,
  manager: 70,
  employee: 50,
  auditor: 40,
  viewer: 20,
  ai_agent: 60,
};

export function getRoleDefinition(name: RoleName): Role {
  return {
    name,
    description: getRoleDescription(name),
    permissions: ROLE_PERMISSIONS[name],
    priority: ROLE_PRIORITY[name],
  };
}

function getRoleDescription(name: RoleName): string {
  const descriptions: Record<RoleName, string> = {
    owner: 'Full control over all resources including settings and secrets',
    admin: 'Administrative access to all operational resources',
    manager: 'Manage workflows, agents, and knowledge resources',
    employee: 'Standard operational access for daily work',
    auditor: 'Read-only access to all resources and audit logs',
    viewer: 'Read-only access to primary resources',
    ai_agent: 'AI agent with execution capabilities on operational resources',
  };
  return descriptions[name];
}

export function getAllRoles(): Role[] {
  return (Object.keys(ROLE_PERMISSIONS) as RoleName[]).map(getRoleDefinition);
}

export function getRolePermissions(name: RoleName): RolePermission[] {
  return ROLE_PERMISSIONS[name] ?? [];
}

export function hasRolePermission(
  role: RoleName,
  resource: ResourceCategory,
  action: PermissionAction,
): boolean {
  const perms = ROLE_PERMISSIONS[role] ?? [];
  return perms.some((p) => p.resource === resource && p.actions.includes(action));
}
