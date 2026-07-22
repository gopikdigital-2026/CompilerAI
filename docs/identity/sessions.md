# Sessions

## Model

```typescript
interface Session {
  sessionId:       string;
  userId:          string;
  organizationId:  string | null;
  tokenHash:       string;
  ipAddress:       string | null;
  userAgent:       string | null;
  expiresAt:       string;
  createdAt:       string;
  invalidatedAt:   string | null;
}
```

## Session Manager

| Operation | Method |
|-----------|--------|
| Create | `createSession(userId, orgId, ip, userAgent, durationSeconds?)` |
| Validate | `validateSession(token)` → Session or null |
| Invalidate | `invalidateSession(sessionId)` |
| Invalidate all | `invalidateAllForUser(userId)` |
| List | `listUserSessions(userId)` |
| Renew | `renewSession(sessionId, durationSeconds?)` |

## Lifecycle

```
ACTIVE → EXPIRED (auto, after expiresAt)
ACTIVE → INVALIDATED (manual revoke)
```

## Default Duration

24 hours (86,400 seconds). Configurable per session.

## Security

- Only token **hashes** are stored, never plaintext tokens
- Session tokens use format `sess_<id>_<timestamp>`
- `invalidateAllForUser()` logs out all devices — used on password change
- Expired sessions are cleaned up via `deleteExpired()`
- Session validation checks both `invalidatedAt` and `expiresAt`
