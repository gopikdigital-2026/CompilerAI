# Google Workspace Connector — Architecture

## Overview

The Google Workspace connector (`google-workspace`) provides a typed, secure integration between the Compiler platform and three Google Workspace APIs: Google Drive, Gmail, and Google Calendar. It was introduced in **Sprint 26** and reuses the Sprint 23 connector runtime infrastructure (execution pipeline, resilience, credentials, observability) while adding Google-specific concerns: OAuth2 authentication with refresh-token support, service-based routing, token-based pagination, rate-limit tracking, and error normalization.

The connector exposes **18 operations** across three services and declares **9 capabilities** backed by **8 OAuth2 scopes**.

| Attribute | Value |
|-----------|-------|
| Connector ID | `google-workspace` |
| Version | `1.0.0` |
| Category | `productivity` |
| Vendor | Google LLC |
| Services | Drive, Gmail, Calendar |
| Operations | 18 (Drive: 6, Gmail: 5, Calendar: 7) |
| Auth scheme | OAuth2 (refresh token) |

## Service Endpoints

Each service maps to a distinct Google API base URL. The `GoogleApiClient` routes requests to the correct base URL via a `GoogleService` discriminator.

| Service | Host | Base URL |
|---------|------|----------|
| Drive | `www.googleapis.com` | `https://www.googleapis.com/drive/v3` |
| Gmail | `gmail.googleapis.com` | `https://gmail.googleapis.com/gmail/v1` |
| Calendar | `www.googleapis.com` | `https://www.googleapis.com/calendar/v3` |
| OAuth2 | `oauth2.googleapis.com` | `https://oauth2.googleapis.com/token` |

## Module Layout

```
src/providers/google/
├── index.ts                              # Barrel exports
├── GoogleWorkspaceConnector.ts           # Connector metadata, capabilities, auth requirements
├── GoogleWorkspaceConnectorProvider.ts   # Provider factory (ConnectorProvider)
├── GoogleWorkspaceOperationsFactory.ts   # Operation registration + factory
├── GoogleApiClient.ts                    # HTTP transport with service routing
├── GoogleRequestBuilder.ts               # Fluent URL builder with security checks
├── GoogleErrorMapper.ts                  # HTTP status → ConnectorRuntimeError mapping
├── GoogleRateLimitMapper.ts             # Rate-limit header & error-body extraction
├── GooglePagination.ts                  # Token-based pagination async generator
├── auth/
│   ├── GoogleOAuth2Adapter.ts           # OAuth2 token caching + single-flight refresh
│   ├── GoogleOAuth2Scopes.ts            # Scope constants, endpoints, service-account types
│   └── GoogleTokenRefreshProvider.ts    # Token refresh implementation + test providers
├── types/
│   └── GooglePagination.ts              # Pagination config & page result types
├── drive/
│   ├── types/GoogleDriveTypes.ts
│   ├── mappers/GoogleDriveMapper.ts
│   └── operations/                      # 6 Drive operations
├── gmail/
│   ├── types/GoogleGmailTypes.ts
│   ├── mappers/GoogleGmailMapper.ts
│   └── operations/                      # 5 Gmail operations
└── calendar/
    ├── types/GoogleCalendarTypes.ts
    ├── mappers/GoogleCalendarMapper.ts
    └── operations/                      # 7 Calendar operations
```

## Architecture Layers

### 1. Service-Based Routing

`GoogleApiClient` exposes four HTTP verbs (`get`, `post`, `patch`, `delete`) plus a specialized `postMultipart` for file uploads. Each method takes a `GoogleService` literal (`'drive' | 'gmail' | 'calendar'`) as its first argument. The client maps the service to the correct base URL internally:

```typescript
private getBaseUrl(service: GoogleService): string {
  switch (service) {
    case 'drive': return this.config.driveBaseUrl;    // https://www.googleapis.com/drive/v3
    case 'gmail': return this.config.gmailBaseUrl;    // https://gmail.googleapis.com/gmail/v1
    case 'calendar': return this.config.calendarBaseUrl; // https://www.googleapis.com/calendar/v3
  }
}
```

This design keeps the service-to-URL mapping in one place, making base URL overrides (for testing or regional endpoints) trivial via `GoogleApiClientConfig`.

### 2. OAuth2 Adapter

`GoogleOAuth2Adapter` manages access tokens with:

- **Per-org/user caching** — tokens are cached by `${organizationId}:${userId ?? '*'}`.
- **Proactive refresh** — tokens within 60 seconds of expiry trigger a refresh.
- **Single-flight refresh** — concurrent requests for the same cache key share a single refresh promise, preventing refresh storms.

See [authentication.md](./authentication.md) for full details.

### 3. Operation Factory Pattern

Each of the 18 operations is created by a factory function (e.g. `createListFilesOperation`) that receives the shared `GoogleApiClient` and `GoogleOAuth2Adapter` instances and returns a `ConnectorOperation`. The `GoogleWorkspaceOperationsFactory` aggregates all factories:

```typescript
export function createGoogleWorkspaceOperations(
  client: GoogleApiClient,
  authAdapter: GoogleOAuth2Adapter,
): ConnectorOperation[] {
  return [
    createListFilesOperation(client, authAdapter),
    createGetFileOperation(client, authAdapter),
    // ... 16 more
  ];
}
```

Operations are registered with the `ConnectorRuntime` via `registerGoogleConnector()`, which also guards against duplicate registration.

### 4. ConnectorRuntime Pipeline Integration

Operations are not executed directly. Instead, callers invoke `ConnectorRuntime.execute()`, which runs each operation through the **ConnectorExecutionPipeline** — a multi-stage pipeline providing:

| Stage | Responsibility |
|-------|----------------|
| Retry | Automatic retries for `retryable: true` operations on transient failures |
| Timeout | Per-operation `timeoutMs` enforced via `AbortSignal` |
| Circuit breaker | Opens on sustained provider errors to fail fast |
| Rate limiting | Integrates with `GoogleRateLimitMapper` to respect `Retry-After` and quota signals |
| Telemetry | Emits metrics (duration, success/failure counts) per operation |
| Traces | Distributed tracing spans for each operation execution |
| Audit log | Records who executed what, when, and with what result |
| Error normalization | Google-specific errors are mapped to `ConnectorRuntimeError` subtypes |

See [runtime-integration.md](./runtime-integration.md) for full details.

## Data Flow

```
Caller
  └─ ConnectorRuntime.execute('google-workspace', 'google.drive.listFiles', input)
       └─ ConnectorExecutionPipeline
            ├─ validate input
            ├─ check rate limiter / circuit breaker
            ├─ retry wrapper (if retryable)
            └─ ConnectorOperation.execute(input, context, signal)
                 ├─ GoogleOAuth2Adapter.getAccessToken(orgId, userId, fetchImpl)
                 │    ├─ check token cache (60s refresh threshold)
                 │    ├─ single-flight refresh if needed
                 │    │    └─ GoogleTokenRefreshProvider.refresh()
                 │    │         └─ POST https://oauth2.googleapis.com/token
                 │    └─ return cached or refreshed access token
                 ├─ GoogleApiClient.get('drive', 'files', params, { token, signal })
                 │    └─ GoogleRequestBuilder.build()
                 │         ├─ host allowlist check
                 │         ├─ path traversal check
                 │         └─ fetch(url, { headers, signal })
                 ├─ GoogleRateLimitMapper.extractFromHeaders()
                 ├─ GoogleErrorMapper.mapHttpError()  [on 4xx/5xx]
                 └─ GoogleDriveMapper.mapFileList()
                      └─ Returns normalized GoogleDriveFile[]
```

## Design Principles

1. **Runtime reuse** — All resilience (rate limiting, circuit breaker, timeout, retry), observability (telemetry, traces, audit), and credential management come from the Sprint 23 runtime. The Google connector only provides operations and API-specific logic.

2. **Injectable transport** — `GoogleApiClient` and `GoogleOAuth2Adapter` accept a `FetchLike` function, enabling test-time mock injection without network calls. The transport is propagated via `context.metadata['fetchImpl']`.

3. **Security by default** — Host allowlist prevents SSRF, path traversal detection prevents directory attacks, header injection prevention blocks email smuggling, and token/secret sanitization prevents leakage in errors and telemetry.

4. **Normalized models** — All Google API responses (snake_case, nested payloads) are mapped to camelCase TypeScript interfaces via service-specific mappers (`GoogleDriveMapper`, `GoogleGmailMapper`, `GoogleCalendarMapper`) before returning to callers.

5. **Non-idempotent writes** — `createFolder`, `uploadFile`, `createEvent`, `sendMessage`, and `createDraft` are marked `retryable: false` to prevent duplicate side effects on transient failures.

6. **Service account deferred** — Service account / domain-wide delegation authentication is defined in types but not yet implemented. OAuth2 with refresh token is the supported auth path.
