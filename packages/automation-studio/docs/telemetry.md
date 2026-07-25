# Telemetry

> **Sprint 28** — This guide covers the studio telemetry system: the 23 `StudioEventType` values, the `IStudioTelemetry` interface, the `InMemoryStudioTelemetry` implementation, the no-PII policy, and event filtering.

## Overview

The studio telemetry system records structured events for observability and analytics. It is intentionally lightweight: an in-memory implementation ships by default, the interface is small, and **no personally identifiable information (PII) is ever logged** — only structured metadata and the explicit ids provided by the caller. There are 23 event types spanning workflow, node, connection, simulation, deployment, canvas, and Copilot domains.

```typescript
import { InMemoryStudioTelemetry } from '@compilerai/automation-studio';

const telemetry = new InMemoryStudioTelemetry();
```

## Event Types

There are **23** `StudioEventType` values, grouped by domain:

| # | Event type | Domain | Description |
|---|-----------|--------|-------------|
| 1 | `workflow.created` | Workflow | A new workflow was created |
| 2 | `workflow.published` | Workflow | A workflow was published |
| 3 | `workflow.unpublished` | Workflow | A workflow was unpublished |
| 4 | `workflow.simulated` | Workflow | A simulation was run |
| 5 | `workflow.imported` | Workflow | A workflow was imported from JSON |
| 6 | `workflow.exported` | Workflow | A workflow was exported to JSON |
| 7 | `workflow.duplicated` | Workflow | A workflow was duplicated |
| 8 | `workflow.archived` | Workflow | A workflow was archived |
| 9 | `workflow.version_tagged` | Workflow | A version was tagged |
| 10 | `workflow.version_restored` | Workflow | A version was restored |
| 11 | `node.added` | Node | A node was added to a workflow |
| 12 | `node.removed` | Node | A node was removed from a workflow |
| 13 | `node.updated` | Node | A node's configuration was updated |
| 14 | `connection.added` | Connection | A connection was added |
| 15 | `connection.removed` | Connection | A connection was removed |
| 16 | `simulation.started` | Simulation | A simulation began |
| 17 | `simulation.completed` | Simulation | A simulation completed |
| 18 | `simulation.failed` | Simulation | A simulation failed |
| 19 | `deployment.published` | Deployment | A deployment was published |
| 20 | `deployment.deactivated` | Deployment | A deployment was deactivated |
| 21 | `canvas.zoom_changed` | Canvas | The canvas zoom level changed |
| 22 | `canvas.selection_changed` | Canvas | The canvas selection changed |
| 23 | `copilot.workflow_imported` | Copilot | A workflow was imported from the Copilot |

```typescript
type StudioEventType =
  | 'workflow.created'
  | 'workflow.published'
  | 'workflow.unpublished'
  | 'workflow.simulated'
  | 'workflow.imported'
  | 'workflow.exported'
  | 'workflow.duplicated'
  | 'workflow.archived'
  | 'workflow.version_tagged'
  | 'workflow.version_restored'
  | 'node.added'
  | 'node.removed'
  | 'node.updated'
  | 'connection.added'
  | 'connection.removed'
  | 'simulation.started'
  | 'simulation.completed'
  | 'simulation.failed'
  | 'deployment.published'
  | 'deployment.deactivated'
  | 'canvas.zoom_changed'
  | 'canvas.selection_changed'
  | 'copilot.workflow_imported';
```

## StudioEvent

Every event is a `StudioEvent`:

```typescript
interface StudioEvent {
  type: StudioEventType;
  timestamp: string;                          // ISO timestamp
  organizationId: string | null;              // org scope (nullable)
  workflowId: string | null;                  // workflow scope (nullable)
  userId: string | null;                      // actor (nullable)
  metadata: Record<string, unknown>;          // structured, non-PII payload
}
```

All id fields are nullable so that events can be emitted even when a context is partial (e.g., a canvas zoom change may not have a userId).

## IStudioTelemetry Interface

```typescript
interface IStudioTelemetry {
  emit(event: StudioEvent): void;
  getEvents(): StudioEvent[];
  getEventsByType(type: StudioEventType): StudioEvent[];
  getEventsByWorkflow(workflowId: string): StudioEvent[];
  clear(): void;
}
```

| Method | Description |
|--------|-------------|
| `emit(event)` | Record an event |
| `getEvents()` | Return all recorded events (copy) |
| `getEventsByType(type)` | Filter events by type |
| `getEventsByWorkflow(workflowId)` | Filter events by workflow |
| `clear()` | Remove all events |

## InMemoryStudioTelemetry

The default implementation stores events in an in-memory array with a cap of **10,000 events**. When the cap is exceeded, the oldest event is evicted (FIFO).

```typescript
class InMemoryStudioTelemetry implements IStudioTelemetry {
  emit(event: StudioEvent): void;          // append, evict oldest if > 10000
  getEvents(): StudioEvent[];              // returns a shallow copy
  getEventsByType(type): StudioEvent[];
  getEventsByWorkflow(workflowId): StudioEvent[];
  clear(): void;
}
```

### Behavior

- **`emit`** — Appends the event. If the store exceeds 10,000 entries, `shift()` removes the oldest. This keeps memory bounded for long-running sessions.
- **`getEvents`** — Returns a shallow copy of the events array so callers can't mutate internal state.
- **`getEventsByType` / `getEventsByWorkflow`** — Linear scans with equality checks.
- **`clear`** — Empties the array in place.

## No-PII Policy

The telemetry system is designed to **never log personally identifiable information**. Specifically:

- **No user content** — Node configurations, prompts, email bodies, and workflow payloads are never placed in `metadata`.
- **No free-form text** — The `metadata` field is intended for structured, non-sensitive counts and flags (e.g., `{ stepCount: 5, nodeCount: 12 }`).
- **Explicit ids only** — `organizationId`, `workflowId`, and `userId` are provided by the caller. The telemetry layer does not extract or infer them.
- **No secrets** — API keys, tokens, and credentials are never recorded.

When integrating with an external telemetry backend (e.g., by implementing `IStudioTelemetry` to forward to an analytics platform), maintain this policy: log only aggregate metrics, event types, and the provided scoped ids.

## Event Filtering

### By Type

```typescript
const publishes = telemetry.getEventsByType('workflow.published');
console.log(`Total publishes: ${publishes.length}`);
```

### By Workflow

```typescript
const events = telemetry.getEventsByWorkflow('wf-123');
for (const e of events) {
  console.log(`${e.timestamp} ${e.type}`);
}
// → '2024-... workflow.created'
// → '2024-... node.added'
// → '2024-... workflow.simulated'
// → '2024-... workflow.published'
```

### Combined (manual)

```typescript
const publishedForWf = telemetry
  .getEventsByWorkflow('wf-123')
  .filter((e) => e.type === 'workflow.published');
```

## Code Examples

### Basic Usage

```typescript
import { InMemoryStudioTelemetry } from '@compilerai/automation-studio';

const telemetry = new InMemoryStudioTelemetry();

telemetry.emit({
  type: 'workflow.created',
  timestamp: new Date().toISOString(),
  organizationId: 'org-1',
  workflowId: 'wf-1',
  userId: 'user-1',
  metadata: { category: 'custom' },
});

telemetry.emit({
  type: 'node.added',
  timestamp: new Date().toISOString(),
  organizationId: 'org-1',
  workflowId: 'wf-1',
  userId: 'user-1',
  metadata: { nodeType: 'ai_agent', label: 'Process Request' },
});

console.log(telemetry.getEvents().length);  // 2
```

### Filter by Type

```typescript
const created = telemetry.getEventsByType('workflow.created');
console.log(created.length);  // 1
```

### Filter by Workflow

```typescript
const wfEvents = telemetry.getEventsByWorkflow('wf-1');
console.log(wfEvents.map((e) => e.type));
// → ['workflow.created', 'node.added']
```

### Clear

```typescript
telemetry.clear();
console.log(telemetry.getEvents().length);  // 0
```

### Custom Implementation

You can implement `IStudioTelemetry` to forward events to an external analytics platform while preserving the no-PII policy:

```typescript
import type { IStudioTelemetry, StudioEvent } from '@compilerai/automation-studio';

class AnalyticsTelemetry implements IStudioTelemetry {
  private buffer: StudioEvent[] = [];

  emit(event: StudioEvent): void {
    this.buffer.push(event);
    // Forward to external platform (e.g., PostHog, Datadog)
    // IMPORTANT: only send event.type, scoped ids, and structured metadata.
    // Never send node configs, prompts, or user content.
    externalAnalytics.track(event.type, {
      org: event.organizationId,
      workflow: event.workflowId,
      ...event.metadata,
    });
  }

  getEvents(): StudioEvent[] { return [...this.buffer]; }
  getEventsByType(type: StudioEventType): StudioEvent[] {
    return this.buffer.filter((e) => e.type === type);
  }
  getEventsByWorkflow(workflowId: string): StudioEvent[] {
    return this.buffer.filter((e) => e.workflowId === workflowId);
  }
  clear(): void { this.buffer.length = 0; }
}
```

## Integration

The `StudioApi` facade accepts an optional `IStudioTelemetry` and defaults to `InMemoryStudioTelemetry`. The Copilot import path emits `copilot.workflow_imported` events automatically:

```typescript
import { StudioApi, InMemoryStudioTelemetry } from '@compilerai/automation-studio';

const telemetry = new InMemoryStudioTelemetry();
const api = new StudioApi({
  idGenerator: () => crypto.randomUUID(),
  clock: () => new Date().toISOString(),
  telemetry,
});

await api.importFromCopilot(copilotWorkflow, 'org-1', 'user-1');

const copilotEvents = telemetry.getEventsByType('copilot.workflow_imported');
console.log(copilotEvents.length);  // 1
console.log(copilotEvents[0].metadata);
// → { stepCount: 5, nodeCount: 5 }
```

See `docs/architecture.md` for where telemetry sits in the overall data flow, and `docs/examples.md` for telemetry usage in a full pipeline.
