# Observability

## Overview

The observability layer provides four subsystems for monitoring connector operations:

1. **Telemetry** — Event stream of execution lifecycle
2. **Metrics** — Aggregated performance counters
3. **Trace** — Distributed tracing spans
4. **Audit Log** — Immutable compliance events

## Telemetry

### Event Types

| Event Type | When Emitted |
|---|---|
| `connector.execution.started` | Before pipeline execution |
| `connector.execution.completed` | After successful execution |
| `connector.execution.failed` | After failed execution |
| `connector.execution.retried` | Before each retry attempt |
| `connector.execution.cancelled` | When operation is cancelled |
| `connector.rate_limit.exceeded` | When rate limit denies request |
| `connector.circuit.opened` | When circuit transitions to OPEN |
| `connector.circuit.closed` | When circuit transitions to CLOSED |
| `connector.authentication.refreshed` | When OAuth2 token is refreshed |

### Usage

```typescript
const telemetry = runtime.getTelemetry();

// Subscribe to events
const unsubscribe = telemetry.on((event) => {
  console.log(event.type, event.metadata);
});

// Query events
telemetry.getEvents();
telemetry.getEventsByType('connector.execution.completed');
telemetry.getEventsByExecution('exec_123');

// All metadata is automatically sanitized (secrets redacted)
telemetry.clear();
```

### Metadata Sanitization

All telemetry events have their metadata sanitized before storage. Keys matching sensitive patterns are replaced with `[REDACTED]`:

- `apiKey`, `api_key`, `API_KEY`
- `token`, `Token`, `TOKEN`
- `password`, `secret`, `bearer`
- `authorization`

Sanitization is recursive for nested objects.

## Metrics

### Snapshot Fields

```typescript
interface MetricSnapshot {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  cancelledExecutions: number;
  retriedExecutions: number;
  averageDurationMs: number;
  totalDurationMs: number;
  lastExecutionAt: string | null;
}
```

### Usage

```typescript
const metrics = runtime.getMetrics();

// Get snapshot for specific operation
const snapshot = metrics.getSnapshot({
  connectorId: 'slack',
  organizationId: 'org-1',
  operation: 'send_message',
});

// Get all snapshots
const all = metrics.getAllSnapshots();

metrics.recordRateLimit({ connectorId, organizationId, operation });
metrics.recordCircuitOpen({ connectorId, organizationId, operation });
metrics.clear();
```

## Trace

### Span Lifecycle

```
startSpan() → status: 'started'
  ↓
endSpan('completed' | 'failed' | 'cancelled') → status updated, durationMs computed
```

### Usage

```typescript
const trace = runtime.getTrace();

// Spans are created automatically by the pipeline
const spans = trace.getSpansByExecution('exec_123');
const traceSpans = trace.getSpansByTrace('trace_456');

// Span attributes are sanitized (secrets redacted)
trace.clear();
```

### Span Fields

```typescript
interface TraceSpan {
  spanId: string;
  traceId: string;
  parentSpanId: string | null;
  connectorId: string;
  organizationId: string;
  operation: string;
  executionId: string;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  status: 'started' | 'completed' | 'failed' | 'cancelled';
  attributes: Record<string, unknown>;
}
```

## Audit Log

### Audit Events

Audit events are **immutable** (frozen with `Object.freeze`). They cannot be modified after creation.

```typescript
interface ConnectorAuditEvent {
  readonly eventId: string;
  readonly eventType: AuditEventType;
  readonly organizationId: string;
  readonly userId: string | null;
  readonly connectorId: string;
  readonly operation: string;
  readonly executionId: string;
  readonly timestamp: string;
  readonly outcome: 'success' | 'failure' | 'denied' | 'cancelled';
  readonly sanitizedMetadata: Record<string, unknown>;
}
```

### Event Types

| Event Type | Outcome |
|---|---|
| `credential.saved` | success |
| `credential.rotated` | success |
| `credential.deleted` | success |
| `token.refreshed` | success |
| `token.refresh_failed` | failure |
| `execution.started` | success |
| `execution.completed` | success |
| `execution.failed` | failure |
| `execution.cancelled` | cancelled |
| `circuit.opened` | failure |
| `circuit.closed` | success |
| `rate_limit.exceeded` | denied |

### Usage

```typescript
const auditLog = runtime.getAuditLog();

auditLog.getEvents();
auditLog.getEventsByOrganization('org-1');
auditLog.getEventsByConnector('slack');
auditLog.clear();
```

## Integration with Runtime

All four subsystems are automatically wired into the `ConnectorRuntime`. Every execution produces:

- 2+ telemetry events (started + completed/failed)
- 1 metrics record
- 1 trace span
- 1 audit event

Use `runtime.reset()` to clear all observability state.
