# Security Guide — CompilerAI Enterprise v1.0 RC1

This guide documents the security architecture, authentication mechanisms, authorization model, Row Level Security policies, secret management, sensitive field handling, audit logging, API key management, and a security hardening checklist.

---

## Security Architecture Overview

CompilerAI Enterprise implements defense-in-depth across every layer of the stack:

```
┌─────────────────────────────────────────────────────────┐
│  Frontend — AuthContext, session management             │
├─────────────────────────────────────────────────────────┤
│  Platform API — Auth middleware, rate limiting, CORS    │
├─────────────────────────────────────────────────────────┤
│  Identity Layer — RBAC, org membership, privilege guard │
├─────────────────────────────────────────────────────────┤
│  Service Layer — orgId checks on every operation        │
├─────────────────────────────────────────────────────────┤
│  Repository Layer — IOrgScopedRepository<T> enforcement │
├─────────────────────────────────────────────────────────┤
│  Database — Row Level Security on all 17 tables         │
└─────────────────────────────────────────────────────────┘
```

Every request passes through the authorization chain: organization membership → role check → permission check → resource ownership → policy evaluation (suspended org, privilege escalation). Cross-organization access returns `404` (not `403`) to hide resource existence.

---

## Authentication Mechanisms

### Email / Password

- **Password hashing:** PBKDF2 with SHA-256, 100,000 iterations, 16-byte random salt.
- **Hash format:** `pbkdf2$<iterations>$<salt_hex>$<key_hex>`.
- **Brute-force protection:** 5 failed login attempts lock the account for 15 minutes. `LoginAttemptRepository` tracks all attempts. Locked accounts return `AccountLockedError` (HTTP 423).

### API Keys

- **Format:** `ck_live_<32 random characters>` for easy identification.
- **Storage:** Only the SHA-256 hash is stored. Plaintext is shown once at creation and cannot be recovered.
- **Key preview:** Masked for display: `ck_live_••••••••1234`.
- **Validation:** `ApiKeyValidator.validateApiKey()` hashes the provided key and looks up the hash. Expired keys throw `ApiKeyExpiredError`; revoked keys throw `ApiKeyRevokedError`.
- **Last used tracking:** `lastUsedAt` updated on each validation for audit purposes.

### JWT Sessions

- **Token issuance:** `JwtTokenValidator.issueToken()` creates a token with `actorId`, `orgId`, `roles`, `sessionId`.
- **Validation:** `CompositeAuthenticationProvider` tries API key first, then JWT.
- **Revocation:** `revokeToken()` marks the token as revoked.
- **Session model:** Token hash only is stored — never plaintext. Default session duration is 24 hours (86,400 seconds), configurable per session.
- **Session lifecycle:** `ACTIVE → EXPIRED` (auto, after `expiresAt`) or `ACTIVE → INVALIDATED` (manual revoke).

### Authenticated principal

All methods produce the same `AuthenticatedPrincipal`:

```typescript
interface AuthenticatedPrincipal {
  actorId:        string;
  organizationId: string;
  roles:          string[];
  permissions:    string[];
  authMethod:     'API_KEY' | 'JWT' | 'OAUTH2' | 'SERVICE_ACCOUNT';
}
```

---

## Authorization Model (RBAC)

### System roles (6)

| Role | Scope | Permissions | Description |
|------|-------|-------------|-------------|
| `PLATFORM_ADMIN` | Platform-wide | All 18 | Full platform access |
| `ORGANIZATION_ADMIN` | Org-wide | All 18 | Full org access within their org |
| `WORKFLOW_EDITOR` | Org-wide | 4 | workflow CRUD + publish |
| `EXECUTION_OPERATOR` | Org-wide | 6 | execution CRUD + telemetry |
| `APPROVER` | Org-wide | 3 | approval + execution read |
| `VIEWER` | Org-wide | 5 | Read-only |

### Custom roles

Organizations can create custom roles with any subset of the 18 permissions:

```typescript
const role = await roleRepo.createCustomRole(
  'CUSTOM_EDITOR', orgId, 'Custom editor role',
  ['workflow:create', 'workflow:read', 'workflow:update', 'memory:read']
);
```

### Permission catalog (18 permissions)

| Permission | Resource | Action |
|------------|----------|--------|
| `execution:create` | execution | create |
| `execution:read` | execution | read |
| `execution:update` | execution | update |
| `execution:cancel` | execution | cancel |
| `execution:resume` | execution | resume |
| `workflow:create` | workflow | create |
| `workflow:update` | workflow | update |
| `workflow:publish` | workflow | publish |
| `workflow:delete` | workflow | delete |
| `workflow:read` | workflow | read |
| `approval:read` | approval | read |
| `approval:decide` | approval | decide |
| `telemetry:read` | telemetry | read |
| `memory:read` | memory | read |
| `memory:write` | memory | write |
| `organization:manage` | organization | manage |
| `users:manage` | users | manage |
| `api_keys:manage` | api_keys | manage |

### Permission resolution

`RolePermissionResolver` aggregates permissions from all of a user's roles in an organization. System roles use the static `SYSTEM_ROLE_PERMISSIONS` map; custom roles are loaded from the repository. Results are cached and attached to the principal.

### Privilege escalation prevention

- Only `PLATFORM_ADMIN` and `ORGANIZATION_ADMIN` can assign roles.
- `ORGANIZATION_ADMIN` cannot assign `PLATFORM_ADMIN`.
- `PLATFORM_ADMIN` can assign any role.

---

## Row Level Security (RLS) Policies

All 17 infrastructure tables have RLS enabled. Every policy uses the `is_org_member(organization_id)` helper function:

```sql
CREATE OR REPLACE FUNCTION is_org_member(org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE organization_id = org_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

### RLS-protected tables

| Table | RLS Policy |
|-------|------------|
| `workflows` | org-scoped |
| `workflow_versions` | org-scoped |
| `runtime_executions` | org-scoped |
| `workflow_executions` | org-scoped |
| `workflow_step_executions` | org-scoped |
| `checkpoints` | org-scoped |
| `approvals` | org-scoped |
| `human_tasks` | org-scoped |
| `tool_definitions` | org-scoped |
| `tool_execution_plans` | org-scoped |
| `tool_executions` | org-scoped |
| `learning_records` | org-scoped |
| `learning_recommendations` | org-scoped |
| `telemetry_events` | org-scoped |
| `execution_traces` | org-scoped |
| `idempotency_records` | org-scoped, unique(org, key) |
| `outbox_events` | org-scoped |
| `audit_logs` | org-scoped, append-only (no UPDATE/DELETE) |

### Composite indexes

All tables have composite indexes on `(organization_id, id)` for query performance. `idempotency_records` has a unique constraint on `(organization_id, key)`.

### Verify RLS

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = true;
```

---

## Secret Management

### ISecretProvider

```typescript
interface ISecretProvider {
  getSecret(key: string): Promise<string | null>;
  listSecretNames(): string[];
  validate(): Promise<string[]>;
}
```

### Providers

- **`EnvironmentSecretProvider`** — Reads from `process.env`. Lists keys matching `SECRET`, `KEY`, `TOKEN`, `PASSWORD`.
- **`InMemorySecretProvider`** — For testing. Uses `setSecret(key, value)`.

### Validation

`validateSecretsOrThrow(provider)` checks all required secrets and throws `SecretProviderError` if any are missing.

### Security rules

- Secrets are never logged — `sanitizeLogMessage()` redacts sensitive patterns.
- `sanitizeForInfrastructure()` redacts sensitive keys in objects before logging.
- Secret values are not exposed in API responses — `toSafeMessage()` masks non-infrastructure errors.
- The service role key bypasses RLS and must only be used server-side.

---

## Sensitive Field Handling

The `StructuredLogger` automatically redacts 14 sensitive field types from every log entry. The list is defined in `@compilerai/observability`:

```typescript
export const SENSITIVE_FIELDS = [
  'password', 'secret', 'token', 'apiKey', 'api_key',
  'privateKey', 'private_key', 'credential', 'authorization',
  'cookie', 'session', 'accessToken', 'access_token',
  'refreshToken', 'refresh_token',
] as const;
```

### How redaction works

When the logger processes a log entry, it checks every key (case-insensitive) against the `SENSITIVE_FIELDS` list. Matching values are replaced with `[REDACTED]`. This applies to:

- Structured log fields
- Error objects passed to the logger
- Infrastructure metadata before serialization

### Test coverage

The redaction behavior is verified in `packages/observability/tests/logging.test.ts`, which asserts:
- `SENSITIVE_FIELDS.length >= 10`
- `SENSITIVE_FIELDS` includes `password`, `secret`, `token`
- Log output for sensitive fields contains `[REDACTED]`, not the original value

---

## Security Audit Logging

### Append-only design

The `audit_logs` table has INSERT and SELECT policies only. No UPDATE or DELETE policies exist — entries are immutable. This is enforced at the database level via RLS.

### AuditLogEntry

```typescript
interface AuditLogEntry {
  auditLogId:     string;
  organizationId: string;
  actorId:        string;
  action:         AuditableAction;
  resourceType:   string;
  resourceId:     string | null;
  result:         'SUCCESS' | 'FAILURE';
  correlationId:  string | null;
  requestId:      string | null;
  metadata:       Record<string, unknown>;
  timestamp:      string;
}
```

### Auditable actions

`workflow.create`, `workflow.publish`, `workflow.deactivate`, `execution.create`, `execution.pause`, `execution.resume`, `execution.cancel`, `approval.approve`, `approval.reject`, `approval.request_changes`, `api_key.create`, `api_key.revoke`, `permission.modify`, `memory.delete`, `admin.config_change`.

### AuditLogger

```typescript
const logger = new AuditLogger(repo, idGen);
await logger.log({
  organizationId: 'org-1',
  actorId: 'user-1',
  action: 'workflow.create',
  resourceType: 'workflow',
  resourceId: 'wf-1',
  result: 'SUCCESS',
});
```

Every auditable action — whether it succeeds or fails — is recorded with the actor, resource, result, correlation ID, and timestamp.

---

## API Key Management

### Scopes (11)

| Scope | Allows |
|-------|--------|
| `execution:run` | Start executions |
| `execution:read` | Read execution data |
| `execution:cancel` | Cancel executions |
| `workflow:read` | Read workflows |
| `workflow:write` | Create/update workflows |
| `approval:read` | View approvals |
| `approval:decide` | Approve/reject |
| `telemetry:read` | Read telemetry |
| `memory:read` | Read memory |
| `memory:write` | Write memory |
| `admin` | All scopes (bypass) |

### Operations

| Operation | Method |
|-----------|--------|
| Create | `createApiKey(orgId, name, scopes, createdBy, expiresInSeconds?)` |
| Revoke | `revokeApiKey(apiKeyId)` — sets `revokedAt` |
| Regenerate | `regenerateApiKey(apiKeyId)` — revokes old, creates new |
| List | `listApiKeys(orgId)` |
| Validate | `validateApiKey(secretKey)` — hashes and looks up |
| Scope check | `hasScope(key, requiredScope)` — checks if key has scope (or `admin`) |

### Lifecycle

1. Admin creates API key → plaintext shown once → only SHA-256 hash stored.
2. On each request, the provided key is hashed and compared to stored hashes.
3. `lastUsedAt` is updated.
4. Key expires at `expiresAt` (if set) or is revoked at `revokedAt`.
5. Expired/revoked keys throw `ApiKeyExpiredError` / `ApiKeyRevokedError`.

---

## Security Hardening Checklist

### Authentication

- [ ] Enforce PBKDF2-SHA256 password hashing (100k iterations, 16-byte salt)
- [ ] Enable brute-force protection (5 attempts → 15-min lock)
- [ ] Set reasonable session expiry (default 24h)
- [ ] Rotate API keys on personnel changes
- [ ] Set expiry on all API keys created for integrations

### Authorization

- [ ] RLS enabled on all 17 tables (verify with `pg_tables` query)
- [ ] `is_org_member` function exists and is `SECURITY DEFINER`
- [ ] No custom role grants `PLATFORM_ADMIN`-equivalent permissions unnecessarily
- [ ] Principle of least privilege — users get the minimum role for their job

### Secrets

- [ ] `.env` is in `.gitignore` and never committed
- [ ] Service role key stored in a secrets manager, not in plaintext config
- [ ] `validateSecretsOrThrow()` passes on startup
- [ ] No secrets in logs (verified by observability tests)

### Network

- [ ] HTTPS enforced in production (Vercel handles this automatically)
- [ ] CORS configured to allow only known origins
- [ ] Rate limiting enabled (sliding window per org/endpoint)
- [ ] Security headers set by nginx (X-Frame-Options, X-Content-Type-Options, Referrer-Policy)

### Audit

- [ ] Audit logging enabled for all auditable actions
- [ ] Audit log table is append-only (no UPDATE/DELETE policies)
- [ ] Regular review of audit logs for suspicious activity
- [ ] Correlation IDs propagated for distributed tracing

### Data protection

- [ ] Sensitive fields redacted in logs (14 field types)
- [ ] Cross-org access returns 404 (not 403) to prevent information leakage
- [ ] DTOs used for all API responses (no raw domain models exposed)
- [ ] Input validation on all API endpoints (RequestValidators)

### Operations

- [ ] Health checks registered for all 8 components
- [ ] Alerts configured for 7 alert types with appropriate severities
- [ ] Backup schedule configured with verification
- [ ] Disaster recovery plan created and tested via chaos testing
