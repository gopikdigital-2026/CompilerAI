# Permissions

## Permission Catalog (18 permissions)

| Permission | Resource | Action |
|------------|----------|--------|
| execution:create | execution | create |
| execution:read | execution | read |
| execution:update | execution | update |
| execution:cancel | execution | cancel |
| execution:resume | execution | resume |
| workflow:create | workflow | create |
| workflow:update | workflow | update |
| workflow:publish | workflow | publish |
| workflow:delete | workflow | delete |
| workflow:read | workflow | read |
| approval:read | approval | read |
| approval:decide | approval | decide |
| telemetry:read | telemetry | read |
| memory:read | memory | read |
| memory:write | memory | write |
| organization:manage | organization | manage |
| users:manage | users | manage |
| api_keys:manage | api_keys | manage |

## PermissionSet

Utility class for set operations on permissions:

```typescript
const ps = new PermissionSet(['workflow:create', 'workflow:read']);
ps.has('workflow:create');        // true
ps.hasAny(['workflow:create', 'x']); // true
ps.hasAll(['workflow:create', 'x']); // false
ps.union(other).toArray();
ps.intersect(other).toArray();
```

## Permission Resolution Flow

1. User authenticates → `AuthenticatedPrincipal` with `roles[]`
2. `RolePermissionResolver.resolvePermissions(actorId, orgId)` queries user roles
3. For each role, permissions are collected (system roles use static map, custom roles from repo)
4. Result is cached and attached to the principal
