# API Gaps — Endpoints Not Yet Available

This document lists Platform API endpoints that the SDK is designed to support but do not yet exist on the server.

## Memory Endpoints (NOT IMPLEMENTED)

The Memory Intelligence Engine exists in the backend (`src/compiler/core/intelligence/memory/`) with full functionality, but no HTTP endpoints expose it.

### Suggested Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/memory` | Query memory entries (with filters: type, searchText, limit) |
| `POST` | `/api/v1/memory` | Write a memory entry (idempotent) |
| `DELETE` | `/api/v1/memory/:memoryId` | Delete a memory entry |

### SDK Status

The `MemoryResource` class exists with `query()`, `write()`, and `delete()` methods. All reject with `NotFoundError` referencing this document. When the endpoints are added, replace the stubs with real `transport.request()` calls.

### Suggested DTOs

```typescript
// GET /api/v1/memory?organizationId=...&types=...&searchText=...&limit=...
// Response: ApiSuccessResponse<MemoryEntry[]>

// POST /api/v1/memory
// Body: MemoryWriteRequest { organizationId, type, content, sensitivity?, tags?, metadata? }
// Response: ApiSuccessResponse<MemoryEntry>
```

## Tools Endpoints (NOT IMPLEMENTED)

The Tool Intelligence Engine exists in the backend (`src/compiler/core/intelligence/tools/`) with full functionality, but no HTTP endpoints expose it.

### Suggested Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/tools` | List all registered tools |
| `POST` | `/api/v1/tools/select` | Select tools for a given context |

### SDK Status

The `ToolsResource` class exists with `list()` and `selectTools()` methods. All reject with `NotFoundError` referencing this document.

### Suggested DTOs

```typescript
// GET /api/v1/tools
// Response: ApiSuccessResponse<ToolDefinition[]>

// POST /api/v1/tools/select
// Body: ToolSelectionRequest { organizationId, context, policy? }
// Response: ApiSuccessResponse<ToolExecutionPlan>
```

## Execution List Endpoint (NOT IMPLEMENTED)

The Platform API has no `GET /api/v1/executions` endpoint to list executions. The CLI's `compiler executions list` command cannot fetch a list of executions.

### Suggested Endpoint

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/executions` | List executions with optional filters (status, limit, cursor) |

### SDK Status

The SDK does not expose a `list()` method on the `ExecutionsResource` because there is no endpoint to call.

## Pagination Gaps

### `GET /api/v1/workflows`

The workflows list endpoint does not support pagination despite `PaginationRequestDto` and `PaginationValidator` existing on the server. The SDK's `WorkflowsResource.list()` returns `WorkflowResponse[]` (not paginated). When pagination is added server-side, the SDK should switch to `PaginatedResponse<WorkflowResponse>`.

## Duplicate Endpoints

### `GET /executions/:id/events` vs `GET /executions/:id/telemetry`

Both endpoints return `TelemetryEventResponseDto[]` from the same underlying `runtime.getEvents()` call. The difference:
- `/events` (ExecutionController) checks execution existence and org scope — can return 404
- `/telemetry` (TelemetryController) does not check execution existence — never returns 404

The SDK exposes both via `executions.getEvents()` and `telemetry.getEvents()`. Consider consolidating on the server side.

## Permission Inconsistencies

### `POST /workflows/validate` uses `workflow:read`

The validate endpoint requires `workflow:read` permission (a read permission) despite being a POST request. This is a server-side inconsistency. The SDK does not enforce permissions client-side — it relies on the server's authorization check.

### `GET /capabilities` has no permission check

The capabilities endpoint requires authentication but no specific permission. All other authenticated endpoints check at least one permission.

## Missing Server Features

### Request Timeout

The `REQUEST_TIMEOUT` error code (HTTP 408) is defined in `ApiErrorCodes.ts` but never thrown by the server. The SDK handles timeouts client-side via `AbortController`.

### Runtime Unavailable

The `RUNTIME_UNAVAILABLE` error code (HTTP 503) is defined but never thrown. The SDK would map this to `ServerError` (retryable).
