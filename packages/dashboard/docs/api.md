# API Reference

The dashboard consumes the CompilerAI Platform API via the `@compilerai/sdk-typescript` package. This document maps each dashboard module to the SDK resources and API endpoints it uses.

## SDK Resources

The SDK exposes 8 resources on the `CompilerAI` client:

| Resource | Property | Live? | Dashboard Usage |
|----------|----------|-------|-----------------|
| Executions | `client.executions` | Yes | Execution Explorer, Execution Detail, Trace Viewer |
| Workflows | `client.workflows` | Yes | Workflow Explorer |
| Approvals | `client.approvals` | Yes | Human Review |
| Telemetry | `client.telemetry` | Yes | Trace Viewer, Telemetry charts |
| Health | `client.health` | Yes | Health page |
| Memory | `client.memory` | **Stub** | Memory Explorer (uses mock data) |
| Tools | `client.tools` | **Stub** | Tool Explorer (uses mock data) |

## Endpoint Mapping

### Dashboard Page (`/`)
| Data | SDK Method | API Endpoint | Status |
|------|-----------|--------------|--------|
| Platform stats | — (derived) | — | Mock (no aggregation endpoint) |
| Telemetry series | `telemetry.getEvents()` | `GET /executions/:id/telemetry` | Mock (no time-series endpoint) |

### Execution Explorer (`/executions`)
| Data | SDK Method | API Endpoint | Status |
|------|-----------|--------------|--------|
| Execution list | — | — | **Mock** (no list endpoint exists) |
| Execution detail | `executions.get()` | `GET /executions/:id` | Live |
| Execution result | `executions.getResult()` | `GET /executions/:id/result` | Live |

### Execution Detail (`/executions/:id`)
| Data | SDK Method | API Endpoint | Status |
|------|-----------|--------------|--------|
| Execution | `executions.get()` | `GET /executions/:id` | Live |
| Result | `executions.getResult()` | `GET /executions/:id/result` | Live |
| Trace | `executions.getTrace()` | `GET /executions/:id/trace` | Live |
| Pipeline stages | — | — | Mock (derived from trace) |

### Trace Viewer (`/executions/:id/trace`)
| Data | SDK Method | API Endpoint | Status |
|------|-----------|--------------|--------|
| Events | `executions.getEvents()` | `GET /executions/:id/events` | Live |
| Telemetry events | `telemetry.getEvents()` | `GET /executions/:id/telemetry` | Live |

### Telemetry (`/telemetry`)
| Data | SDK Method | API Endpoint | Status |
|------|-----------|--------------|--------|
| Time series | — | — | **Mock** (no metrics aggregation endpoint) |
| Engine metrics | — | — | **Mock** (no per-engine metrics endpoint) |

### Memory Explorer (`/memory`)
| Data | SDK Method | API Endpoint | Status |
|------|-----------|--------------|--------|
| Memory entries | `memory.query()` | — | **Mock** (SDK stub, no endpoint) |

### Tool Explorer (`/tools`)
| Data | SDK Method | API Endpoint | Status |
|------|-----------|--------------|--------|
| Tool list | `tools.list()` | — | **Mock** (SDK stub, no endpoint) |
| Tool stats | — | — | **Mock** (no usage stats endpoint) |

### Workflow Explorer (`/workflows`)
| Data | SDK Method | API Endpoint | Status |
|------|-----------|--------------|--------|
| Workflow list | `workflows.list()` | `GET /workflows` | Live |
| Workflow detail | `workflows.get()` | `GET /workflows/:id` | Live |

### Human Review (`/approvals`)
| Data | SDK Method | API Endpoint | Status |
|------|-----------|--------------|--------|
| Approval list | `approvals.list()` | `GET /approvals` | Live |
| Approve | `approvals.approve()` | `POST /approvals/:id/approve` | Live |
| Reject | `approvals.reject()` | `POST /approvals/:id/reject` | Live |

### Health (`/health`)
| Data | SDK Method | API Endpoint | Status |
|------|-----------|--------------|--------|
| Health | `health.health()` | `GET /health` | Live |
| Readiness | `health.ready()` | `GET /ready` | Live |
| Version | `health.version()` | `GET /version` | Live |
| Capabilities | `health.capabilities()` | `GET /capabilities` | Live |

## SDK Configuration

```typescript
import { CompilerAI } from '@compilerai/sdk-typescript';

const client = new CompilerAI({
  apiKey: process.env.VITE_API_KEY!,
  organizationId: process.env.VITE_ORGANIZATION_ID!,
  baseUrl: process.env.VITE_API_BASE_URL,
  timeoutMs: 30_000,
});
```

## Data Source Toggle

The dashboard supports switching between live and mock data sources:

```typescript
import { setDataSource } from './api/client';

setDataSource('live'); // use SDK + real API
setDataSource('mock'); // use mock data (default)
```

Currently defaults to `mock` because several endpoints are not yet available (see [api-gaps.md](./api-gaps.md)).
