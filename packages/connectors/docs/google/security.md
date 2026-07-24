# Google Workspace Connector — Security

## Overview

The Google Workspace connector implements multiple layers of security to protect against SSRF, path traversal, header injection, secret leakage, and cross-tenant credential exposure. These measures are enforced in the `GoogleRequestBuilder`, `GoogleApiClient`, `GoogleOAuth2Adapter`, `GoogleErrorMapper`, and `GoogleGmailMapper`.

## Host Allowlist

The connector enforces a strict host allowlist to prevent Server-Side Request Forgery (SSRF). Only the three Google API hosts and the OAuth2 token endpoint are permitted:

```typescript
const ALLOWED_HOSTS = new Set([
  'www.googleapis.com',     // Drive + Calendar APIs
  'gmail.googleapis.com',   // Gmail API
  'oauth2.googleapis.com',  // OAuth2 token endpoint
]);
```

### Enforcement Points

1. **`GoogleRequestBuilder` constructor** — Validates the base URL hostname at construction time. Rejects any host not in the allowlist:

```typescript
constructor(baseUrl: string = 'https://www.googleapis.com') {
  const url = new URL(this.baseUrl);
  if (!ALLOWED_HOSTS.has(url.hostname)) {
    throw new Error(`Host not allowed: ${url.hostname}. Allowed hosts: ${Array.from(ALLOWED_HOSTS).join(', ')}`);
  }
}
```

2. **`GoogleRequestBuilder.build()`** — Re-validates the fully constructed URL's hostname after path and query parameters are assembled. This catches any attempted host override via crafted path segments:

```typescript
build(): { url, method, body } {
  // ... assemble URL ...
  const parsed = new URL(url);
  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    throw new Error(`Resolved host not allowed: ${parsed.hostname}`);
  }
  return { url, method, body };
}
```

If a base URL override is supplied via `GoogleApiClientConfig` (e.g. for testing), it must still resolve to an allowed host.

## Path Traversal Protection

The `GoogleRequestBuilder.addPath()` method defends against directory traversal attacks:

```typescript
addPath(segment: string): this {
  const cleaned = segment.replace(/^\/+|\/+$/g, ''); // strip leading/trailing slashes
  const decoded = decodeURIComponent(cleaned);
  if (decoded.includes('..')) {
    throw new Error('Path traversal detected');
  }
  // ... per-segment checks ...
  for (const part of parts) {
    const encoded = encodeURIComponent(part);
    if (encoded.includes('..') || encoded.toLowerCase().includes('%2e')) {
      throw new Error('Path traversal detected');
    }
    this.pathSegments.push(encoded);
  }
}
```

### Checks Performed

| Check | Description |
|-------|-------------|
| Decoded `..` detection | Rejects `../` sequences in decoded path |
| Encoded `..` detection | Rejects `%2e%2e` or `%2E` encoded traversal |
| Segment count limit | Max 20 path segments (`MAX_PATH_SEGMENTS`) |
| Segment length limit | Max 500 chars per encoded segment (`MAX_PATH_LENGTH`) |
| Query param limit | Max 50 query parameters (`MAX_QUERY_PARAMS`) |

All path segments are URL-encoded via `encodeURIComponent`, and query parameter keys and values are also encoded, preventing injection of additional URL components.

## Header Injection Prevention (Gmail)

Email subjects and other header-bound values are checked for newline characters that could inject additional headers into the RFC 2822 message:

```typescript
static checkHeaderInjection(value: string): boolean {
  return value.includes('\r\n') || value.includes('\n');
}
```

### Enforcement

Both `sendMessage` and `createDraft` operations validate the `subject` field during `validateInput()`:

```typescript
if (GoogleGmailMapper.checkHeaderInjection(input['subject'] as string)) {
  errors.push('subject contains invalid newline characters (header injection detected)');
}
```

Additionally, `GoogleGmailMapper.encodeHeaderParam()` throws at runtime if a header value contains newlines, providing defense-in-depth even if validation is bypassed:

```typescript
static encodeHeaderParam(value: string): string {
  if (this.checkHeaderInjection(value)) {
    throw new Error('Header injection detected in email parameter');
  }
  return value;
}
```

This prevents attacks like:
```
Subject: Hello\r\nBcc: attacker@evil.com
```

## Email Validation

All recipient addresses (`to`, `cc`, `bcc`) in `sendMessage` and `createDraft` operations are validated against a standard email regex:

```typescript
static validateEmailAddress(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}
```

Invalid addresses produce a validation error:
```
invalid email address in to: not-an-email
```

## Token & Secret Redaction

### Error Message Sanitization

`GoogleErrorMapper.sanitizeMessage()` removes sensitive terms from all error messages before they are wrapped in `ConnectorRuntimeError`:

```typescript
private static sanitizeMessage(message: string): string {
  return message
    .replace(/token|secret|key|password|bearer/gi, '[REDACTED]');
}
```

### Refresh Error Sanitization

`GoogleTokenRefreshProvider` sanitizes the response body on non-OK refresh responses:

```typescript
const sanitized = text.replace(/token|secret|key/gi, '[REDACTED]');
throw new Error(`Google token refresh failed (HTTP ${response.status}): ${sanitized}`);
```

### Header Sanitization in Errors

Response headers attached to error `details` are sanitized via `sanitizeMetadata()`:

```typescript
const sanitizedHeaders = sanitizeMetadata(headers) as Record<string, unknown>;
const details = { headers: sanitizedHeaders, reason };
```

### OAuth2 Adapter Sanitization

`GoogleOAuth2Adapter` sanitizes refresh failure errors before wrapping them:

```typescript
const sanitized = sanitizeMetadata({ error: err instanceof Error ? err.message : String(err) });
throw new ConnectorAuthenticationError(
  GOOGLE_CONNECTOR_ID, 'refreshToken', 'unknown',
  `Google OAuth2 token refresh failed: ${(sanitized as Record<string, unknown>)['error'] ?? 'unknown error'}`,
);
```

## OAuth2 Token Caching

### In-Process Cache

Access tokens are cached in-process in the `GoogleOAuth2Adapter`:

```typescript
private readonly cache: Map<string, CachedToken> = new Map();
private readonly inFlight: Map<string, InFlightRefresh> = new Map();
```

- Tokens are never written to disk or logs.
- The cache is per-adapter-instance, preventing cross-connector token leakage.
- Cached tokens include `accessToken`, `expiresAt`, `refreshToken`, `clientId`, and `clientSecret` — all in memory only.

### Cache Key Isolation

Tokens are cached by `${organizationId}:${userId ?? '*'}`, ensuring strict isolation between tenants:

```typescript
private cacheKey(organizationId: UUID, userId?: UUID | null): string {
  return `${organizationId}:${userId ?? '*'}`;
}
```

### Cache Invalidation

`invalidateCache(organizationId, userId?)` removes both the cached token and any in-flight refresh, allowing the system to purge compromised tokens immediately.

## Credential Isolation by Organization

### CredentialResolver Scope

Credentials are resolved via the platform `CredentialResolver`, which scopes lookups by connector ID and organization:

```typescript
resolved = await this.credentialResolver.resolve(
  GOOGLE_CONNECTOR_ID,    // 'google-workspace'
  organizationId,
  userId ?? null,
);
```

One organization's credentials are never visible to another. The `CredentialResolver` delegates to an `ICredentialStore` backed by an `ICredentialEncryptionProvider`, ensuring credentials are encrypted at rest.

### Missing Credential Handling

If credentials are missing or lack required fields, a `ConnectorAuthenticationError` is thrown — never a generic error that might leak whether credentials exist for other tenants:

```typescript
if (!resolved) {
  throw new ConnectorAuthenticationError(
    GOOGLE_CONNECTOR_ID, 'getAccessToken', 'unknown',
    `No Google Workspace credentials found for organization ${organizationId}`,
  );
}
```

## Payload Size Limits

The `GoogleApiClient` enforces maximum payload sizes to prevent memory exhaustion:

| Limit | Value | Enforcement |
|-------|-------|-------------|
| `maxPayloadBytes` | 10 MB (10,485,760 bytes) | JSON request bodies and multipart uploads |
| Upload content max | 5 MB (5,000,000 bytes) | `UploadFileOperation` validation |

```typescript
if (serialized.length > this.config.maxPayloadBytes) {
  throw new ConnectorRuntimeError(
    'Request payload exceeds maximum size', 'VALIDATION_ERROR', false,
    GOOGLE_CONNECTOR_ID, 'apiRequest', 'unknown',
    undefined, { maxSize: this.config.maxPayloadBytes },
  );
}
```

## Authentication Token Requirement

Every API request requires a non-empty bearer token. The `GoogleApiClient.doRequest()` method rejects requests without a token before any network call:

```typescript
if (!options.token || options.token.length === 0) {
  throw new ConnectorRuntimeError(
    'No authentication token provided', 'AUTHENTICATION_ERROR', false,
    GOOGLE_CONNECTOR_ID, 'apiRequest', 'unknown',
  );
}
```

## Security Summary

| Threat | Mitigation |
|--------|------------|
| SSRF | Host allowlist (3 Google hosts), validated at construction and build time |
| Path traversal | Decoded + encoded `..` detection, segment count/length limits |
| Header injection (email smuggling) | Newline detection in subjects, runtime `encodeHeaderParam` guard |
| Secret leakage in errors | `sanitizeMessage()` regex redaction on all error paths |
| Secret leakage in headers | `sanitizeMetadata()` on error detail headers |
| Secret leakage in refresh | Token endpoint response body sanitization |
| Cross-tenant credential access | Per-org/user cache keys, CredentialResolver scoping |
| Token replay | In-process cache only, `invalidateCache()` for revocation |
| Payload DoS | 10 MB max payload, 5 MB max upload content |
| Missing auth | Pre-flight token check before network call |
