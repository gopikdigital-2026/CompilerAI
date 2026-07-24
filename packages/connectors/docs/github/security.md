# GitHub Connector — Security

## Threat Model

The GitHub connector handles sensitive credentials (PATs) and makes outbound HTTP calls to the GitHub API. The security model addresses:

1. **Credential protection** — Tokens must never leak into logs, errors, or telemetry
2. **SSRF prevention** — Only allowed GitHub hosts should be reachable
3. **Path traversal prevention** — API paths must not allow directory escape
4. **Multi-tenant isolation** — Organizations must not access each other's data
5. **Webhook forgery prevention** — Incoming webhooks must be signature-verified

## Credential Protection

### Sanitization

The `sanitizeMetadata()` function from Sprint 23 recursively redacts sensitive keys:

- `token`, `authorization`, `apikey`, `secret`, `password`, `bearer` (case-insensitive)
- Nested objects are traversed recursively
- Values are replaced with `[REDACTED]`

### Error Messages

`GitHubErrorMapper` sanitizes HTTP headers before including them in error details. The `Authorization` header is never included in error messages or stack traces.

### Telemetry

All telemetry events, metrics, and audit logs pass through `sanitizeMetadata()` before recording.

## SSRF Prevention

### Host Allowlist

`GitHubRequestBuilder` only allows requests to:

- `api.github.com`
- `github.com`

Any other hostname (including lookalikes like `api.github.com.evil.com`) is rejected.

### URL Resolution Check

After building the full URL, the builder re-parses it with `new URL()` and checks the resolved hostname against the allowlist. This prevents DNS rebinding and URL parsing tricks.

## Path Traversal Prevention

### Direct Traversal

Paths containing `..` are rejected immediately:

```
GitHubRequestBuilder.get('../../../etc/passwd')
// throws: Path traversal detected
```

### Encoded Traversal

URL-encoded traversal attempts are detected by checking for `%2e` (encoded `.`):

```
GitHubRequestBuilder.get('%2e%2e%2f%2e%2e%2fetc%2fpasswd')
// throws: Path traversal detected
```

### Path Segment Limits

- Maximum 20 path segments
- Maximum 500 characters per segment

## Query Parameter Limits

- Maximum 50 query parameters per request
- Undefined and null values are silently skipped
- All values are URL-encoded

## Payload Size Limits

`GitHubApiClient` enforces a configurable `maxPayloadBytes` limit (default: 10MB) on request bodies. Oversized payloads are rejected before the HTTP call is made.

## Multi-Tenant Isolation

Credentials are keyed by `connectorId:organizationId:userId` in the `ICredentialStore`. The `GitHubTokenAuthAdapter` always passes the `organizationId` from the execution context, ensuring:

- Organization A cannot read Organization B's credentials
- Token resolution failures for one organization do not affect another
- Webhook verification resolves the correct secret per organization

## Webhook Security

- HMAC-SHA256 signature verification using `timingSafeEqual`
- Signatures without `sha256=` prefix are rejected
- Missing signatures are rejected (never fall back to unverified processing)
- Webhook secrets are stored in the credential store, not hardcoded
