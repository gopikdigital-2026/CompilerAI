# Resilience

## Overview

The resilience layer provides four patterns that protect connector operations from transient failures, timeouts, and overload:

1. **Retry Policy** — Exponential backoff with jitter
2. **Timeout Policy** — AbortSignal-based timeout enforcement
3. **Circuit Breaker** — Fault isolation with state machine
4. **Rate Limiter** — Token bucket per-operation throttling

## Retry Policy

### Configuration

```typescript
import { RetryPolicy } from '@compilerai/connectors';

const policy = new RetryPolicy({
  maxAttempts: 3,            // Max retry attempts (default: 3)
  initialDelayMs: 250,       // First retry delay (default: 250)
  maxDelayMs: 5000,          // Delay cap (default: 5000)
  backoffMultiplier: 2,      // Exponential base (default: 2)
  jitter: true,              // Add ±25% jitter (default: true)
  retryableErrorCodes: ['NETWORK_ERROR', 'PROVIDER_ERROR', 'RATE_LIMIT_ERROR'],
  nonRetryableErrorCodes: ['VALIDATION_ERROR', 'AUTHENTICATION_ERROR', 'AUTHORIZATION_ERROR', 'CANCELLED_ERROR'],
});
```

### Retry Decision Logic

1. If error code is in `nonRetryableErrorCodes` → no retry
2. If error code is in `retryableErrorCodes` → retry (up to maxAttempts)
3. If error code is not in either list → retry only if operation is idempotent
4. If attempt >= maxAttempts → no retry

### Backoff Calculation

```
delay = initialDelayMs * (multiplier ^ (attempt - 1))
delay = min(delay, maxDelayMs)
if jitter: delay += random(-25%, +25%) of delay
```

### Retry-After Header Support

```typescript
const delay = policy.applyRetryAfter(retryAfterMs, attempt);
// Uses retryAfterMs if provided, capped at maxDelayMs
// Falls back to computed delay if retryAfterMs is 0
```

## Timeout Policy

### Configuration

```typescript
import { TimeoutPolicy } from '@compilerai/connectors';

const policy = new TimeoutPolicy({
  defaultTimeoutMs: 30_000,  // Default timeout (default: 30s)
  maxTimeoutMs: 120_000,     // Maximum allowed timeout (default: 120s)
});
```

### AbortSignal Creation

The timeout policy creates an `AbortSignal` that combines an external signal (user cancellation) with a timeout timer:

```typescript
const { signal, timer } = policy.createAbortSignal(5000, externalSignal);
// signal aborts after 5000ms OR when externalSignal aborts
// timer must be cleared after operation completes
```

### Timeout vs Cancellation

When an `AbortError` is caught:
- If the **external signal** was aborted → `CANCELLED_ERROR`
- If the **timeout signal** was aborted (no external signal) → `TIMEOUT_ERROR`

## Circuit Breaker

### States

```
CLOSED → (failures >= threshold) → OPEN
OPEN → (after openDurationMs) → HALF_OPEN
HALF_OPEN → (successes >= successThreshold) → CLOSED
HALF_OPEN → (any failure) → OPEN
```

### Configuration

```typescript
import { CircuitBreaker } from '@compilerai/connectors';

const cb = new CircuitBreaker({
  failureThreshold: 5,        // Failures to open (default: 5)
  successThreshold: 2,        // Successes to close from half-open (default: 2)
  openDurationMs: 30_000,     // Time before half-open (default: 30s)
  monitoredErrorCodes: ['PROVIDER_ERROR', 'NETWORK_ERROR', 'TIMEOUT_ERROR'],
});
```

### Isolation

Circuits are tracked per `organizationId:connectorId:operation`. A failure in one operation does not affect another.

### API

```typescript
cb.canExecute(connectorId, orgId, operation); // boolean
cb.getState(connectorId, orgId, operation);   // 'CLOSED' | 'OPEN' | 'HALF_OPEN'
cb.recordSuccess(connectorId, orgId, operation);
cb.recordFailure(connectorId, orgId, operation, errorCode);
cb.getFailureCount(connectorId, orgId, operation);
cb.getOpenUntil(connectorId, orgId, operation); // ISOString | null
cb.reset(connectorId, orgId, operation);
cb.resetAll();
```

## Rate Limiter

### Token Bucket Algorithm

```
capacity = max tokens in bucket
refillRatePerSecond = tokens added per second

On request:
  1. Refill tokens based on elapsed time
  2. If tokens >= 1: consume 1 token, allow
  3. If tokens < 1: deny with retryAfterMs
```

### Configuration

```typescript
import { RateLimiter } from '@compilerai/connectors';

const limiter = new RateLimiter({
  capacity: 100,              // Max burst (default: 100)
  refillRatePerSecond: 10,    // Sustained rate (default: 10)
});
```

### Isolation

Buckets are tracked per `organizationId:connectorId:operation:userId`. Each user gets their own bucket per operation.

### API

```typescript
const result = limiter.check(connectorId, orgId, operation, userId);
// { allowed: boolean, remaining: number, limit: number, resetAt: string, retryAfterMs: number }

limiter.toRateLimitDetails(result); // Convert to error details
limiter.reset(connectorId, orgId, operation, userId);
limiter.resetAll();
```

## Pipeline Integration

All four resilience patterns are integrated into the `ConnectorExecutionPipeline`:

```
Request → Rate Limit → Circuit Breaker → Timeout → Execute → Retry → Result
```

Each can be independently enabled/disabled via `PipelineConfig`:

```typescript
const runtime = new ConnectorRuntime({
  pipeline: {
    enableRateLimit: true,
    enableCircuitBreaker: true,
    enableRetry: true,
    enableTimeout: true,
  },
});
```
