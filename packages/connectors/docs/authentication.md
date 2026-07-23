# Authentication

## Overview

The authentication layer provides pluggable auth mechanisms for connector operations. It supports OAuth2 token management with automatic refresh, API key auth, and bearer token auth.

## Auth Schemes

| Scheme | Provider | Description |
|---|---|---|
| `oauth2` | `OAuth2TokenManager` | Token-based with refresh support |
| `api_key` | `ApiKeyAuthProvider` | Header or query parameter |
| `bearer` | `BearerTokenAuthProvider` | Authorization: Bearer header |
| `basic` | — | Username/password (planned) |

## OAuth2 Token Manager

### Features

- **Automatic refresh**: Detects tokens nearing expiry and refreshes proactively
- **Refresh mutex**: Prevents simultaneous refresh calls for the same connector+org using a Promise-based lock
- **Credential persistence**: Stores refreshed tokens in the credential store
- **Token caching**: In-memory cache to avoid repeated store reads
- **Configurable threshold**: `refreshThresholdMs` controls how early to refresh

### Usage

```typescript
import {
  OAuth2TokenManager,
  TestTokenRefreshProvider,
  InMemoryCredentialStore,
  DevelopmentCredentialEncryptionProvider,
} from '@compilerai/connectors';

const store = new InMemoryCredentialStore();
const encryption = new DevelopmentCredentialEncryptionProvider('encryption-key');
const refreshProvider = new TestTokenRefreshProvider();

const tokenManager = new OAuth2TokenManager(store, encryption, refreshProvider, {
  refreshThresholdMs: 60_000, // refresh if token expires within 60s
});

// Get a valid token (auto-refreshes if needed)
const token = await tokenManager.getValidToken('slack', 'org-1');

// Manual refresh
const refreshed = await tokenManager.refresh('slack', 'org-1');

// Check if token needs refresh
const needsRefresh = tokenManager.needsRefresh(token);

// Clear cache
tokenManager.clearCache('slack', 'org-1');
```

### Refresh Mutex

When multiple concurrent calls request a token that needs refresh, only the first call triggers the refresh. All subsequent calls await the same Promise and receive the same refreshed token.

### Token Refresh Providers

| Provider | Behavior |
|---|---|
| `TestTokenRefreshProvider` | Returns a simulated refreshed token |
| `FailingTokenRefreshProvider` | Always throws (for testing error paths) |

Custom providers implement `ITokenRefreshProvider`:

```typescript
interface ITokenRefreshProvider {
  refresh(refreshToken: string, connectorId: string): Promise<OAuth2Token>;
}
```

## API Key Auth Provider

```typescript
import { ApiKeyAuthProvider } from '@compilerai/connectors';

const auth = new ApiKeyAuthProvider({
  apiKey: 'key-123',
  headerName: 'X-API-Key',
  headerPrefix: 'Bearer',
});

const headers = auth.apply(); // { 'X-API-Key': 'Bearer key-123' }
```

## Bearer Token Auth Provider

```typescript
import { BearerTokenAuthProvider } from '@compilerai/connectors';

const auth = new BearerTokenAuthProvider({
  token: 'my-jwt-token',
  prefix: 'Bearer',
});

const headers = auth.apply(); // { Authorization: 'Bearer my-jwt-token' }
```

## Error Handling

Authentication failures produce `ConnectorAuthenticationError` (non-retryable):

- No token found in store
- Token expired with no refresh token
- Refresh provider throws

These errors are not retried by the runtime pipeline.
