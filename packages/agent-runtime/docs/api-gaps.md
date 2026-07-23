# API Gaps — Pending Integrations

This document tracks integrations between the Agent Runtime and other CompilerAI platform components that are not yet implemented.

## 1. Supabase Persistence

**Status**: Not implemented

The runtime uses `NullMemoryAdapter` (in-memory Map) by default. A Supabase-backed `IMemoryAdapter` should persist execution state, checkpoints, and shared agent memory across restarts.

**Required tables**:
- `agent_executions` — execution state and status
- `agent_checkpoints` — checkpoint records per task
- `agent_messages` — communication bus messages (audit trail)
- `agent_health` — health status per agent

**RLS policies**: All tables must enforce `organizationId` isolation via `auth.uid()` checks.

**Integration point**: Implement `IMemoryAdapter` with Supabase client; inject into `AgentRuntimeDeps.memory`.

## 2. Platform API Endpoints

**Status**: Not implemented

The Platform API does not yet expose agent runtime endpoints. Suggested routes:

| Method | Path | Description |
|---|---|---|
| POST | `/v1/agents/register` | Register a new agent |
| GET | `/v1/agents` | List agents (org-scoped) |
| GET | `/v1/agents/:id/health` | Get agent health |
| POST | `/v1/agent-executions` | Create and run execution |
| GET | `/v1/agent-executions/:id` | Get execution status |
| POST | `/v1/agent-executions/:id/cancel` | Cancel execution |
| POST | `/v1/agent-executions/:id/resume` | Resume from checkpoint |
| GET | `/v1/agent-executions/:id/messages` | Get message audit trail |
| GET | `/v1/agent-executions/:id/checkpoints` | Get checkpoints |

**Integration point**: Add route registrations in `src/platform/api/routes/RouteRegistration.ts`.

## 3. SDK Resource

**Status**: Not implemented

The TypeScript SDK should add an `AgentRuntimeResource` to wrap the Platform API endpoints.

**Integration point**: Add `AgentRuntimeResource` in `packages/sdk-typescript/src/resources/agents.ts`.

## 4. CLI Commands

**Status**: Not implemented

The CLI should add agent management commands:

```
compiler agents register <profile.json>
compiler agents list
compiler agents health <agentId>
compiler agents run <execution.json>
compiler agents cancel <executionId>
compiler agents resume <executionId>
```

**Integration point**: Add command files in `packages/cli/src/commands/agents.ts`.

## 5. Dashboard UI

**Status**: Not implemented

The observability dashboard should add an Agent Runtime page showing:
- Active agents and their health
- Running executions with task graph visualization
- Checkpoint timeline
- Message audit trail

**Integration point**: Add feature page in `packages/dashboard/src/features/agents/`.

## 6. Telemetry Engine Integration

**Status**: Adapter interface only

The `ITelemetryAdapter` interface is defined but only the `NullTelemetryAdapter` is implemented. A real adapter should forward events to the Telemetry Engine (`src/compiler/core/intelligence/telemetry/`).

**Integration point**: Implement `ITelemetryAdapter` wrapping `ITelemetryEventBus.emit()`.

## 7. Memory Engine Integration

**Status**: Adapter interface only

The `IMemoryAdapter` interface is defined. A real adapter should connect to the Memory Engine (`src/compiler/core/intelligence/memory/`) for cross-agent shared memory.

**Integration point**: Implement `IMemoryAdapter` wrapping `IMemoryEngine.write()` / `retrieve()`.

## 8. Marketplace Integration

**Status**: Adapter interface only

The `IMarketplaceAdapter` interface is defined. A real adapter should query the Marketplace package (`packages/marketplace/`) for installed tools and capabilities.

**Integration point**: Implement `IMarketplaceAdapter` wrapping `MarketplaceService.listInstalled()` and `getDetail()`.

## 9. Execution Engine Integration

**Status**: Adapter interface only

The `IExecutionAdapter` interface is defined. A real adapter should notify the Execution Engine (`src/compiler/core/intelligence/execution/`) of agent execution lifecycle events.

**Integration point**: Implement `IExecutionAdapter` wrapping `IExecutionCoordinator` notifications.
