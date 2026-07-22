# API Gaps — Endpoints Not Available on the Platform API

This document lists endpoints that the CLI is designed to support but do not exist on the Platform API server.

## GET /api/v1/executions (List Executions)

**Status**: NOT IMPLEMENTED

The Platform API has no endpoint to list executions. The `compiler executions list` command outputs guidance on alternative approaches:

- Use `compiler approvals list` to find approvals which reference execution IDs
- Use `compiler executions get <id>` if you know the execution ID

### Suggested Endpoint

```
GET /api/v1/executions?status=RUNNING&limit=50&cursor=...
```

Response: `PaginatedResponse<ExecutionResponseDto>`

This would enable the CLI to show a table of recent executions with their statuses.

---

## Memory Endpoints

**Status**: NOT IMPLEMENTED (inherited from SDK)

The Memory Intelligence Engine exists in the backend but no HTTP endpoints expose it. See `packages/sdk-typescript/docs/api-gaps.md` for details.

CLI commands affected: None currently. When endpoints are added, CLI commands like `compiler memory query` and `compiler memory write` would be added.

---

## Tools Endpoints

**Status**: NOT IMPLEMENTED (inherited from SDK)

The Tool Intelligence Engine exists in the backend but no HTTP endpoints expose it. See `packages/sdk-typescript/docs/api-gaps.md` for details.

CLI commands affected: None currently. When endpoints are added, CLI commands like `compiler tools list` would be added.

---

## POST /api/v1/executions/:id/pause — Body Not Read

The pause endpoint accepts a `PauseExecutionRequestDto` with an optional `reason` field, but the server controller never reads the body. The CLI sends the body regardless — it will be used when the server is fixed.

---

## GET /api/v1/workflows — No Pagination

The workflows list endpoint does not support pagination. The CLI's `compiler workflows list` shows all workflows without cursor-based pagination. When the server adds pagination, the CLI should support `--limit` and `--cursor` flags.

---

## Duplicate Telemetry Endpoints

`GET /executions/:id/events` and `GET /executions/:id/telemetry` return the same data from the same underlying call. The CLI uses both:
- `compiler telemetry trace` uses `/events` (via `executions.getEvents()`)
- The SDK's `telemetry.getEvents()` uses `/telemetry`

Consider consolidating on the server side.
