# Authorization

## Overview

Authorization is performed by `AuthorizationService`, which combines RBAC permissions with policy evaluation to make access decisions.

## Auth Context

Every authorization check starts with an `AuthContext`:

```typescript
interface AuthContext {
  userId: string;
  organizationId: string;
  roleNames: string[];
  permissionIds: string[];
  authMethod: string;
}
```

Built from a user's roles using `authorizationService.buildContext(user)`.

## Permission Check Flow

1. **Cross-tenant check**: If `resourceOrgId` differs from `ctx.organizationId` and user is not `PlatformAdmin`, throws `CrossTenantError`
2. **PlatformAdmin bypass**: If user has `PlatformAdmin` role, all checks pass
3. **RBAC lookup**: Check if user's `PermissionSet` includes the requested permission
4. **Policy evaluation**: If RBAC allows, evaluate organization policies for additional allow/deny

```typescript
const allowed = await platform.authorization.checkPermission(ctx, 'users:read', orgId);
// Or throw on denial:
await platform.authorization.assertPermission(ctx, 'users:delete', orgId);
```

## Cross-Tenant Enforcement

```typescript
await platform.authorization.assertSameOrganization(ctx, targetOrgId);
```

Throws `CrossTenantError` if the context's organization doesn't match the target, unless the user is `PlatformAdmin`.

## Privilege Escalation Prevention

```typescript
await platform.authorization.assertCanAssignRole(ctx, 'PlatformAdmin');
```

Rules:
- Only `PlatformAdmin` can assign `PlatformAdmin` role
- Only `PlatformAdmin` or `OrganizationAdmin` can assign `OrganizationAdmin` role
- System roles cannot be modified or deleted
- `RoleService.create()` validates creator privileges for privileged roles

## Policy Integration

When RBAC allows a permission, the `PolicyEngine` evaluates organization-specific policies:

- Policies are sorted by priority (higher first)
- DENY statements take precedence when matched
- Conditions (eq, ne, in, not_in, gt, lt, regex) filter statement applicability
- If no policy matches, the default is ALLOW

See [RBAC](rbac.md) for role details and [policies](../src/policies/PolicyEngine.ts) for implementation.
