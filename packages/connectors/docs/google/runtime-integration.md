# Google Workspace Connector — Runtime Integration

## Overview

The Google Workspace connector does not execute operations directly. Instead, operations are registered with the `ConnectorRuntime` and executed through the **ConnectorExecutionPipeline** — a multi-stage pipeline that provides resilience (retry, timeout, circuit breaker, rate limiting), observability (telemetry, traces, audit log), and error normalization. This document describes how the connector integrates with the runtime.

## Registration

### registerGoogleConnector

The primary entry point for registering the Google connector with the runtime:

```typescript
import { registerGoogleConnector } from '@compiler/connectors/providers/google';

const { client, authAdapter } = registerGoogleConnector({
  runtime,
  credentialResolver,
  apiClientConfig: { timeoutMs: 30_000 },  // optional
  transport: mockFetch,                     // optional (testing)
  refreshProvider: testRefreshProvider,     // optional (testing)
  telemetry,                                 // optional
});
```

### Registration Flow

```typescript
export function registerGoogleConnector(options: RegisterGoogleConnectorOptions) {
  // 1. Create the API client with config + optional transport
  const client = new GoogleApiClient(
    options.apiClientConfig ?? DEFAULT_GOOGLE_CONFIG,
    options.transport,
  );

  // 2. Create the OAuth2 adapter with credential resolver + refresh provider
  const refreshProvider = options.refreshProvider ?? new GoogleTokenRefreshProvider();
  const authAdapter = new GoogleOAuth2Adapter(options.credentialResolver, refreshProvider);

  // 3. Create all 18 operations and register each one
  for (const op of createGoogleWorkspaceOperations(client, authAdapter)) {
    if (runtime_hasOperation(options.runtime, op.name)) {
      throw new Error(`Duplicate operation registration: ${op.name}`);
    }
    options.runtime.registerOperation(GOOGLE_CONNECTOR_ID, op);
  }

  return { client, authAdapter };
}
```

### Duplicate Registration Guard

Before registering each operation, the factory checks whether it is already registered:

```typescript
function runtime_hasOperation(runtime: ConnectorRuntime, operationName: string): boolean {
  return runtime.hasOperation(GOOGLE_CONNECTOR_ID, operationName);
}
```

If a duplicate is detected, a descriptive error is thrown. This prevents accidental double-registration (e.g., calling `registerGoogleConnector` twice in the same process).

### RegisterGoogleConnectorOptions

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `runtime` | `ConnectorRuntime` | Yes | The runtime to register operations with |
| `credentialResolver` | `CredentialResolver` | Yes | Resolves org/user credentials |
| `apiClientConfig` | `GoogleApiClientConfig` | No | Override base URLs, timeout, max payload |
| `transport` | `FetchLike` | No | Injectable fetch implementation (testing) |
| `refreshProvider` | `IGoogleTokenRefreshProvider` | No | Injectable token refresh (testing) |
| `telemetry` | `ConnectorTelemetry` | No | Telemetry sink |

### Operation Names

All 18 operations are registered under the `google-workspace` connector ID with namespaced names:

```
google.drive.listFiles          google.gmail.listMessages       google.calendar.listCalendars
google.drive.getFile            google.gmail.getMessage          google.calendar.getCalendar
google.drive.searchFiles        google.gmail.listLabels          google.calendar.listEvents
google.drive.createFolder       google.gmail.sendMessage         google.calendar.getEvent
google.drive.uploadFile         google.gmail.createDraft         google.calendar.createEvent
google.drive.updateFileMetadata                                  google.calendar.updateEvent
                                                                 google.calendar.queryFreeBusy
```

The full list is exported as `GOOGLE_OPERATION_NAMES`.

---

## ConnectorExecutionPipeline

When a caller invokes `ConnectorRuntime.execute('google-workspace', 'google.drive.listFiles', input)`, the runtime runs the operation through the ConnectorExecutionPipeline:

```
ConnectorRuntime.execute(connectorId, operationName, input, context)
  │
  ▼
┌─────────────────────────────────────────────────────┐
│           ConnectorExecutionPipeline                │
│                                                     │
│  1. Resolve operation by connectorId + name         │
│  2. Validate input (operation.validateInput)        │
│  3. Check rate limiter                              │
│  4. Check circuit breaker                           │
│  5. Start telemetry span + trace                    │
│  6. Execute with timeout (AbortSignal)              │
│  7. Retry on failure (if retryable)                 │
│  8. Normalize errors (ConnectorRuntimeError)        │
│  9. Record audit log entry                          │
│ 10. Emit telemetry metrics                          │
│ 11. Return result                                   │
└─────────────────────────────────────────────────────┘
  │
  ▼
ConnectorOperation.execute(input, context, signal)
```

### Pipeline Stages

| Stage | Responsibility | Google-Specific Behavior |
|-------|----------------|--------------------------|
| **Input validation** | Calls `operation.validateInput()` | Validates org ID, field types, email format, header injection, date/time formats |
| **Rate limiter** | Checks if requests can proceed | Uses `GoogleRateLimitMapper` data to throttle on `remaining=0` or `Retry-After` |
| **Circuit breaker** | Fails fast if provider is degraded | Opens on sustained 5xx or rate-limit errors |
| **Timeout** | Enforces per-operation `timeoutMs` via `AbortSignal` | 15s for reads, 30s for writes/uploads |
| **Retry** | Retries `retryable: true` operations on transient errors | Network errors and 5xx (backendError) retried; write ops not retried |
| **Telemetry** | Records duration, success/failure, rate-limit metrics | Emits `GoogleRateLimitMapper.toMetadata()` as span attributes |
| **Traces** | Creates distributed trace spans | Operation name, connector ID, status, error category |
| **Audit log** | Records execution event | Who (userId), what (operation), when, result |
| **Error normalization** | Maps thrown errors to `ConnectorRuntimeError` | `GoogleErrorMapper` converts HTTP errors; network errors auto-mapped |

---

## Injectable Transport

### FetchLike

The connector accepts an injectable `fetch` implementation via two paths:

1. **`GoogleApiClient` constructor** — `new GoogleApiClient(config, fetchImpl?)`
2. **Execution context** — `context.metadata['fetchImpl']` (per-request override)

```typescript
export type FetchLike = typeof fetch;
```

### Per-Request Transport

Each operation reads the transport from the execution context and passes it to both the auth adapter and the API client:

```typescript
async execute(input, context, signal): Promise<Output> {
  const token = await authAdapter.getAccessToken(
    typedInput.organizationId,
    context.userId,
    context.metadata['fetchImpl'] as FetchLike | undefined,  // auth uses this transport
  );

  const response = await client.get(
    'drive', 'files', params,
    { token, signal, fetchImpl: context.metadata['fetchImpl'] as FetchLike | undefined },  // API uses this transport
  );
  // ...
}
```

This allows the runtime to inject a mock fetch for testing without modifying the `GoogleApiClient` instance, and allows different transports per execution (e.g., a logging proxy in one context and direct fetch in another).

### Default Transport

If no transport is provided, the global `fetch` is used:

```typescript
this.fetchImpl = fetchImpl ?? fetch;  // GoogleApiClient
const fetchFn = transport ?? fetch;   // GoogleTokenRefreshProvider
```

---

## Non-Idempotent Write Operations

Five operations are marked `retryable: false, idempotent: false`. The pipeline will **not** retry these on transient failures, preventing duplicate side effects:

| Operation | Side Effect |
|-----------|-------------|
| `google.drive.createFolder` | Creates a new folder (duplicate on retry) |
| `google.drive.uploadFile` | Uploads file content (duplicate on retry) |
| `google.gmail.sendMessage` | Sends an email (duplicate on retry) |
| `google.gmail.createDraft` | Creates a draft (duplicate on retry) |
| `google.calendar.createEvent` | Creates a calendar event (duplicate on retry) |

### Retryable Operations

The remaining 13 operations are `retryable: true`:

| Operation | Retryable Because |
|-----------|-------------------|
| `google.drive.listFiles` | Read-only, idempotent |
| `google.drive.getFile` | Read-only, idempotent |
| `google.drive.searchFiles` | Read-only, idempotent |
| `google.drive.updateFileMetadata` | PATCH is idempotent (last-write-wins) |
| `google.gmail.listMessages` | Read-only, idempotent |
| `google.gmail.getMessage` | Read-only, idempotent |
| `google.gmail.listLabels` | Read-only, idempotent |
| `google.calendar.listCalendars` | Read-only, idempotent |
| `google.calendar.getCalendar` | Read-only, idempotent |
| `google.calendar.listEvents` | Read-only, idempotent |
| `google.calendar.getEvent` | Read-only, idempotent |
| `google.calendar.updateEvent` | PATCH is idempotent |
| `google.calendar.queryFreeBusy` | Read-only, idempotent |

> **Note:** `updateFileMetadata` and `updateEvent` use PATCH and are considered idempotent (last-write-wins). They are retryable because applying the same patch twice produces the same result.

---

## ConnectorExecutionPipeline + Google Error Integration

When an operation throws, the pipeline's error normalization stage benefits from the `GoogleErrorMapper` having already converted the error:

| Google Error | Mapped To | Pipeline Behavior |
|--------------|-----------|-------------------|
| Network failure | `ConnectorRuntimeError` (NETWORK_ERROR, retryable) | Retried if operation is retryable |
| 401 | `ConnectorAuthenticationError` | Not retried; caller must refresh credentials |
| 429 | `ConnectorRateLimitError` | Retried with backoff respecting `Retry-After` |
| 403 (rate limit reason) | `ConnectorRateLimitError` | Retried with backoff |
| 403 (permissions) | `ConnectorRuntimeError` (AUTHORIZATION_ERROR) | Not retried |
| 404 | `ConnectorRuntimeError` (VALIDATION_ERROR) | Not retried |
| 409 | `ConnectorRuntimeError` (PROVIDER_ERROR, retryable) | Retried |
| 500–599 (backendError) | `ConnectorRuntimeError` (PROVIDER_ERROR, retryable) | Retried |
| 500–599 (other) | `ConnectorRuntimeError` (PROVIDER_ERROR, not retryable) | Not retried |

---

## Connector Metadata

The `GoogleWorkspaceConnector` class exposes static metadata used by the runtime for registration and discovery:

```typescript
const METADATA: ConnectorMetadata = {
  id: 'google-workspace',
  displayName: 'Google Workspace',
  description: 'Google Workspace connector for Google Drive, Gmail, and Calendar',
  category: 'productivity',
  icon: 'google',
  vendor: 'Google LLC',
  documentationUrl: 'https://developers.google.com/workspace',
  version: '1.0.0',
  tags: ['google', 'gmail', 'drive', 'calendar', 'workspace', 'productivity'],
};
```

The `GoogleWorkspaceConnectorProvider` implements `ConnectorProvider` and returns this metadata, the capabilities array, and the auth requirements to the runtime's connector registry.

### onExecute Not Supported

The `GoogleWorkspaceConnector` extends `BaseConnector` but its `onExecute()` method throws — operations are meant to be executed through the runtime, not directly:

```typescript
protected async onExecute(capability, input): Promise<unknown> {
  throw new Error(
    'GoogleWorkspaceConnector.onExecute is not supported. Use ConnectorRuntime.execute() ' +
    'with registered Google operations via registerGoogleConnector().'
  );
}
```
