# Security

## Password Storage

Passwords are hashed using **PBKDF2** with SHA-512:
- 100,000 iterations
- 32-byte random salt per password
- 64-byte derived key
- Format: `pbkdf2$iterations$salt$derivedKey`

The raw password is never stored or logged. Verification uses constant-time comparison of the derived key.

```typescript
const hasher = new PasswordHasher();
const hash = hasher.hash('MyPassword123!');
const valid = hasher.verify('MyPassword123!', hash); // true
```

## Token Security

All bearer tokens (sessions, API keys) are:
1. Generated using `crypto.randomBytes(32)` — 256 bits of entropy
2. Prefixed by purpose: `sess_` for sessions, `ck_live_` for API keys
3. Hashed with **SHA-256** before storage
4. Returned to the caller only once (at creation time)
5. Looked up by hash during authentication

```typescript
const tokenGen = new TokenGenerator();
const { token, hash, preview } = tokenGen.generate('sess_');
// Store `hash`, return `token` to user once, use `preview` for display
```

## API Key Lifecycle

- **Creation**: Raw key returned once; only hash + preview stored
- **Authentication**: Hash compared, `lastUsedAt` updated
- **Revocation**: Status → `REVOKED`, `revokedAt` + `revokedByUserId` recorded
- **Rotation**: Old key revoked, new key created with same scopes/expiry
- **Expiry**: Keys with `expiresAt` in the past are rejected during auth

## Session Security

- Sessions have configurable expiry (default: 1 hour, max: 24 hours)
- `lastActivityAt` is updated on each access
- Sessions can be revoked individually or all-at-once for a user
- Expired sessions are cleaned up via `sessionService.cleanupExpired()`

## Privilege Escalation Protection

- Only `PlatformAdmin` can assign the `PlatformAdmin` role
- Only `PlatformAdmin` or `OrganizationAdmin` can assign `OrganizationAdmin`
- System roles cannot be modified or deleted
- `RoleService.create()` validates creator privileges for privileged role names

## Audit Sanitization

All audit entries are sanitized before storage:
- Sensitive field names (password, token, secret, apiKey, etc.) are replaced with `[REDACTED]`
- Nested objects are recursively sanitized
- Log values containing secret patterns (`sk-*`, `Bearer *`, `ck_live_*`) are redacted

## Multi-Tenant Isolation

- All entities scoped by `organizationId`
- Cross-tenant access throws `CrossTenantError`
- Repository queries always filter by organization
- `PlatformAdmin` is the only role that can cross org boundaries

## Security Checklist

| Requirement | Status |
|---|---|
| No plaintext passwords | PBKDF2 with SHA-512 |
| No plaintext tokens | SHA-256 hashed |
| Token rotation | `apiKeyService.rotate()` |
| Immediate revocation | `apiKeyService.revoke()`, `sessionService.revoke()` |
| Policy validation | `PolicyEngine.evaluate()` |
| Privilege escalation prevention | `assertCanAssignRole()`, system role protection |
| Log sanitization | `sanitizeAuditDetail()`, `sanitizeLogValue()` |
| Organization isolation | `organizationId` on all entities, `CrossTenantError` |
| Failed login tracking | `MAX_FAILED_LOGINS` (5), account locking |
