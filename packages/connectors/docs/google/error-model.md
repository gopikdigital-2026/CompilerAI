# Google Workspace Connector — Error Model

## Overview

The Google Workspace connector normalizes Google API errors into the platform's `ConnectorRuntimeError` hierarchy via `GoogleErrorMapper`. Every HTTP error response (4xx/5xx) and network failure is mapped to a typed error with a sanitized message, an error category, and a retryable flag. This document describes the Google error reasons, HTTP status mapping, and token/secret redaction.

## Google Error Reasons

Google APIs return structured error bodies with a `reason` field that indicates the specific failure type. The connector recognizes the following reasons:

| Reason | Description | Category |
|--------|-------------|----------|
| `rateLimitExceeded` | Per-project rate limit exceeded | Rate limit |
| `userRateLimitExceeded` | Per-user rate limit exceeded | Rate limit |
| `quotaExceeded` | Quota exhausted | Rate limit / Quota |
| `dailyLimitExceeded` | Daily quota exhausted | Rate limit / Quota |
| `backendError` | Google server-side error | Provider error (retryable) |
| `authError` | Invalid or expired authentication | Authentication |
| `insufficientPermissions` | Token lacks required scopes | Authorization |
| `forbidden` | Access denied to resource | Authorization |

### Error Body Structure

Google APIs return errors in this shape:

```json
{
  "error": {
    "code": 403,
    "message": "Rate Limit Exceeded",
    "status": "PERMISSION_DENIED",
    "errors": [
      {
        "domain": "usageLimits",
        "reason": "rateLimitExceeded",
        "message": "Rate Limit Exceeded",
        "locationType": "parameter",
        "location": "key"
      }
    ]
  }
}
```

The `GoogleRateLimitMapper.extractFromErrorBody()` method extracts the reason from either `error.errors[0].reason` or `error.reason`.

### Rate Limit Reason Detection

```typescript
const GOOGLE_RATE_LIMIT_REASONS = new Set([
  'rateLimitExceeded',
  'userRateLimitExceeded',
  'quotaExceeded',
  'dailyLimitExceeded',
]);

export function isGoogleRateLimitReason(reason: string): boolean {
  return GOOGLE_RATE_LIMIT_REASONS.has(reason);
}
```

---

## HTTP Status Mapping

`GoogleErrorMapper.mapHttpError()` maps each HTTP status code to a typed error:

| HTTP Status | Error Type | Error Category | Retryable | Notes |
|-------------|-----------|----------------|-----------|-------|
| 400 | `ConnectorRuntimeError` | `VALIDATION_ERROR` | No | Client error — bad request |
| 401 | `ConnectorAuthenticationError` | — | No | `authError` or `invalidCredentials` reason; token may need refresh |
| 403 | `ConnectorRateLimitError` or `ConnectorRuntimeError` | `AUTHORIZATION_ERROR` or rate limit | No | Rate limit reasons → `ConnectorRateLimitError`; `insufficientPermissions`/`forbidden` → `AUTHORIZATION_ERROR`; quota in message → rate limit |
| 404 | `ConnectorRuntimeError` | `VALIDATION_ERROR` | No | Resource not found |
| 409 | `ConnectorRuntimeError` | `PROVIDER_ERROR` | **Yes** | Conflict — retryable |
| 412 | `ConnectorRuntimeError` | `VALIDATION_ERROR` | No | Precondition failed |
| 429 | `ConnectorRateLimitError` | — | — | Rate limited; uses `Retry-After` if present |
| 500–599 | `ConnectorRuntimeError` | `PROVIDER_ERROR` | Yes if `backendError` | Server error; retryable when reason is `backendError` |
| Other 4xx | `ConnectorRuntimeError` | `VALIDATION_ERROR` | No | Catch-all for unrecognized 4xx |
| Other | `ConnectorRuntimeError` | `INTERNAL_ERROR` | No | Unexpected status |

### 403 Disambiguation

HTTP 403 is the most complex status because Google uses it for multiple conditions:

```
403 received
  ├─ reason is a rate-limit reason (rateLimitExceeded, userRateLimitExceeded, quotaExceeded, dailyLimitExceeded)
  │    └─ → ConnectorRateLimitError
  ├─ reason is insufficientPermissions or forbidden
  │    └─ → ConnectorRuntimeError (AUTHORIZATION_ERROR, not retryable)
  ├─ reason is quotaExceeded/dailyLimitExceeded OR message contains "quota"/"limit"
  │    └─ → ConnectorRateLimitError (with reason fallback to quotaExceeded)
  └─ default
       └─ → ConnectorRuntimeError (AUTHORIZATION_ERROR, not retryable)
```

### 429 Handling

HTTP 429 always produces a `ConnectorRateLimitError`. The mapper extracts rate-limit info from headers (including `Retry-After`) and populates:

```typescript
{
  limit: rateLimit?.limit ?? 0,
  remaining: rateLimit?.remaining ?? 0,
  resetAt: rateLimit?.resetAt ?? new Date().toISOString(),
  retryAfterMs: retryAfterMs && retryAfterMs > 0 ? retryAfterMs : undefined,
}
```

### 5xx Retryability

5xx errors are retryable **only** when the reason is `backendError`. Other 5xx reasons default to non-retryable.

---

## Network Errors

Network failures (fetch throws, connection refused, DNS errors) are mapped by `mapNetworkError()`:

```typescript
static mapNetworkError(error: Error, connectorId: ConnectorId): ConnectorRuntimeError {
  const sanitizedMessage = sanitizeMetadata({ message: error.message }).message ?? 'Network error';
  return new ConnectorRuntimeError(
    `Google network error: ${sanitizedMessage}`, 'NETWORK_ERROR', true,  // retryable
    connectorId, 'apiRequest', 'unknown', error,
  );
}
```

Network errors are **always retryable** (`retryable: true`), allowing the runtime pipeline to retry on transient connectivity issues.

**AbortError** (`DOMException` with `name === 'AbortError'`) is re-thrown as-is — it represents a timeout or cancellation, not a failure.

---

## Token & Secret Redaction

### Message Sanitization

All error messages are sanitized to remove sensitive values before being included in `ConnectorRuntimeError`:

```typescript
private static sanitizeMessage(message: string): string {
  return message
    .replace(/token|secret|key|password|bearer/gi, '[REDACTED]');
}
```

This ensures that access tokens, refresh tokens, API keys, client secrets, passwords, and bearer tokens that may appear in Google error messages are replaced with `[REDACTED]`.

### Header Sanitization

Response headers attached to error details are sanitized via `sanitizeMetadata()`:

```typescript
const sanitizedHeaders = sanitizeMetadata(headers) as Record<string, unknown>;
const details = { headers: sanitizedHeaders, reason };
```

### Refresh Error Sanitization

In `GoogleTokenRefreshProvider`, non-OK refresh responses are sanitized:

```typescript
const sanitized = text.replace(/token|secret|key/gi, '[REDACTED]');
throw new Error(`Google token refresh failed (HTTP ${response.status}): ${sanitized}`);
```

### OAuth2 Adapter Error Sanitization

`GoogleOAuth2Adapter` sanitizes refresh failure errors before wrapping them in `ConnectorAuthenticationError`:

```typescript
const sanitized = sanitizeMetadata({ error: err instanceof Error ? err.message : String(err) });
throw new ConnectorAuthenticationError(
  GOOGLE_CONNECTOR_ID, 'refreshToken', 'unknown',
  `Google OAuth2 token refresh failed: ${(sanitized as Record<string, unknown>)['error'] ?? 'unknown error'}`,
);
```

---

## Error Hierarchy

```
ConnectorRuntimeError (base)
  ├─ ConnectorAuthenticationError    — 401, token refresh failures
  ├─ ConnectorRateLimitError         — 429, rate-limit reasons on 403
  └─ ConnectorRuntimeError           — all other mapped errors
       ├─ VALIDATION_ERROR           — 400, 404, 412
       ├─ AUTHORIZATION_ERROR        — 403 (permissions/forbidden)
       ├─ PROVIDER_ERROR             — 409, 500-599
       ├─ NETWORK_ERROR              — fetch failures
       └─ INTERNAL_ERROR             — unexpected statuses
```

---

## Error Details Structure

Every mapped error includes a `details` object with sanitized headers and the extracted reason:

```typescript
{
  headers: Record<string, unknown>,  // sanitized response headers
  reason: string | null               // Google error reason (e.g. "rateLimitExceeded")
}
```

This metadata is available to the runtime pipeline for telemetry, tracing, and circuit-breaker decisions.
