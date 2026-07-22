# Executions API

## Endpoints

### Create Execution

```
POST /api/v1/executions
```

Submits a new intelligence execution. The execution runs asynchronously — the response returns `202 Accepted` with execution metadata.

**Request Body:**

```json
{
  "workflowId": "wf-abc123",
  "input": {
    "prompt": "Analyze sales performance and recommend actions."
  },
  "idempotencyKey": "idem-001",
  "metadata": {}
}
```

**Required permissions:** `execution:create`

**Response (202):**

```json
{
  "data": {
    "executionId": "exec-001",
    "status": "CREATED",
    "createdAt": "2026-01-01T00:00:00.000Z",
    "links": {
      "self": "/api/v1/executions/exec-001",
      "events": "/api/v1/executions/exec-001/events"
    }
  },
  "meta": { ... }
}
```

### Get Execution

```
GET /api/v1/executions/{executionId}
```

**Required permissions:** `execution:read`

Returns the current execution state. Cross-org access returns 404.

### Get Execution Result

```
GET /api/v1/executions/{executionId}/result
```

**Required permissions:** `execution:read`

Returns the full result including intelligence output, events, warnings, and errors.

### Get Execution Events

```
GET /api/v1/executions/{executionId}/events
```

**Required permissions:** `telemetry:read`

Returns the list of telemetry events for the execution.

### Get Execution Trace

```
GET /api/v1/executions/{executionId}/trace
```

**Required permissions:** `telemetry:read`

Returns the execution trace with stage-level timing.

### Pause Execution

```
POST /api/v1/executions/{executionId}/pause
```

**Required permissions:** `execution:pause`

**Request Body (optional):**

```json
{
  "reason": "Manual review needed"
}
```

### Resume Execution

```
POST /api/v1/executions/{executionId}/resume
```

**Required permissions:** `execution:resume`

**Request Body:**

```json
{
  "resumeToken": "..."
}
```

### Cancel Execution

```
POST /api/v1/executions/{executionId}/cancel
```

**Required permissions:** `execution:cancel`

Cancels the execution and triggers compensation. Terminal-state executions return 409.

**Request Body (optional):**

```json
{
  "reason": "No longer needed"
}
```

## Execution States

| Status | Description |
|--------|-------------|
| `CREATED` | Execution created, not yet started |
| `VALIDATING` | Request validation in progress |
| `RUNNING` | Execution in progress |
| `WAITING_FOR_APPROVAL` | Paused at a human approval gate |
| `PAUSED` | Manually paused |
| `RESUMING` | Resuming from pause/checkpoint |
| `COMPLETED` | Successfully completed |
| `PARTIAL` | Completed with some step failures |
| `BLOCKED` | Blocked by a validation or approval rejection |
| `CANCELLED` | Cancelled by user |
| `FAILED` | Failed with error |

Terminal states: `COMPLETED`, `FAILED`, `CANCELLED`. No further transitions allowed from terminal states.
