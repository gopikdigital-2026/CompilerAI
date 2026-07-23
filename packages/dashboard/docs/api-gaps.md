# API Gaps — Endpoints Not Yet Available

This document tracks Platform API endpoints that the Observability Dashboard requires but are not yet implemented. For each gap, we describe what the dashboard needs, what it currently does (mock data), and the recommended endpoint design.

## Summary

| # | Gap | Impact | Dashboard Workaround |
|---|-----|--------|----------------------|
| 1 | No execution listing endpoint | High | Mock data |
| 2 | No telemetry time-series endpoint | High | Mock data |
| 3 | No per-engine metrics endpoint | Medium | Mock data |
| 4 | Memory endpoints not implemented | High | Mock data (SDK stub) |
| 5 | Tool endpoints not implemented | High | Mock data (SDK stub) |
| 6 | No dashboard aggregation endpoint | Medium | Derived from mock executions |
| 7 | No workflow execution status in DAG | Low | Mock node statuses |
| 8 | No approval history/comments endpoint | Low | Mock comments |

---

## 1. Execution Listing Endpoint

**Needed by**: Execution Explorer (`/executions`), Dashboard stats

**Current state**: The SDK's `ExecutionsResource` supports `get()`, `getResult()`, `getEvents()`, `getTrace()`, but there is no `list()` method. The OpenAPI spec has no `GET /executions` endpoint.

**Recommended endpoint**:
```
GET /api/v1/executions
Query params:
  - organizationId (string, optional)
  - status (string, optional, enum)
  - workflowId (string, optional)
  - startedAfter (ISO 8601, optional)
  - startedBefore (ISO 8601, optional)
  - search (string, optional)
  - limit (int, default 20, max 100)
  - cursor (string, optional)
Response: PaginatedResponse<ExecutionSummary>
```

**SDK method**: `executions.list(params?: ListExecutionsParams): Promise<PaginatedResponse<ExecutionSummary>>`

---

## 2. Telemetry Time-Series Endpoint

**Needed by**: Telemetry page (`/telemetry`), Dashboard charts

**Current state**: The SDK's `TelemetryResource` only has `getEvents(executionId)` which returns events for a single execution. There is no endpoint for aggregate time-series data (latency, throughput, error rate, CPU, memory over time).

**Recommended endpoint**:
```
GET /api/v1/telemetry/series
Query params:
  - metric (enum: latency, throughput, errors, cpu, memory)
  - window (enum: 1h, 6h, 24h, 7d)
  - resolution (enum: 10s, 1m, 5m, 1h)
  - organizationId (string, optional)
Response: { data: TelemetrySeriesPoint[], meta: ApiMeta }
```

**SDK method**: `telemetry.getSeries(params?: TelemetrySeriesParams): Promise<TelemetrySeriesPoint[]>`

---

## 3. Per-Engine Metrics Endpoint

**Needed by**: Telemetry page (`/telemetry`) — "Engine Performance" chart

**Current state**: No endpoint exists for aggregated per-engine metrics (average duration, invocation count, failure rate per pipeline stage/engine).

**Recommended endpoint**:
```
GET /api/v1/telemetry/engines
Query params:
  - window (enum: 1h, 6h, 24h, 7d)
  - organizationId (string, optional)
Response: { data: EngineMetric[], meta: ApiMeta }
```

**SDK method**: `telemetry.getEngineMetrics(params?: EngineMetricsParams): Promise<EngineMetric[]>`

---

## 4. Memory Endpoints

**Needed by**: Memory Explorer (`/memory`)

**Current state**: The SDK's `MemoryResource` has `query()`, `write()`, and `delete()` methods, but they are stubs that always reject with `NotFoundError`. No Platform API endpoints exist for memory operations.

**Recommended endpoints**:
```
GET /api/v1/memory
Query params:
  - organizationId (string, required)
  - types (string[], optional)
  - searchText (string, optional)
  - sensitivity (string[], optional)
  - limit (int, default 50, max 200)
  - cursor (string, optional)
Response: PaginatedResponse<MemoryEntry>

POST /api/v1/memory
Body: MemoryWriteRequest
Response: MemoryEntry

DELETE /api/v1/memory/:memoryId
Response: { deleted: boolean }
```

**SDK method**: `memory.query()` already exists — needs the endpoint to be implemented.

---

## 5. Tool Endpoints

**Needed by**: Tool Explorer (`/tools`)

**Current state**: The SDK's `ToolsResource` has `list()` and `selectTools()` methods, but they are stubs that always reject with `NotFoundError`. No Platform API endpoints exist for tool operations.

**Recommended endpoints**:
```
GET /api/v1/tools
Query params:
  - category (string, optional)
  - status (string, optional)
Response: { data: ToolDefinition[], meta: ApiMeta }

GET /api/v1/tools/stats
Query params:
  - window (enum: 1h, 6h, 24h, 7d)
  - organizationId (string, optional)
Response: { data: ToolStats[], meta: ApiMeta }
```

**SDK method**: `tools.list()` already exists — needs the endpoint to be implemented. A new `tools.getStats()` method would be needed for usage statistics.

---

## 6. Dashboard Aggregation Endpoint

**Needed by**: Dashboard page (`/`)

**Current state**: The dashboard calculates stats (active executions, success rate, avg duration, etc.) from execution data. Without an execution listing endpoint (gap #1), this is fully mocked. Even with a listing endpoint, a dedicated aggregation endpoint would be more efficient.

**Recommended endpoint**:
```
GET /api/v1/dashboard/stats
Query params:
  - organizationId (string, optional)
  - window (enum: 1h, 6h, 24h, 7d)
Response: { data: DashboardStats, meta: ApiMeta }
```

**SDK method**: New `dashboard.getStats()` resource.

---

## 7. Workflow Execution Node Status

**Needed by**: Workflow Explorer (`/workflows`)

**Current state**: The `WorkflowResponse` from the API includes node definitions but not per-node execution status or duration. The `WorkflowExecution` model in the runtime layer has `WorkflowStepExecution[]` with per-step state, but there is no API endpoint to retrieve this.

**Recommended**: Add execution status fields to the workflow response, or provide a separate endpoint:
```
GET /api/v1/workflows/:workflowId/executions/:executionId
Response: WorkflowExecution (with step-level status)
```

---

## 8. Approval History & Comments

**Needed by**: Human Review (`/approvals`)

**Current state**: The `ApprovalResponse` includes `status`, `createdAt`, but does not include `comment`, `reviewedBy`, or `decidedAt` fields. The SDK's `ApprovalDecisionRequest` accepts a comment, but the response doesn't echo it back.

**Recommended**: Extend `ApprovalResponse` to include:
```typescript
{
  ...existing fields...
  comment: string | null;
  reviewedBy: string | null;
  decidedAt: string | null;
}
```

---

## Priority Recommendations

1. **High**: Implement execution listing endpoint (#1) — enables the core Execution Explorer
2. **High**: Implement memory endpoints (#4) — enables Memory Explorer
3. **High**: Implement tool endpoints (#5) — enables Tool Explorer
4. **Medium**: Implement telemetry time-series (#2) — enables real telemetry charts
5. **Medium**: Implement dashboard aggregation (#6) — efficient dashboard stats
6. **Low**: Per-engine metrics (#3), node status (#7), approval history (#8)
