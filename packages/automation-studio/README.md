# CompilerAI Enterprise Automation Studio

![Sprint 28](https://img.shields.io/badge/Sprint-28-blue)
![Tests](https://img.shields.io/badge/tests-426%20passing-brightgreen)
![Nodes](https://img.shields.io/badge/node%20definitions-25-orange)
![Performance](https://img.shields.io/badge/performance-500%2B%20nodes-success)
![Dependencies](https://img.shields.io/badge/dependencies-0%20external-lightgrey)

A visual environment for designing, simulating, publishing, and monitoring intelligent automation workflows — without writing code. Sprint 28 expands the studio into an enterprise-grade platform with a full canvas interaction model, a 25-definition connector node library, visual dry-run simulation, versioning, deployment management, telemetry, and Copilot integration.

## What is Automation Studio

Automation Studio is the enterprise workflow product built on CompilerAI. It provides a drag-and-drop visual designer with zoom, pan, selection, minimap, and auto-layout; a simulation engine for dry-run testing with cost and duration estimates; a publishing pipeline with version history, structural diffs, tagging, and safe restore; and a real-time execution monitor. Sprint 28 adds a connector node library (Gmail, Google Drive, Calendar, GitHub, HTTP, Webhook, AI, Variables, Retry, Wait), a contextual property inspector with real-time validation and autocomplete, a unified `StudioApi` facade, and bidirectional Copilot integration (`importFromCopilot` / `exportToCopilot`) — all with zero external dependencies and verified performance at 500+ nodes.

## Key Features

- **Visual Designer** — Canvas viewport (zoom 0.1–3.0, pan, fit-to-content, focus), single/multi/box selection with grouping, minimap, and topological auto-layout
- **Node Library** — 25 node definitions (10 base + 15 connector-specific) with search, category filtering, and dynamic connector generation via `IConnectorNodeSource`
- **Property Inspector** — Contextual sections, real-time validation, upstream variable walking, and autocomplete suggestions
- **Visual Simulation** — Dry-run execution with node states (idle/running/completed/failed/skipped), highlights, cost & duration estimation, preflight checks, execution timeline, and confidence scoring
- **Versioning** — Version history, structural diff (added/removed/modified nodes & connections), tagging, find-by-tag, and safe restore (creates a new version from an old snapshot)
- **Deployment** — Publish (validate → version → deploy), activate/deactivate, archive, duplicate, and JSON export/import
- **Telemetry** — 23 structured event types with no-PII policy, in-memory implementation, and event filtering by type and workflow
- **Copilot Integration** — Import Copilot-generated workflows (steps + DAG → auto-laid-out visual workflow) and export Studio workflows back to the Copilot
- **Performance** — Viewport virtualization, batch validation, and memory estimation verified at 500+ nodes
- **Templates** — 7 ready-to-use workflow templates (Customer Service, Email Classification, Document Management, Invoice Approval, HR, Sales, IT Support)
- **Security** — Role-based permissions, organization isolation, pre-publish validation, and audit trail
- **Real-time Monitor** — Track running nodes, completed nodes, errors, checkpoints, and pending approvals
- **Zero External Dependencies** — Fully self-contained; all adapters have null implementations for standalone usage

## Quick Start

```typescript
import { StudioApi, InMemoryStudioTelemetry } from '@compilerai/automation-studio';

const api = new StudioApi({
  idGenerator: () => crypto.randomUUID(),
  clock: () => new Date().toISOString(),
  telemetry: new InMemoryStudioTelemetry(),
});

// Import a Copilot-generated workflow
const workflow = await api.importFromCopilot(copilotWorkflow, 'org-1', 'user-1');

// Simulate (dry run)
const sim = api.visualSimulation.simulate(workflow);
console.log(`Cost: $${sim.totalEstimatedCost.toFixed(4)}`);
console.log(`Duration: ${sim.totalEstimatedDurationMs} ms`);
console.log(`Path: ${sim.executionPath.join(' → ')}`);

// Publish
const deploy = await api.deployment.publish(workflow, 'user-1', 'Initial release');
console.log(`Published as version ${deploy.version}`);
```

### Classic Facade

The original `AutomationStudio` facade remains available for the core services:

```typescript
import { AutomationStudio } from '@compilerai/automation-studio';

const studio = new AutomationStudio({
  idGenerator: () => crypto.randomUUID(),
  clock: () => new Date().toISOString(),
});

const wf = await studio.workflows.create({
  organizationId: 'org-1',
  name: 'My Automation',
  description: 'Process incoming requests',
  category: 'custom',
  createdBy: 'user-1',
});

const trigger = await studio.builder.addNode({
  workflowId: wf.id,
  type: 'trigger',
  label: 'Start',
  positionX: 100,
  positionY: 100,
  config: { eventType: 'webhook' },
});

const result = studio.validator.validate(wf);
console.log(result.valid);

const sim = await studio.simulation.runSimulation(wf, {
  organizationId: 'org-1',
  workflowId: wf.id,
  triggeredBy: 'user-1',
});

const pub = await studio.publishing.publish({
  organizationId: 'org-1',
  workflowId: wf.id,
  publishedBy: 'user-1',
  changelog: 'Initial version',
});
```

## Module Overview

| Module | Class | Description |
|--------|-------|-------------|
| **API** | `StudioApi` | Unified facade wiring all Sprint 28 modules + Copilot import/export |
| **Canvas** | `CanvasViewport` | Zoom (0.1–3.0), pan, fit, coordinate conversion, virtualization, focus |
| **Canvas** | `CanvasSelection` | Single/multi/toggle/box selection, invert, grouping |
| **Canvas** | `MiniMap` | Normalized minimap data generation |
| **Canvas** | `AutoLayout` | Topological layered layout, incremental, batch |
| **Canvas** | `CanvasPerformance` | Virtualization, batch validation, memory estimation, threshold checks |
| **Node Library** | `ConnectorNodeLibrary` | 25 definitions (10 base + 15 connector), search, dynamic generation |
| **Inspector** | `PropertyInspector` | Contextual sections, real-time validation, variable walking, autocomplete |
| **Inspector** | `ValidationFeedback` | Typed validation items (error/warning/info) with categories |
| **Simulation** | `VisualSimulation` | Dry-run with states, highlights, cost/duration, preflight, timeline |
| **Versioning** | `VersionManager` | History, structural diff, tags, restore, snapshots |
| **Deployment** | `DeploymentManager` | Publish, activate/deactivate, archive, duplicate, export/import |
| **Telemetry** | `InMemoryStudioTelemetry` | 23 event types, no PII, filtering, bounded storage |
| **Core** | `AutomationStudio` | Original facade: workflows, builder, validator, simulation, publishing, monitor, collaboration, security |

## Sprint 28 Stats

| Metric | Value |
|--------|-------|
| New source files | 13 |
| New directories | 8 |
| Total tests | 426 (82 existing + 354 new) — all passing |
| Node definitions | 25 (10 base + 15 connector-specific) |
| Connector nodes | gmail_trigger, gmail_send, drive_upload, drive_list, calendar_create, calendar_list, github_create_issue, github_list_issues, http_request, webhook_trigger, ai_prompt, variable_set, variable_get, retry, wait |
| Performance | Verified at 500+ nodes (virtualization + batch processing) |
| Telemetry event types | 23 |
| External dependencies added | 0 |
| Copilot integration | `importFromCopilot` / `exportToCopilot` |

## Documentation

| Document | Description |
|----------|-------------|
| [docs/architecture.md](docs/architecture.md) | High-level architecture, module map, port-and-adapter pattern, data flow, Copilot integration, performance architecture |
| [docs/designer.md](docs/designer.md) | Canvas viewport, selection, minimap, auto-layout, node library, property inspector, performance, keyboard shortcuts |
| [docs/simulation.md](docs/simulation.md) | Visual simulation, node states & highlights, cost & duration tables, preflight checks, timeline, confidence scoring |
| [docs/deployment.md](docs/deployment.md) | Publish workflow, activate/deactivate, archive, duplicate, JSON export/import, deployment info |
| [docs/versioning.md](docs/versioning.md) | Version history, structural diff, tagging, find-by-tag, restore, snapshots |
| [docs/telemetry.md](docs/telemetry.md) | 23 event types, IStudioTelemetry interface, InMemoryStudioTelemetry, no-PII policy, filtering |
| [docs/examples.md](docs/examples.md) | 17 complete TypeScript examples with expected outputs |
| [docs/workflows.md](docs/workflows.md) | Workflow structure, node types, validation rules, status, templates |
| [docs/security.md](docs/security.md) | Role-based permissions, organization isolation, pre-publish validation, audit trail |
| [docs/api.md](docs/api.md) | API reference for the core AutomationStudio facade and services |

## Integration Adapters

Automation Studio reuses existing CompilerAI engines through public adapter interfaces — it does not duplicate Runtime, Marketplace, or Dashboard logic:

- `IRuntimeAdapter` — Deploy and execute workflows via the Agent Runtime
- `IIdentityAdapter` — Check permissions and enforce organization isolation
- `IMarketplaceAdapter` — Discover available tools
- `IAgentRuntimeAdapter` — Discover agents, estimate cost and confidence
- `ITelemetryAdapter` — Record execution metrics
- `IMemoryAdapter` — Read/write execution memory
- `IToolIntelligenceAdapter` — Select and validate tools
- `IMonitorAdapter` — External monitor integration
- `IConnectorNodeSource` — Dynamic connector discovery (Sprint 28)
- `IStudioTelemetry` — Studio event collection (Sprint 28)

All adapters have null/default implementations for standalone usage.

## Validation

```bash
npm run typecheck
npm run lint
npm test
npm run build
```
