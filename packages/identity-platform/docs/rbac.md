# RBAC (Role-Based Access Control)

## System Roles

Six system roles are seeded per organization via `roleService.seedSystemRoles(orgId)`:

### PlatformAdmin
- Permissions: `['*']` (wildcard — all permissions)
- Can access resources across all organizations
- Only PlatformAdmin can assign PlatformAdmin role

### OrganizationAdmin
- Full management within an organization
- Permissions: `users:read/write/delete`, `roles:read/write`, `apikeys:read/write/delete`, `sessions:read/delete`, `audit:read`, `org:read/write`

### Developer
- Read access + API key creation
- Permissions: `users:read`, `roles:read`, `apikeys:read/write`, `sessions:read`, `audit:read`

### Operator
- Read access + session management
- Permissions: `users:read`, `roles:read`, `apikeys:read`, `sessions:read/delete`, `audit:read`

### Auditor
- Read-only access to everything
- Permissions: `users:read`, `roles:read`, `apikeys:read`, `sessions:read`, `audit:read`, `org:read`

### Viewer
- Minimal read access
- Permissions: `users:read`, `roles:read`, `audit:read`, `org:read`

## Custom Roles

Create custom roles with specific permissions:

```typescript
const role = await platform.roles.create({
  name: 'SeniorDeveloper',
  description: 'Developer with policy access',
  organizationId: org.id,
  permissionIds: ['users:read', 'policies:read'],
  parentRoleId: developerRole.id, // Inherits parent's permissions
});
```

## Role Inheritance

Roles can specify a `parentRoleId`. When resolving permissions, the `RoleService.getPermissionIds()` method recursively includes parent role permissions:

```
SeniorDeveloper (policies:read)
  └── Developer (users:read, roles:read, apikeys:read/write, sessions:read, audit:read)
```

Result: `['policies:read', 'users:read', 'roles:read', 'apikeys:read', 'apikeys:write', 'sessions:read', 'audit:read']`

## Permission Format

Permissions use `resource:action` format:

| Resource | Actions |
|---|---|
| `users` | read, write, delete |
| `roles` | read, write, delete |
| `apikeys` | read, write, delete |
| `sessions` | read, delete |
| `audit` | read |
| `org` | read, write, delete |
| `policies` | read, write, delete |

The `*` wildcard matches any permission.

## PermissionSet

`PermissionSet` is a utility class for permission operations:

```typescript
const set = new PermissionSet(['users:read', 'users:write']);
set.has('users:read');        // true
set.hasAny(['users:delete']);  // false
set.hasAll(['users:read']);    // true
set.union(otherSet);           // combine
set.intersect(otherSet);       // common permissions
```

## System Role Protection

- System roles (`type: 'SYSTEM'`, `isSystem: true`) cannot be modified or deleted
- Only `PlatformAdmin` can create or assign the `PlatformAdmin` role
- `PrivilegeEscalationError` is thrown on violation
