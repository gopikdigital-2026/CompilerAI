# Authorization

## RBAC Model

```
User ──→ UserRole ──→ Role ──→ RolePermission ──→ Permission
         (org-scoped)  (system or custom)    (18 catalog)
```

## AuthorizationService

The central authorization service validates five checks:

1. **Organization membership** — Principal's org matches resource org
2. **Role** — User has an appropriate role in the organization
3. **Permissions** — User's permissions include the required permission
4. **Resource ownership** — Resource belongs to the principal's organization
5. **Policies** — Custom policy rules (e.g., suspended org, privilege escalation)

## Methods

- `checkAccess(principal, permission, resourceOrgId?)` → boolean
- `checkAccessAll(principal, permissions[], resourceOrgId?)` → boolean
- `assertAccess(principal, permission, resourceOrgId?)` → throws on failure

## PrivilegeGuard

Prevents privilege escalation:
- Non-admins cannot assign roles
- `ORGANIZATION_ADMIN` cannot assign `PLATFORM_ADMIN`
- Users cannot manage users with higher roles

## Policy Evaluator

`DefaultPolicyEvaluator` checks cross-organization access. Custom evaluators can add rules for:
- Suspended organizations
- Time-based access
- IP restrictions
- Resource-specific policies

## PLATFORM_ADMIN Bypass

`PLATFORM_ADMIN` role bypasses all organization and permission checks. This is intentional for platform-level operations.
