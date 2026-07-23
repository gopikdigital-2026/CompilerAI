# Connector Runtime

## Overview

The Connector Runtime is the execution layer that orchestrates connector operations through a resilience pipeline. It provides a single entry point (`ConnectorRuntime`) for executing operations with automatic retry, timeout, circuit breaking, rate limiting, telemetry, and audit logging.

## Architecture

```
ConnectorRuntime (facade)
  └── ConnectorExecutionPipeline
        ├── OperationRegistry → ConnectorOperationExecutor
        ├── RetryPolicy + ExponentialBackoff
        ├── TimeoutPolicy (AbortSignal-based)
        ├── CircuitBreaker
        ├── RateLimiter (token bucket)
        ├── ConnectorTelemetry
        ├── ConnectorMetrics
        ├── ConnectorTrace
        └── AuditLog
```

## Execution Pipeline

Every operation flows through this pipeline:

1. **Validate Request** — Check connector ID and operation name exist
2. **Resolve Connector** — Look up operation in registry
3. **Check Rate Limit** — Token bucket per org:connector:operation:user
4. **Check Circuit Breaker** — Reject if circuit is OPEN
5. **Apply Timeout** — Create AbortSignal from timeout + external signal
6. **Execute Operation** — Call operation's `execute()` with combined signal
7. **Apply Retry** — Retry on transient failures with exponential backoff
8. **Emit Telemetry** — Record started/completed/failed/retried events
9. **Record Metrics** — Track execution count, duration, retries
10. **Write Audit Log** — Immutable audit event for compliance
11. **Return Normalized Result** — `ConnectorOperationResult` with data or error

## Usage

```typescript
import { ConnectorRuntime, createExecutionContext, TEST_CONNECTOR_ID, TEST_OPERATIONS } from '@compilerai/connectors';

const runtime = new ConnectorRuntime();

// Register operations
for (const op of TEST_OPERATIONS) {
  runtime.registerOperation(TEST_CONNECTOR_ID, op);
}

// Execute
const context = createExecutionContext({ organizationId: 'org-1', userId: 'user-1' });
const result = await runtime.execute({
  connectorId: TEST_CONNECTOR_ID,
  operation: 'echo',
  input: { message: 'hello' },
  context,
});

if (result.success) {
  console.log(result.data);
} else {
  console.error(result.error?.errorCode, result.error?.message);
}
```

## Operation Contract

```typescript
interface ConnectorOperation<TInput, TOutput> {
  name: string;
  execute(input: TInput, context: ConnectorExecutionContext, signal: AbortSignal): Promise<TOutput>;
  validateInput(input: TInput): string[];
  requiredCapabilities: string[];
  timeoutMs: number;
  retryable: boolean;
  idempotent: boolean;
}
```

## Configuration

The runtime accepts optional overrides for all subsystems:

```typescript
const runtime = new ConnectorRuntime({
  retryPolicy: new RetryPolicy({ maxAttempts: 5 }),
  backoff: new ExponentialBackoff({ initialDelayMs: 100 }),
  timeoutPolicy: new TimeoutPolicy({ defaultTimeoutMs: 10000 }),
  circuitBreaker: new CircuitBreaker({ failureThreshold: 10 }),
  rateLimiter: new RateLimiter({ capacity: 50, refillRatePerSecond: 5 }),
  telemetry: customTelemetry,
  metrics: customMetrics,
  trace: customTrace,
  auditLog: customAuditLog,
  pipeline: {
    enableRateLimit: true,
    enableCircuitBreaker: true,
    enableRetry: true,
    enableTimeout: true,
  },
});
```

## Accessing Subsystems

```typescript
runtime.getTelemetry().getEvents();
runtime.getMetrics().getSnapshot({ connectorId, organizationId, operation });
runtime.getTrace().getSpansByExecution(executionId);
runtime.getAuditLog().getEvents();
runtime.getCircuitBreaker().getState(connectorId, orgId, operation);
runtime.getRateLimiter().check(connectorId, orgId, operation, userId);
runtime.getRetryPolicy().shouldRetry(errorCode, attempt, isIdempotent);
runtime.getTimeoutPolicy().resolveTimeout(operationTimeoutMs);
runtime.reset(); // Reset all state
```

## Error Handling

All errors are normalized to `ConnectorRuntimeError` subclasses:

| Error Class | Code | Retryable |
|---|---|---|
| `ConnectorRuntimeError` | varies | varies |
| `ConnectorAuthenticationError` | `AUTHENTICATION_ERROR` | No |
| `ConnectorRateLimitError` | `RATE_LIMIT_ERROR` | Yes |
| `ConnectorTimeoutError` | `TIMEOUT_ERROR` | No |
| `ConnectorCircuitOpenError` | `CIRCUIT_OPEN_ERROR` | No |

## Test Provider

The package includes a test connector with 7 operations:

| Operation | Purpose |
|---|---|
| `echo` | Returns input message (success case) |
| `fail` | Throws specified error code |
| `timeout` | Sleeps beyond timeout |
| `rateLimited` | Always throws rate limit error |
| `requiresAuth` | Always throws auth error |
| `refreshToken` | Simulates token refresh |
| `unstableOperation` | Fails N times then succeeds |
