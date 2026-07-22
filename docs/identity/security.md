# Security

## Principles

1. **No secrets in plaintext** — Passwords (PBKDF2), API keys (SHA-256), tokens (SHA-256) — all stored as hashes only
2. **No secrets in logs** — `sanitizeLogMessage()` redacts: password, token, secret, credential, apikey, api_key, private_key, authorization
3. **No secrets in error messages** — `toSafeMessage()` masks internal errors

## Password Security

- PBKDF2-SHA256 with 100,000 iterations
- 16-byte random salt per password
- Different hashes for same password (salt prevents rainbow table attacks)

## Brute-Force Protection

- 5 failed login attempts → account locked for 15 minutes
- `LoginAttemptRepository` tracks all attempts (success and failure)
- Successful login resets the counter
- `AccountLockedError` (HTTP 423) returned for locked accounts

## Privilege Escalation Prevention

- `PrivilegeGuard` validates role assignments
- Non-admins cannot assign any roles
- `ORGANIZATION_ADMIN` cannot assign `PLATFORM_ADMIN`
- Users cannot manage users with higher privilege levels
- `PrivilegeEscalationError` thrown on violation

## Multitenant Isolation

- Every table has `organization_id` column
- RLS policies enforce org membership via `is_org_member()`
- `OrganizationContextMiddleware` blocks cross-org access
- `AuthorizationService` checks resource org matches principal org
- `PLATFORM_ADMIN` is the only role that can cross org boundaries

## Session Security

- Configurable expiry (default 24h)
- `invalidateAllForUser()` on password change
- Token hashes only — never store plaintext tokens
- Expired sessions auto-cleaned

## API Key Security

- SHA-256 hash only — plaintext shown once
- Configurable expiry
- Scope-based access control
- Revocation is permanent and immediate
- Regeneration revokes old key and creates new one

## Audit Trail

All identity events are logged:
- `login` / `logout`
- `user.create` / `user.delete` / `user.suspend`
- `role.change`
- `api_key.create` / `api_key.revoke`
- `organization.change`
- `access.denied`

## RLS Policies

All 9 new tables have RLS enabled with 4 CRUD policies each:
- Sessions: only own user can read/modify
- Login attempts: only own user can read
- User roles: org members can read, admins can write
- Roles: org members can read, admins can write (system roles are read-only)
- Permissions: readable by all authenticated users (static catalog)
