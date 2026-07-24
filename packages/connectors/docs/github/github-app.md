# GitHub App Authentication

## Overview

GitHub App authentication allows the connector to act as a GitHub App rather than
a personal access token. This enables per-installation access control, tighter
permissions scoping, and higher API rate limits.

## Architecture

```
GitHubAppCredentialResolver
  ↓
CredentialResolver → resolves GitHubAppCredentials (appId, privateKey, installationId)
  ↓
GitHubAppJwtProvider → generates RS256-signed JWT from app credentials
  ↓
GitHubInstallationTokenProvider → exchanges JWT for installation access token
  ↓
GitHubInstallationTokenCache → caches token until near-expiry
  ↓
Bearer token for API calls
```

## Components

### GitHubAppJwtProvider

Generates RS256-signed JWTs for GitHub App authentication.

- Uses `node:crypto` `createSign` for RSA-SHA256 signing
- JWT header: `{ alg: "RS256", typ: "JWT" }`
- Claims: `{ iss: appId, iat: now-60, exp: now+ttl }`
- TTL configurable (default 600s, max 600s per GitHub requirement)
- Injectable `Clock` for testability
- Caches parsed `KeyObject` for performance

### GitHubInstallationTokenProvider

Exchanges app JWTs for installation access tokens via GitHub API.

- Calls `POST /app/installations/{id}/access_tokens`
- Caches tokens per `(organizationId, installationId)`
- Refreshes tokens before expiry (default 5min threshold)
- **Single-flight**: concurrent requests for the same token share a single API call
- Injectable `FetchLike` transport for offline tests

### GitHubInstallationTokenCache

In-memory cache keyed by `(organizationId, installationId)`.

- `get`, `set`, `delete`, `clear` operations
- Isolated by org and installation
- No external dependencies

### GitHubAppCredentialResolver

Resolves GitHub App credentials from `CredentialStore` and obtains installation
tokens via the token provider.

- Extracts `appId`, `privateKey`, `installationId` from credential data
- Never logs or exposes private keys or tokens
- Throws `ConnectorAuthenticationError` on missing/invalid credentials

## Setup

```ts
import {
  GitHubAppJwtProvider,
  GitHubInstallationTokenCache,
  GitHubInstallationTokenProvider,
  GitHubAppCredentialResolver,
} from '@compilerai/connectors';

const jwtProvider = new GitHubAppJwtProvider();
const tokenCache = new GitHubInstallationTokenCache();
const tokenProvider = new GitHubInstallationTokenProvider(jwtProvider, tokenCache, new SystemClock());
const appResolver = new GitHubAppCredentialResolver(credentialResolver, tokenProvider, jwtProvider, new SystemClock());

// Store app credentials
await credentialResolver.storeCredentials('github', 'org-1', 'oauth2', {
  appId: 12345,
  privateKey: '-----BEGIN RSA PRIVATE KEY-----...',
  installationId: 67890,
});

// Get installation token
const token = await appResolver.getInstallationToken('org-1', 67890);
```

## Security

- Private keys are never serialized, logged, or included in error messages
- Installation tokens are cached in memory only, never persisted
- The `sanitizeMetadata` function redacts `privateKey`, `token`, `access_token`
- JWT claims contain only `iss`, `iat`, `exp` — no sensitive data
