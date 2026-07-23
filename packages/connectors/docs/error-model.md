# Error Model

## Overview

All connector runtime errors extend `ConnectorRuntimeError`, which provides a normalized error structure with error codes, retryability flags, and sanitized details.

## Error Hierarchy

```
ConnectorRuntimeError (base)
  ├── ConnectorAuthenticationError
  ├── ConnectorRateLimitError
  ├── ConnectorTimeoutError
  └── ConnectorCircuitOpenError
```

## Base Error

```typescript
class ConnectorRuntimeError extends Error {
  readonly errorCode: ConnectorErrorCode;
  readonly retryable: boolean;
  readonly connectorId: string;
  readonly operation: string;
  readonly executionId: string;
  readonly cause?: Error;
  readonly sanitizedDetails: Record<string, unknown>;
}
```

## Error Codes

| Code | Error Class | Retryable | Description |
|---|---|---|---|
| `VALIDATION_ERROR` | — | No | Input validation failed |
| `AUTHENTICATION_ERROR` | `ConnectorAuthenticationError` | No | Auth failed (invalid token, no credentials) |
| `AUTHORIZATION_ERROR` | — | No | Insufficient permissions |
| `RATE_LIMIT_ERROR` | `ConnectorRateLimitError` | Yes | Rate limit exceeded |
| `TIMEOUT_ERROR` | `ConnectorTimeoutError` | No | Operation timed out |
| `CIRCUIT_OPEN_ERROR` | `ConnectorCircuitOpenError` | No | Circuit breaker is open |
| `PROVIDER_ERROR` | — | Yes | Provider-side failure |
| `NETWORK_ERROR` | — | Yes | Network connectivity issue |
| `CANCELLED_ERROR` | — | No | Operation was cancelled via AbortSignal |
| `INTERNAL_ERROR` | — | No | Unexpected internal error |

## Specialized Errors

### ConnectorAuthenticationError

Non-retryable. Thrown when:
- No credentials found for connector
- Token expired with no refresh token
- Token refresh failed

### ConnectorRateLimitError

Retryable. Includes `RateLimitDetails`:
```typescript
{
  limit: number;
  remaining: number;
  resetAt: string;
  retryAfterMs: number;
}
```

### ConnectorTimeoutError

Non-retryable. Includes `timeoutMs` that was configured.

### ConnectorCircuitOpenError

Non-retryable. Includes `CircuitOpenDetails`:
```typescript
{
  failureCount: number;
  failureThreshold: number;
  openUntil: string;
}
```

## Error Normalization

The `ConnectorOperationExecutor` normalizes all thrown errors:

| Thrown Error | Normalized To |
|---|---|
| `ConnectorRuntimeError` | Returned as-is |
| `DOMException('AbortError')` + external signal aborted | `CANCELLED_ERROR` |
| `DOMException('AbortError')` + no external signal | `TIMEOUT_ERROR` |
| `Error` | `PROVIDER_ERROR` (retryable) |
| Unknown | `INTERNAL_ERROR` (not retryable) |

## Retry Behavior

The `RetryPolicy` determines retryability based on error code:

- **Always retry**: `PROVIDER_ERROR`, `NETWORK_ERROR`, `RATE_LIMIT_ERROR`
- **Never retry**: `VALIDATION_ERROR`, `AUTHENTICATION_ERROR`, `AUTHORIZATION_ERROR`, `CANCELLED_ERROR`
- **Conditional**: Unknown codes retried only if operation is `idempotent`

## Usage in Tests

```typescript
import { ConnectorRuntimeError, ConnectorTimeoutError } from '@compilerai/connectors';

try {
  await runtime.execute(request);
} catch (e) {
  if (e instanceof ConnectorTimeoutError) {
    // Handle timeout
  }
}

// Or check the result
const result = await runtime.execute(request);
if (!result.success && result.error) {
  console.log(result.error.errorCode);
  console.log(result.error.retryable);
}
```
