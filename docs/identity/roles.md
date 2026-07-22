# Roles (RBAC)

## System Roles

| Role | Permissions | Scope |
|------|------------|-------|
| PLATFORM_ADMIN | All 18 | Platform-wide |
| ORGANIZATION_ADMIN | All 18 | Org-wide |
| WORKFLOW_EDITOR | 4 (workflow CRUD + publish) | Org-wide |
| EXECUTION_OPERATOR | 6 (execution CRUD + telemetry) | Org-wide |
| APPROVER | 3 (approval + execution read) | Org-wide |
| VIEWER | 5 (read-only) | Org-wide |

## Custom Roles

Organizations can create custom roles with any subset of the 18 permissions:

```typescript
const role = await roleRepo.createCustomRole('CUSTOM_EDITOR', orgId, 'Custom editor role', [
  'workflow:create', 'workflow:read', 'workflow:update', 'memory:read'
]);
```

## Role Assignment

Roles are assigned per-organization via `IUserRoleRepository`:

```typescript
await userRoleRepo.assign(userId, orgId, roleId, assignedBy);
```

## Permission Resolution

`RolePermissionResolver` aggregates permissions from all of a user's roles in an organization. System roles use the static `SYSTEM_ROLE_PERMISSIONS` map; custom roles are loaded from the repository.

## Privilege Escalation Prevention

- Only admins (`PLATFORM_ADMIN`, `ORGANIZATION_ADMIN`) can assign roles
- `ORGANIZATION_ADMIN` cannot assign `PLATFORM_ADMIN`
- `PLATFORM_ADMIN` can assign any role
