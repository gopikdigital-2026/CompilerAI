# Security Model

## Authentication

| Method | Header | Use Case |
|--------|--------|----------|
| JWT | `Authorization: Bearer <token>` | Browser sessions |
| API Key | `X-API-Key: <key>` | Programmatic access |
| OAuth2/OIDC | (future) | SSO |

## Authorization Chain

```
Request → Auth Middleware → Principal
    │
    ▼
Authorization Middleware
    ├── 1. Organization membership check
    ├── 2. Role check
    ├── 3. Permission check (18 permissions)
    ├── 4. Resource ownership check
    └── 5. Policy evaluation (suspended org, privilege escalation)
```

## RBAC

- **6 system roles**: PLATFORM_ADMIN, ORGANIZATION_ADMIN, WORKFLOW_EDITOR, EXECUTION_OPERATOR, APPROVER, VIEWER
- **Custom roles**: Org-scoped, any subset of 18 permissions
- **Privilege guard**: ORG_ADMIN cannot assign PLATFORM_ADMIN

## Multitenant Isolation

1. **RLS**: All tables have `organization_id` with RLS policies
2. **Repository layer**: `IOrgScopedRepository<T>` enforces org scoping
3. **Service layer**: Every service checks `organizationId` match
4. **API layer**: OrganizationContextMiddleware sets and validates org context
5. **Runtime layer**: `TenantIsolationError` thrown on cross-org access

## Secret Management

- **Passwords**: PBKDF2-SHA256, 100k iterations, 16-byte salt
- **API Keys**: SHA-256 hash only, plaintext shown once
- **Sessions**: Token hash only, never store plaintext
- **Secrets**: `SecretManager` in infrastructure layer
- **Logs**: `sanitizeLogMessage()` redacts: password, token, secret, credential, apikey, api_key, private_key, authorization

## Input Validation

- **Platform API**: RequestValidators validate all incoming DTOs
- **Runtime**: RuntimeRequestValidator validates execution requests
- **Intelligence**: Each engine validates its own input models
- **Size limits**: Not yet enforced (documented as MEDIUM security finding)

## Brute-Force Protection

- 5 failed login attempts → account locked for 15 minutes
- `LoginAttemptRepository` tracks all attempts
- `AccountLockedError` (HTTP 423) returned for locked accounts
