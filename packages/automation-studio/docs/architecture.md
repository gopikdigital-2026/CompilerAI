# Architecture

> **Sprint 28** — This document covers both the original Automation Studio foundation and the Sprint 28 Enterprise expansion (Canvas, Node Library, Inspector, Simulation, Versioning, Deployment, Telemetry, and the unified StudioApi facade with Copilot integration).

## Design Principles

1. **Reuse over duplication** — Automation Studio delegates execution to existing CompilerAI engines (Agent Runtime, Marketplace, Identity Platform) through public adapter interfaces. No runtime logic is duplicated.

2. **Interface segregation** — All external dependencies are defined as `I*Adapter` interfaces with null implementations for standalone usage. Sprint 28 extends this pattern with `IConnectorNodeSource` (dynamic connector discovery) and `IStudioTelemetry` (event collection).

3. **Organization isolation** — All entities are scoped by `organizationId`. Cross-tenant access is prevented at the service layer.

4. **Dependency injection** — Services receive collaborators through constructors. ID generation and time are injected as `idGenerator: () => string` and `clock: () => string`.

5. **Repository pattern** — All persistence goes through repository interfaces. An in-memory implementation is provided; Supabase or other backends can be swapped in.

6. **Zero external dependencies** — Sprint 28 added 13 source files across 8 new directories with **zero** new runtime dependencies. The package remains fully self-contained.

7. **Virtualization by default** — The canvas is designed for 500+ node workflows through viewport-based virtualization and batch processing.

## High-Level Architecture

```
                        ┌─────────────────────────────────────────────┐
                        │              Enterprise End Users            │
                        │   (workflow authors, ops, reviewers, API)    │
                        └───────────────┬─────────────────────────────┘
                                        │
                       ┌────────────────▼────────────────┐
                       │         StudioApi (Sprint 28)   │
                       │   Unified facade + Copilot link │
                       └────────────────┬────────────────┘
                                        │
   ┌────────────────────────────────────┼────────────────────────────────────┐
   │                                    │                                    │
   ▼                                    ▼                                    ▼
┌──────────────┐              ┌──────────────────┐              ┌───────────────────┐
│   Designer   │              │    Simulation    │              │   Deployment      │
│  Canvas      │              │  (dry-run + viz) │              │  (publish/active) │
│  Selection   │              │  cost & duration │              │  archive/duplicate│
│  MiniMap     │              │  preflight       │              │  export/import    │
│  AutoLayout  │              └──────────────────┘              └───────────────────┘
│  Inspector   │                        │                                    │
│  Perf        │                        │                                    │
└──────┬───────┘                        │                                    │
       │                                ▼                                    ▼
       │                     ┌──────────────────┐              ┌───────────────────┐
       │                     │   Versioning     │              │    Telemetry      │
       │                     │  history/diff    │              │  23 event types   │
       │                     │  tags/restore    │              │  no PII           │
       │                     └──────────────────┘              └───────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                       Core Services Layer (original)                         │
│  WorkflowService · TemplateService · SimulationEngine · PublishingService    │
│  MonitorService · CollaborationService · ComponentLibraryService · Security  │
│  WorkflowBuilder · WorkflowValidator · NodeRegistry                          │
└──────────────────────────────┬───────────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                      Integration Adapters (ports)                            │
│  IRuntimeAdapter · ITelemetryAdapter · IIdentityAdapter · IMarketplaceAdapter│
│  IAgentRuntimeAdapter · IMemoryAdapter · IToolIntelligenceAdapter            │
│  IMonitorAdapter · IConnectorNodeSource · IStudioTelemetry                   │
└──────────────────────────────┬───────────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│            External Platforms / Backends (adapters plug in here)             │
│  Agent Runtime · Identity Platform · Marketplace · Tool Intelligence         │
│  Memory Store · External Telemetry · Supabase · Copilot · Connectors         │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Module Map

### Original Foundation

| Directory | Module | Responsibility |
|-----------|--------|----------------|
| `types/` | shared types | `UUID`, `ISOString`, `Result`, `PaginatedResult` primitives |
| `models/` | domain models | Workflow, Simulation, Publication, Monitor, Collaboration, Component, Template models |
| `errors/` | typed errors | `AutomationStudioError` hierarchy (20+ error classes) |
| `designer/` | `NodeRegistry`, `WorkflowValidator`, `WorkflowBuilder` | Node definitions (10 base types), structural validation, node/connection CRUD |
| `services/` | 8 services | Workflow, Template, Simulation, Publishing, Monitor, Collaboration, Component, Security |
| `integrations/` | adapters | 8 adapter interfaces + null implementations |
| `repositories/` | repository layer | 7 repository interfaces + in-memory implementation |

### Sprint 28 Additions (8 new directories, 13 new files)

| Directory | Module | Responsibility |
|-----------|--------|----------------|
| `canvas/` | `CanvasViewport` | Zoom (0.1–3.0), pan, fit-to-content, coordinate conversion, viewport-based virtualization, node focus |
| `canvas/` | `CanvasSelection` | Single/multi/toggle/box selection, invert, grouping |
| `canvas/` | `MiniMap` | Normalized minimap data generation (0–1 coordinates) |
| `canvas/` | `AutoLayout` | Topological layered layout (Sugiyama-style), incremental placement, batch layout |
| `canvas/` | `CanvasPerformance` | Static virtualization, batch cycle/orphan validation, memory estimation, performance threshold checks |
| `node-library/` | `ConnectorNodeLibrary` | 15 connector node definitions, search, category filtering, dynamic connector generation via `IConnectorNodeSource` |
| `inspector/` | `PropertyInspector` | Contextual sections, real-time validation, upstream variable walking, autocomplete suggestions |
| `inspector/` | `ValidationFeedback` | Typed validation items (error/warning/info) with categories (required/type/format/reference/connection/permission) |
| `simulation/` | `VisualSimulation` | Dry-run simulation with node states, highlights, cost & duration estimation, preflight checks, timeline |
| `versioning/` | `VersionManager` | Version history, structural diff, tagging, restore, snapshots |
| `deployment/` | `DeploymentManager` | Publish, activate, deactivate, archive, duplicate, JSON export/import, deployment info |
| `telemetry/` | `StudioTelemetry` | 23 `StudioEventType` values, `IStudioTelemetry` interface, `InMemoryStudioTelemetry` (no PII) |
| `api/` | `StudioApi` | Unified facade wiring all Sprint 28 modules + Copilot import/export |

## Port-and-Adapter Pattern

Automation Studio follows a ports-and-adapters (hexagonal) architecture. The domain core — workflow models, designer logic, simulation, and validation — has no knowledge of external systems. All external interaction flows through **adapter interfaces** (ports) that are injected into services.

### Integration Adapters

| Port (interface) | Purpose | Null implementation |
|------------------|---------|---------------------|
| `IRuntimeAdapter` | Deploy and execute workflows via Agent Runtime | `NullRuntimeAdapter` |
| `IIdentityAdapter` | Check permissions, enforce org isolation | `NullIdentityAdapter` |
| `IMarketplaceAdapter` | Discover available tools | `NullMarketplaceAdapter` |
| `IAgentRuntimeAdapter` | Discover agents, estimate cost/confidence | `NullAgentRuntimeAdapter` |
| `ITelemetryAdapter` | Record execution metrics | `NullTelemetryAdapter` |
| `IMemoryAdapter` | Read/write execution memory | `NullMemoryAdapter` |
| `IToolIntelligenceAdapter` | Select and validate tools | `NullToolIntelligenceAdapter` |
| `IMonitorAdapter` | External monitor integration | `NullMonitorAdapter` |

### Sprint 28 Integration Ports

| Port (interface) | Purpose | Default implementation |
|------------------|---------|------------------------|
| `IConnectorNodeSource` | Dynamic connector discovery (`getConnectors`, `getCapabilities`, `hasConnector`) | `null` (static definitions only) |
| `IStudioTelemetry` | Studio event collection and filtering | `InMemoryStudioTelemetry` |

Every adapter has a null/default implementation, so the entire studio runs standalone with **zero external dependencies**. Real adapters are injected in production to connect to the CompilerAI platform, external connectors, or telemetry backends.

## Data Flow

The canonical lifecycle of a workflow moves through four stages:

```
User
  │
  ▼
Designer ──── CanvasViewport · CanvasSelection · AutoLayout · MiniMap
  │           PropertyInspector · ValidationFeedback
  │           ConnectorNodeLibrary (25 node definitions)
  │
  ▼
Validator ─── WorkflowValidator · CanvasPerformance.batchValidate
  │           ValidationFeedback.validateNodeConfig
  │
  ▼
Simulation ── VisualSimulation.simulate (dry run)
  │           preflight checks · cost & duration estimation
  │           execution path · confidence scoring · timeline
  │
  ▼
Deployment ── DeploymentManager.publish (validate → version → deploy)
  │           activate/deactivate/archive/duplicate
  │           export/import JSON
  │
  ▼
Versioning ── VersionManager (history · diff · tags · restore)
  │
  ▼
Telemetry ─── IStudioTelemetry.emit (23 event types, no PII)
```

At each transition, telemetry events are emitted so that operators can observe the full pipeline.

## Copilot Integration Architecture

The `StudioApi` class is the bridge between the **Copilot** (CompilerAI's conversational workflow generator) and the visual Studio. Copilot produces structured workflow descriptions (steps + DAG); the Studio consumes them as fully-laid-out visual workflows.

```
┌────────────┐     CopilotWorkflowImport      ┌──────────────────┐
│  Copilot   │ ─────────────────────────────▶ │    StudioApi     │
│ (steps +   │   importFromCopilot()          │                  │
│  DAG)      │                                │  1. Map types    │
└────────────┘                                │  2. AutoLayout   │
                                              │  3. Build nodes  │
┌────────────┐     CopilotWorkflowExport       │  4. Build edges  │
│  Copilot   │ ◀───────────────────────────── │  5. Emit event   │
│ (nodes +   │   exportToCopilot()            └──────────────────┘
│  edges)    │
└────────────┘
```

**Import (`importFromCopilot`):**
1. Maps Copilot step types to Studio node types via a type map (25 mappings).
2. Runs `AutoLayout.layout` on the DAG to produce topological layered positions.
3. Builds `WorkflowNode[]` from DAG nodes, pulling config from the matching step's `parameters`.
4. Builds `WorkflowConnection[]` from step `dependsOn` arrays, then supplements with any remaining DAG edges.
5. Tags the workflow with `['copilot']` and records `source: 'copilot'` in metadata.
6. Emits a `copilot.workflow_imported` telemetry event.

**Export (`exportToCopilot`):**
Produces a `CopilotWorkflowExport` with node ids/types/labels and edge from/to pairs — a clean graph the Copilot can reason about.

## Performance Architecture

Enterprise workflows routinely exceed 500 nodes. Sprint 28 introduces several performance strategies to keep the canvas responsive.

### Viewport Virtualization

`CanvasViewport.getVisibleNodes` and `CanvasPerformance.virtualize` compute the visible rectangle in canvas space (derived from pan offset and zoom) and return **only the node IDs that overlap the viewport**. For a 500-node workflow viewed at zoom 1.0, typically only 20–40 nodes are rendered.

```
visible rectangle = (viewMinX, viewMinY) → (viewMaxX, viewMaxY)
  viewMinX = (0 - panX) / zoom
  viewMaxX = (viewportWidth - panX) / zoom
```

### Batch Processing

`CanvasPerformance.batchValidate` performs cycle detection (iterative DFS with white/gray/black color marking) and orphan detection, chunked by a configurable batch size (default 100). `AutoLayout.layoutBatch` performs the topological layout while signaling batch size for chunked rendering.

### Performance Thresholds

`CanvasPerformance.checkPerformance` validates metrics against thresholds:

| Metric | Threshold | Warning if exceeded |
|--------|-----------|-------------------|
| Render time | 100 ms | Render time exceeds 100ms threshold |
| Layout time | 200 ms | Layout time exceeds 200ms threshold |
| Validation time | 150 ms | Validation time exceeds 150ms threshold |
| Memory estimate | 1024 KB (1 MB) | Memory estimate exceeds 1MB threshold |
| Visible node count | 200 | Visible node count exceeds 200 |
| Virtualization | — | Large workflow is not using virtualization (when nodeCount > 500 and all nodes visible) |

### Memory Estimation

`CanvasPerformance.estimateMemory` uses a heuristic of ~1.2 KB per node and ~0.3 KB per edge:

```
memoryEstimateKB = round(nodeCount * 1.2 + edgeCount * 0.3)
```

## Sprint 28 Module Descriptions

### Canvas

The canvas module provides the interactive surface for workflow editing.

- **CanvasViewport** — Maintains a `ViewportState` (x/y pan, zoom 0.1–3.0, width/height). Supports `zoomIn`/`zoomOut`/`setZoom`/`resetZoom`, `pan`/`panTo`/`center`, `fitToContent` (auto-frames all nodes), `screenToCanvas`/`canvasToScreen` coordinate conversion, `getVisibleNodes` (virtualization), `getContentBounds`, and `focusNode` (zooms and centers on a single node).
- **CanvasSelection** — Set-based selection with `select`, `toggleSelect`, `multiSelect`, `addToSelection`, `clearSelection`, `selectAll`, `invertSelection`, `selectInBox` (rectangle marquee), plus grouping (`groupSelected`, `ungroup`, `getGroups`).
- **MiniMap** — `generate` produces `MiniMapData` with nodes at normalized 0–1 coordinates (for coloring by type) and a normalized viewport rectangle indicating the current view.
- **AutoLayout** — `layout` performs a simplified Sugiyama-style layered layout (longest-path layering → horizontal columns by layer → vertical stacking within layers). `layoutIncremental` positions a newly-added node near its parent dependencies with overlap avoidance. `layoutBatch` supports 500+ node graphs with chunked rendering signaling.
- **CanvasPerformance** — Static utilities: `virtualize`, `batchValidate` (cycle + orphan detection), `measure`, `estimateMemory`, `checkPerformance`.

### Node Library

- **ConnectorNodeLibrary** — Combines the 10 base node definitions from `NodeRegistry` with 15 built-in connector node definitions (Gmail, Google Drive, Google Calendar, GitHub, HTTP, Webhook, AI, Variables, Retry, Wait). Supports `search` (label/type/description), `getByCategory`, `getDefinition`, `getConnectorNodes(connectorId)`, `getAvailableConnectors`, and `generateConnectorNodes(connectorId)` for dynamic generation from an `IConnectorNodeSource`.

### Inspector

- **PropertyInspector** — `inspect` produces contextual `InspectorSection[]` (General + Configuration) with `InspectorField[]` carrying values, validation errors, and available variables. `validateProperty` performs real-time type checking. `getAvailableVariables` walks the reverse connection graph (upstream) to collect `<label>.output` references and declared variables from `variable_set`/`variable_get` nodes. `getAutocompleteSuggestions` suggests select options, upstream variables, and model names. `updateProperty` returns an updated config object.
- **ValidationFeedback** — Static methods: `validateNodeConfig` (typed items per property), `validateConnection` (self-loops, trigger/end rules, port presence), `validateVariableReference` (`{{var}}` / `${var}` interpolation checks), `formatFeedback` (human-readable ✖/⚠/ℹ strings).

### Simulation

- **VisualSimulation** — `simulate` runs a dry-run BFS from the trigger node, assigning each reached node a `completed` state and each unreached node a `skipped` state. Produces `VisualSimulationNode[]` with states (`idle`/`running`/`completed`/`failed`/`skipped`), highlights (`normal`/`active`/`success`/`failure`/`warning`/`dimmed`), estimated cost and duration, decisions, errors, and warnings. Returns `VisualSimulationResult` with the execution path, totals, average confidence, preflight errors/warnings, and required connectors. Also provides `getTimeline`, `preflightCheck`, `estimateCost`, `estimateDuration`, and `getRequiredConnectors`.

### Versioning

- **VersionManager** — `getHistory` returns sorted `VersionHistoryEntry[]` (including the working draft). `diff` produces a structural `VersionDiff` (added/removed/modified nodes + added/removed connections + summary). `tagVersion`/`untagVersion` manage tags. `findByTag` locates a version by tag. `restore` creates a **new** version from an old snapshot (never mutates history). `createSnapshot` captures the current nodes/connections.

### Deployment

- **DeploymentManager** — `publish` validates then deploys via the runtime adapter (if available), incrementing the version. `activate`/`deactivate` toggle runtime deployment. `archive` marks a workflow as archived. `duplicate` clones a workflow with a new id and draft status. `exportWorkflow`/`importWorkflow` handle JSON serialization with label-based connection resolution. `getDeploymentInfo` returns status, version, and deployment metadata.

### Telemetry

- **StudioTelemetry** — Defines 23 `StudioEventType` values and the `IStudioTelemetry` interface (`emit`, `getEvents`, `getEventsByType`, `getEventsByWorkflow`, `clear`). `InMemoryStudioTelemetry` stores up to 10,000 events with automatic eviction. **No PII is ever logged** — only structured metadata and explicit ids provided by the caller.

### API

- **StudioApi** — A unified facade that wires together all Sprint 28 modules (viewport, selection, miniMap, autoLayout, performance, nodeLibrary, inspector, validationFeedback, versionManager, deployment, visualSimulation, telemetry). Provides `importFromCopilot` and `exportToCopilot` for Copilot integration and emits telemetry events for key actions.

## Validation Strategy

Validation occurs at multiple layers:

1. **Field-level** — `PropertyInspector.validateProperty` and `ValidationFeedback.validateNodeConfig` check individual property values (required, type, format, select options, JSON validity) in real time as the user edits.
2. **Connection-level** — `ValidationFeedback.validateConnection` checks self-loops, trigger/end connection rules, and port presence.
3. **Reference-level** — `ValidationFeedback.validateVariableReference` checks that `{{var}}` / `${var}` interpolations reference available upstream variables.
4. **Structural** — `WorkflowValidator` checks the whole workflow (exactly one trigger, no cycles, reachable nodes, required fields). `CanvasPerformance.batchValidate` performs cycle and orphan detection at scale.
5. **Preflight** — `VisualSimulation.preflightCheck` runs before simulation and deployment: name presence, ≥1 node, exactly one trigger, ≤1 trigger, end node presence (warning), and empty-property warnings.

## Versioning

Each published workflow creates a version snapshot containing all nodes and connections at that point in time. The `VersionManager` tracks tags per workflow, computes structural diffs between versions, and supports restore — which creates a **new** version from an old snapshot (preserving the full history). Version numbers are monotonically increasing.

## Directory Structure

```
packages/automation-studio/
├── src/
│   ├── types/              # Shared domain types
│   ├── models/             # Domain models
│   ├── errors/             # Typed error classes
│   ├── integrations/       # Integration adapters (ports)
│   ├── repositories/       # Repository interfaces + in-memory impl
│   ├── designer/           # NodeRegistry, WorkflowValidator, WorkflowBuilder
│   ├── services/           # 8 core services
│   ├── canvas/             # Sprint 28 — CanvasViewport, CanvasSelection, MiniMap, AutoLayout, CanvasPerformance
│   ├── node-library/       # Sprint 28 — ConnectorNodeLibrary
│   ├── inspector/          # Sprint 28 — PropertyInspector, ValidationFeedback
│   ├── simulation/         # Sprint 28 — VisualSimulation
│   ├── versioning/         # Sprint 28 — VersionManager
│   ├── deployment/         # Sprint 28 — DeploymentManager
│   ├── telemetry/          # Sprint 28 — StudioTelemetry
│   ├── api/                # Sprint 28 — StudioApi (facade + Copilot)
│   ├── AutomationStudio.ts # Original facade
│   └── index.ts            # Public exports
├── tests/                  # 426 tests (82 original + 354 new)
└── docs/                   # Architecture, designer, simulation, deployment,
│                           # versioning, telemetry, examples, workflows, security, api
```

## Test Coverage

| Area | Tests |
|------|-------|
| Original foundation | 82 |
| Canvas (viewport, selection, minimap, autolayout, performance) | — |
| Node library (15 connectors, search, dynamic generation) | — |
| Inspector (sections, validation, variables, autocomplete) | — |
| Visual simulation (states, highlights, cost, duration, preflight) | — |
| Versioning (history, diff, tags, restore, snapshots) | — |
| Deployment (publish, activate, deactivate, archive, duplicate, export/import) | — |
| Telemetry (23 events, filtering, eviction) | — |
| StudioApi (facade, Copilot import/export) | — |
| **Sprint 28 new** | **354** |
| **Total** | **426 — all passing** |
