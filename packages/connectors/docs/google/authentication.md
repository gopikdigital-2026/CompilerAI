# Google Workspace Connector — Authentication

## Overview

The Google Workspace connector uses **OAuth2 with refresh token support** to authenticate against Google APIs. The `GoogleOAuth2Adapter` resolves credentials per organization (and optionally per user), caches access tokens, and proactively refreshes them before expiry using a single-flight mechanism to prevent refresh storms.

## OAuth2 Flow

```
┌──────────┐     1. User grants consent      ┌────────────────┐
│  Client  │ ──────────────────────────────► │ Google Auth     │
│          │ ◄────────────────────────────── │ (accounts.google│
│          │   2. Authorization code          │  .com)          │
└──────────┘                                  └────────────────┘
     │
     │ 3. Exchange code for tokens (offline access)
     ▼
┌────────────────┐     4. access_token + refresh_token    ┌──────────┐
│ Compiler        │ ◄──────────────────────────────────── │ Google    │
│ CredentialStore │                                        │ Token EP  │
└────────────────┘                                        └──────────┘
     │
     │ 5. Store clientId, clientSecret, refreshToken, accessToken
     ▼
┌──────────────────────────────────────────────────────┐
│ GoogleOAuth2Adapter                                  │
│   ├─ Cache: { accessToken, expiresAt, ... }          │
│   └─ On expiry → refresh via GoogleTokenRefreshProvider │
└──────────────────────────────────────────────────────┘
```

### Endpoints

| Endpoint | URL |
|----------|-----|
| Authorization | `https://accounts.google.com/o/oauth2/v2/auth` |
| Token (refresh) | `https://oauth2.googleapis.com/token` |

## Credential Requirements

The connector requires four credential fields, stored in the platform `CredentialResolver`:

| Field | Required | Description |
|-------|----------|-------------|
| `clientId` | Yes | OAuth2 client ID from Google Cloud Console |
| `clientSecret` | Yes | OAuth2 client secret |
| `refreshToken` | Yes | Long-lived refresh token (obtained with `access_type=offline`) |
| `accessToken` | Yes | Initial access token (cached on first use; refreshed as needed) |
| `redirectUri` | No | Optional redirect URI |

```typescript
const AUTH_REQUIREMENTS: ConnectorAuthRequirements = {
  scheme: 'oauth2',
  requiredFields: ['clientId', 'clientSecret', 'refreshToken', 'accessToken'],
  optionalFields: ['redirectUri'],
  scopes: [
    GOOGLE_DRIVE_SCOPES.METADATA_READONLY,
    GOOGLE_DRIVE_SCOPES.FILE,
    GOOGLE_GMAIL_SCOPES.READONLY,
    GOOGLE_GMAIL_SCOPES.SEND,
    GOOGLE_GMAIL_SCOPES.LABELS,
    GOOGLE_CALENDAR_SCOPES.READONLY,
    GOOGLE_CALENDAR_SCOPES.EVENTS,
  ],
  tokenEndpoint: GOOGLE_TOKEN_ENDPOINT,
  authorizationEndpoint: GOOGLE_AUTHORIZATION_ENDPOINT,
  refreshSupported: true,
};
```

### Scopes

| Service | Scope Constant | Scope URI |
|---------|---------------|-----------|
| Drive | `METADATA_READONLY` | `https://www.googleapis.com/auth/drive.metadata.readonly` |
| Drive | `FILE` | `https://www.googleapis.com/auth/drive.file` |
| Drive | `READONLY` | `https://www.googleapis.com/auth/drive.readonly` |
| Gmail | `READONLY` | `https://www.googleapis.com/auth/gmail.readonly` |
| Gmail | `SEND` | `https://www.googleapis.com/auth/gmail.send` |
| Gmail | `LABELS` | `https://www.googleapis.com/auth/gmail.labels` |
| Calendar | `READONLY` | `https://www.googleapis.com/auth/calendar.readonly` |
| Calendar | `EVENTS` | `https://www.googleapis.com/auth/calendar.events` |

## GoogleOAuth2Adapter

The `GoogleOAuth2Adapter` is the central auth component. It is constructed with a `CredentialResolver` and an `IGoogleTokenRefreshProvider`.

### Token Caching

Tokens are cached in-memory keyed by `${organizationId}:${userId ?? '*'}`:

```typescript
interface CachedToken {
  readonly accessToken: string;
  readonly expiresAt: number;        // epoch ms
  readonly refreshToken: string;
  readonly clientId: string;
  readonly clientSecret: string;
}
```

### Refresh Threshold

A token is considered stale if it will expire within **60 seconds** (`REFRESH_THRESHOLD_MS = 60_000`). Stale tokens trigger a proactive refresh before the API call is made:

```typescript
needsRefresh(token: CachedToken): boolean {
  const now = Date.now();
  return (token.expiresAt - now) <= REFRESH_THRESHOLD_MS; // 60s
}
```

### Single-Flight Refresh

When multiple concurrent operations request a token for the same cache key, only **one** refresh request is sent to Google. All callers await the same in-flight promise:

```typescript
private async refreshToken(organizationId, userId, transport, cacheKey): Promise<string> {
  const existing = this.inFlight.get(cacheKey);
  if (existing) return existing.promise;  // share in-flight refresh

  const promise = this.doRefresh(organizationId, userId, transport, cacheKey);
  this.inFlight.set(cacheKey, { promise });
  return promise;
}
```

Once the refresh completes (or fails), the in-flight entry is removed and the cache is updated (on success).

### Token Resolution Flow

```typescript
async getAccessToken(organizationId: UUID, userId?: UUID | null, transport?: FetchLike): Promise<string> {
  const cacheKey = this.cacheKey(organizationId, userId);
  const cached = this.cache.get(cacheKey);

  if (cached && !this.needsRefresh(cached)) {
    return cached.accessToken;           // 1. Return cached token
  }

  return this.refreshToken(organizationId, userId, transport, cacheKey); // 2. Refresh
}
```

### Credential Resolution

Credentials are resolved via the platform `CredentialResolver`:

```typescript
resolved = await this.credentialResolver.resolve(GOOGLE_CONNECTOR_ID, organizationId, userId ?? null);
```

If credentials are missing or lack the required fields (`accessToken`, `refreshToken`, `clientId`, `clientSecret`), a `ConnectorAuthenticationError` is thrown.

### Cache Invalidation

```typescript
invalidateCache(organizationId: UUID, userId?: UUID | null): void
```

Removes the cached token and any in-flight refresh for the given cache key. Useful when a token is known to be revoked or invalidated externally.

## GoogleTokenRefreshProvider

The production refresh provider sends a `POST` to `https://oauth2.googleapis.com/token` with `grant_type=refresh_token`:

```typescript
const body = new URLSearchParams({
  grant_type: 'refresh_token',
  refresh_token: refreshToken,
  client_id: clientId,
  client_secret: clientSecret,
});
```

### Error Handling

- Non-OK responses throw an error with the response body **sanitized** — occurrences of `token`, `secret`, `key` are replaced with `[REDACTED]`.
- Missing `access_token` in the response throws a descriptive error.

### Refresh Response

```typescript
interface GoogleTokenRefreshResponse {
  readonly access_token: string;
  readonly expires_in: number;       // seconds (default 3600)
  readonly refresh_token?: string;    // may be rotated; falls back to existing
  readonly token_type: string;        // "Bearer"
  readonly scope?: string;
}
```

If Google returns a new `refresh_token`, it replaces the stored one. Otherwise the existing refresh token is retained.

## Test Providers

### TestTokenRefreshProvider

A configurable test double that returns a predetermined refresh response and tracks `refreshCount`. Optionally simulates failure:

```typescript
const provider = new TestTokenRefreshProvider({ access_token: 'test-token', expires_in: 3600 });
// or
const failing = new TestTokenRefreshProvider({}, /* shouldFail */ true);
```

### FailingTokenRefreshProvider

Always throws `Error('Simulated refresh failure')`. Used to test error propagation and cache invalidation on refresh failure.

## Service Account (Deferred)

Google Service Account authentication with domain-wide delegation is **defined in types but not yet implemented**:

```typescript
export const GOOGLE_SERVICE_ACCOUNT_NOT_IMPLEMENTED =
  'Google Service Account authentication (domain-wide delegation) is not yet implemented. ' +
  'Use OAuth2 authentication in the meantime.';
```

The interfaces `GoogleServiceAccountCredentials` and `GoogleServiceAccountConfig` are declared in `GoogleOAuth2Scopes.ts` for forward compatibility. When implemented, service account auth will support JWT-based token acquisition with delegated user impersonation.

## Security Notes

- Refresh tokens, client secrets, and access tokens are **never logged** in plaintext. The `sanitizeMetadata()` utility redacts sensitive values before they appear in error messages or telemetry.
- Credentials are isolated by organization (and optionally user) — one tenant's tokens are never visible to another.
- The `GoogleOAuth2Adapter` cache is in-process and per-adapter instance, preventing cross-connector token leakage.
