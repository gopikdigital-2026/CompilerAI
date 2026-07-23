# Authentication

## Supported Methods

### Password (Login)

Users authenticate with email + password. The `AuthenticationService.login()` method:
1. Looks up user by email within the specified organization
2. Verifies password against stored PBKDF2 hash
3. Increments failed login count on failure (locks after 5 attempts)
4. Resets failed count and records login time on success
5. Creates a session with a hashed token
6. Builds an `AuthContext` with role names and permission IDs
7. Records an audit entry

```typescript
const { user, session, rawToken, authContext } = await platform.authentication.login({
  email: 'admin@acme.com',
  password: 'SecurePass123!',
  organizationId: org.id,
  ipAddress: '192.168.1.1',
});
```

### API Key

API keys are prefixed with `ck_live_` and hashed with SHA-256. Authentication:
1. Hashes the raw key
2. Looks up by hash in repository
3. Validates active status and expiry
4. Updates `lastUsedAt` timestamp
5. Builds auth context from the key creator's roles
6. Records audit entry

```typescript
const principal = await platform.authentication.authenticateWithApiKey(rawKey);
```

### Session Token

Session tokens are prefixed with `sess_` and hashed with SHA-256. Authentication:
1. Hashes the raw token
2. Looks up session by hash
3. Validates active status and expiry
4. Builds auth context from the session user

```typescript
const principal = await platform.authentication.authenticateWithSession(rawToken);
```

### OAuth2/OIDC (Future)

Interfaces are prepared for OAuth2/OIDC providers but not yet implemented. The `AuthMethod` type includes `'OAUTH2'` as a placeholder.

## Account Locking

After `MAX_FAILED_LOGINS` (5) failed attempts within 1 hour, the account is locked for 15 minutes. Successful login resets the counter.

## Logout

Logout revokes the session and records an audit entry:

```typescript
await platform.authentication.logout(sessionId, organizationId);
```

## Security Guarantees

- Passwords are never stored in plaintext
- Tokens are never stored in plaintext
- Failed login attempts are tracked and audited
- Sessions are revocable and expire automatically
- All authentication events are recorded in the audit log
