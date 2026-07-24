# Google Workspace Connector — Rate Limits

## Overview

Google APIs enforce rate limits and quotas through a combination of HTTP headers, error response bodies, and specific `reason` codes. The Google Workspace connector uses `GoogleRateLimitMapper` to extract rate-limit information from both successful responses and error bodies, and integrates with the runtime rate limiter and circuit breaker to throttle or pause traffic as needed.

Unlike GitHub (which uses `X-RateLimit-*` headers consistently), Google's rate limit signals are less uniform — they appear in headers on some endpoints and in error body `reason` fields on others. The mapper handles both paths.

## Google Rate Limit Headers

Google APIs may return the following headers on responses:

| Header | Type | Description |
|--------|------|-------------|
| `X-RateLimit-Limit` | integer | Maximum requests per window |
| `X-RateLimit-Remaining` | integer | Remaining requests in current window |
| `Retry-After` | integer (seconds) | Seconds to wait before retrying (on 429/503) |

> **Note:** Google does not consistently return `X-RateLimit-Reset` (unlike GitHub). The mapper sets `resetAt` to `null` when the header is absent.

## GoogleRateLimitMapper

### extractFromHeaders

Extracts rate-limit info from response headers. Returns `null` if no rate-limit headers are present.

```typescript
static extractFromHeaders(headers: Record<string, string>): GoogleRateLimitInfo | null {
  const hasRateLimitHeader =
    'x-ratelimit-limit' in headers ||
    'x-ratelimit-remaining' in headers ||
    'retry-after' in headers;

  if (!hasRateLimitHeader) return null;

  const retryAfterRaw = headers['retry-after'];
  const retryAfterMs = retryAfterRaw ? this.parseRetryAfter(retryAfterRaw) : null;

  return {
    limit: this.parseIntSafe(headers['x-ratelimit-limit']),
    remaining: this.parseIntSafe(headers['x-ratelimit-remaining']),
    resetAt: null,
    retryAfterMs,
    reason: null,
  };
}
```

**Return type:**

```typescript
interface GoogleRateLimitInfo {
  readonly limit: number | null;
  readonly remaining: number | null;
  readonly resetAt: string | null;
  readonly retryAfterMs: number | null;
  readonly reason: string | null;
}
```

### isRateLimited

Determines whether a response is currently rate-limited based on extracted info:

```typescript
static isRateLimited(rateLimit: GoogleRateLimitInfo | null): boolean {
  if (!rateLimit) return false;
  if (rateLimit.remaining !== null && rateLimit.remaining === 0) return true;  // quota exhausted
  if (rateLimit.retryAfterMs !== null && rateLimit.retryAfterMs > 0) return true; // Retry-After set
  return false;
}
```

### isGoogleRateLimitReason

Checks whether an error `reason` string is a known Google rate-limit reason:

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

| Reason | Trigger |
|--------|---------|
| `rateLimitExceeded` | Project-level request rate too high |
| `userRateLimitExceeded` | Per-user request rate too high |
| `quotaExceeded` | Specific quota exhausted |
| `dailyLimitExceeded` | Daily aggregate limit reached |

### extractFromErrorBody

Extracts the error reason from a Google API error response body:

```typescript
static extractFromErrorBody(body: unknown): string | null {
  const errorBody = body as { error?: { errors?: readonly { reason?: string }[]; reason?: string } } | null;
  const reasons = errorBody?.error?.errors;
  if (reasons && reasons.length > 0 && reasons[0]?.reason) {
    return reasons[0].reason;
  }
  return errorBody?.error?.reason ?? null;
}
```

Google nests reasons inside `error.errors[].reason` (an array). The mapper takes the first reason. If the array is absent, it falls back to `error.reason`.

### toMetadata

Converts rate-limit info into a flat metadata object for telemetry and tracing:

```typescript
static toMetadata(rateLimit: GoogleRateLimitInfo): Record<string, unknown> {
  return {
    rateLimitLimit: rateLimit.limit,
    rateLimitRemaining: rateLimit.remaining,
    rateLimitResetAt: rateLimit.resetAt,
    rateLimitRetryAfterMs: rateLimit.retryAfterMs,
    rateLimitReason: rateLimit.reason,
  };
}
```

---

## Integration with Runtime Rate Limiter

The `GoogleApiClient` extracts rate-limit info from every response and attaches it to the `GoogleResponse`:

```typescript
const responseHeaders = this.extractHeaders(response);
const rateLimit = GoogleRateLimitMapper.extractFromHeaders(responseHeaders);

return { status: response.status, data, headers: responseHeaders, rateLimit };
```

The runtime's rate-limiter stage uses this info to:

1. **Track remaining quota** — Updates the rate limiter's view of available capacity.
2. **Throttle proactively** — If `remaining === 0`, the rate limiter delays subsequent requests until the window resets.
3. **Respect `Retry-After`** — When `retryAfterMs` is set, the rate limiter waits at least that long before allowing the next request.

## Integration with Circuit Breaker

When a `ConnectorRateLimitError` is thrown (from 429 or rate-limit reasons on 403), the circuit breaker treats it as a provider failure. Sustained rate-limit errors can open the circuit, causing the pipeline to fail fast rather than continuously hitting rate-limited endpoints.

The `GoogleErrorMapper.createRateLimitError()` method populates the error with retry guidance:

```typescript
return new ConnectorRateLimitError(
  connectorId, operation, executionId,
  {
    limit: rateLimit?.limit ?? 0,
    remaining: rateLimit?.remaining ?? 0,
    resetAt: rateLimit?.resetAt ?? new Date().toISOString(),
    retryAfterMs: retryAfterMs && retryAfterMs > 0 ? retryAfterMs : undefined,
  } as never,
);
```

## Retry-After Parsing

The `Retry-After` header is parsed as an integer representing seconds, converted to milliseconds:

```typescript
private static parseRetryAfter(value: string): number | null {
  const parsed = parseInt(value, 10);
  if (!Number.isNaN(parsed)) return parsed * 1000;
  return null;
}
```

> Google typically sends `Retry-After` as a delta-seconds integer (e.g. `Retry-After: 5`). HTTP-date format is not currently parsed.

## Detection Flow

```
Response received
  │
  ├─ GoogleRateLimitMapper.extractFromHeaders(headers)
  │    ├─ Has X-RateLimit-* or Retry-After? → GoogleRateLimitInfo
  │    └─ No rate-limit headers → null
  │
  ├─ status >= 400?
  │    ├─ Yes → GoogleErrorMapper.mapHttpError()
  │    │    ├─ GoogleRateLimitMapper.extractFromErrorBody(body) → reason
  │    │    ├─ 429 → ConnectorRateLimitError (with header-based retryAfterMs)
  │    │    ├─ 403 + isGoogleRateLimitReason(reason) → ConnectorRateLimitError
  │    │    └─ 403 + quota in message → ConnectorRateLimitError
  │    └─ No → return success with rateLimit attached
  │
  └─ Runtime pipeline
       ├─ isRateLimited(rateLimit)? → throttle/delay
       └─ ConnectorRateLimitError thrown? → circuit breaker tracking + retry with backoff
```

## Comparison: Google vs GitHub Rate Limits

| Aspect | Google | GitHub |
|--------|--------|--------|
| Pagination | `nextPageToken` (token-based) | `Link` header (URL-based) |
| Limit header | `X-RateLimit-Limit` (inconsistent) | `X-RateLimit-Limit` (consistent) |
| Remaining header | `X-RateLimit-Remaining` (inconsistent) | `X-RateLimit-Remaining` (consistent) |
| Reset header | Not provided | `X-RateLimit-Reset` (epoch) |
| Retry-After | Seconds (on 429/503) | Seconds (on 429) |
| Error reasons | `rateLimitExceeded`, `userRateLimitExceeded`, `quotaExceeded`, `dailyLimitExceeded` | `X-RateLimit-Remaining: 0` |
| Reason location | `error.errors[].reason` in body | Headers only |
