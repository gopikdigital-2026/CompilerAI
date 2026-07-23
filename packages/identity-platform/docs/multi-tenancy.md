# Multi-tenancy

## Organization Isolation

Every entity in the system (except system-level permissions) is scoped by `organizationId`. This ensures complete data isolation between tenants.

## Isolation Points

### Users
- `userService.findByEmail()` requires `organizationId` — a user in org A cannot be found by org B
- `userService.findByOrganization()` returns only that org's users
- User creation requires `organizationId` and validates email uniqueness within the org

### Roles
- `roleService.findByOrganization()` returns only that org's roles
- System roles are seeded per organization (each org has its own copies)
- Custom roles are scoped to their organization

### API Keys
- `apiKeyService.findByOrganization()` returns only that org's keys
- API key authentication resolves the key's organization automatically
- The auth context inherits the key creator's organization

### Sessions
- `sessionService.findByOrganization()` returns only that org's sessions
- `sessionService.findByUser()` requires `organizationId` parameter
- Sessions are tied to the organization at creation time

### Policies
- `policyEngine.findByOrganization()` returns only that org's policies
- Policy evaluation is scoped to the organization

### Audit
- `auditService.findByOrganization()` returns only that org's audit entries
- `auditService.findByActor()` requires `organizationId`
- `auditService.findByAction()` requires `organizationId`

## Cross-Tenant Access Prevention

The `AuthorizationService` enforces isolation at the access layer:

```typescript
// Throws CrossTenantError if user's org ≠ target org (unless PlatformAdmin)
await platform.authorization.assertSameOrganization(ctx, targetOrgId);
```

The `checkPermission` method also validates organization scope:
```typescript
// resourceOrgId is checked against ctx.organizationId
const allowed = await platform.authorization.checkPermission(ctx, 'users:read', resourceOrgId);
```

## PlatformAdmin Cross-Tenant Access

The `PlatformAdmin` role has wildcard (`*`) permissions and bypasses cross-tenant checks. This allows platform-level administrators to manage all organizations while regular users are strictly scoped.

## Data Model

```
Organization (org-1)          Organization (org-2)
├── User: admin@org-1         ├── User: admin@org-2
├── Role: OrganizationAdmin   ├── Role: OrganizationAdmin
├── ApiKey: ck_live_xxx       ├── ApiKey: ck_live_yyy
├── Session: sess_xxx         ├── Session: sess_yyy
├── Policy: deny-after-hours  ├── Policy: ip-restriction
└── Audit: [entries...]       └── Audit: [entries...]
```

No data crosses the boundary. Repository queries always filter by `organizationId`.
