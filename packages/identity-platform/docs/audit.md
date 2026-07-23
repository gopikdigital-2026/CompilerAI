# Audit

## Overview

The `AuditService` records security-relevant events with organization segmentation and sensitive field sanitization.

## Audit Actions

| Action | Severity | When |
|---|---|---|
| `LOGIN` | LOW (success) / HIGH (failure) | User login attempt |
| `LOGOUT` | LOW | User logout |
| `USER_CREATED` | MEDIUM | New user created |
| `USER_UPDATED` | MEDIUM | User profile/status updated |
| `USER_DELETED` | HIGH | User deleted |
| `PERMISSIONS_CHANGED` | HIGH | Role assigned or revoked |
| `API_KEY_CREATED` | MEDIUM | API key created |
| `API_KEY_REVOKED` | HIGH | API key revoked |
| `API_KEY_USED` | LOW | API key authentication |
| `SESSION_CREATED` | LOW | Session created |
| `SESSION_REVOKED` | MEDIUM | Session revoked |
| `ACCESS_DENIED` | HIGH | Authorization denied |
| `ROLE_ASSIGNED` | MEDIUM | Role assigned to user |
| `ROLE_REVOKED` | MEDIUM | Role revoked from user |
| `POLICY_CREATED` | MEDIUM | Policy created |
| `POLICY_UPDATED` | MEDIUM | Policy updated |
| `ORG_CREATED` | HIGH | Organization created |
| `ORG_UPDATED` | MEDIUM | Organization updated |

## Recording Entries

```typescript
await platform.audit.record({
  organizationId: org.id,
  action: 'API_KEY_CREATED',
  actorId: user.id,
  actorType: 'USER',
  targetType: 'API_KEY',
  targetId: apiKey.id,
  severity: 'MEDIUM',
  detail: { key_name: apiKey.name },
  success: true,
});
```

## Querying

- `findByOrganization(orgId, pageQuery?)` — paginated audit log for an org
- `findByActor(actorId, orgId)` — entries by a specific actor within an org
- `findByAction(action, orgId)` — entries of a specific action within an org

All queries are scoped by `organizationId`.

## Sanitization

The `sanitizeAuditDetail()` function automatically redacts sensitive fields:

- `password`, `passwordHash` → `[REDACTED]`
- `keyHash`, `token`, `tokenHash` → `[REDACTED]`
- `secret`, `apiKey` → `[REDACTED]`
- Nested objects are recursively sanitized

This ensures no secrets or credentials are ever stored in the audit log.

## Automatic Recording

The `AuthenticationService` automatically records:
- Successful and failed login attempts
- Logout events
- API key usage

The `bootstrapOrganization` method records:
- Organization creation

## Audit Entry Structure

```typescript
interface AuditEntry {
  id: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  metadata: {};
  organizationId: string;
  action: AuditAction;
  actorId: string;
  actorType: 'USER' | 'API_KEY' | 'SERVICE_ACCOUNT' | 'SYSTEM';
  targetType: string;
  targetId: string;
  severity: AuditSeverity;
  ipAddress: string | null;
  detail: Record<string, unknown>; // sanitized
  success: boolean;
}
```
