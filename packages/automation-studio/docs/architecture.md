# Architecture

## Design Principles

1. **Reuse over duplication** — Automation Studio delegates execution to existing CompilerAI engines (Agent Runtime, Marketplace, Identity Platform) through public adapter interfaces. No runtime logic is duplicated.

2. **Interface segregation** — All external dependencies are defined as `I*Adapter` interfaces with null implementations for standalone usage.

3. **Organization isolation** — All entities are scoped by `organizationId`. Cross-tenant access is prevented at the service layer.

4. **Dependency injection** — Services receive collaborators through constructors. ID generation and time are injected as `idGenerator: () => string` and `clock: () => string`.

5. **Repository pattern** — All persistence goes through repository interfaces. An in-memory implementation is provided; Supabase or other backends can be swapped in.

## Module Map

### Designer Layer
- **NodeRegistry** — Defines all 10 node types with their ports, properties, and validation rules
- **WorkflowValidator** — Validates workflows for structural correctness (trigger presence, no cycles, reachable nodes, connection validity)
- **WorkflowBuilder** — CRUD operations for nodes and connections within a workflow

### Services Layer
- **WorkflowService** — CRUD for workflows
- **TemplateService / TemplateLibrary** — 7 predefined workflow templates and template-to-workflow creation
- **SimulationEngine** — Runs workflows in simulation mode, producing execution paths, decisions, tool usage, costs, and confidence
- **PublishingService** — Publish, unpublish, clone, export, import, rollback with version snapshots
- **MonitorService** — Real-time execution monitoring with events, checkpoints, and pending approvals
- **CollaborationService** — Comments, reviews, and change history
- **ComponentLibraryService** — Discovers and binds components from Marketplace, Agent Runtime, and Tool Intelligence
- **SecurityService** — Permission checks, pre-publish validation, audit trail

### Integration Layer
- Adapters for Runtime, Telemetry, Identity, Marketplace, Agent Runtime, Memory, Tool Intelligence, and Monitor
- Each has a null implementation for standalone usage

### Repository Layer
- 7 repository interfaces (workflows, simulations, publications, monitors, comments, reviews, change history)
- InMemoryAutomationStudioRepository provides a complete in-memory implementation

## Data Flow

```
User → AutomationStudio facade
         ↓
    WorkflowService (CRUD)
    WorkflowBuilder (nodes/connections)
    WorkflowValidator (validation)
         ↓
    SimulationEngine (simulated execution)
    PublishingService (publish/clone/export/import)
    MonitorService (real-time tracking)
    CollaborationService (comments/reviews/history)
    SecurityService (permissions/audit)
         ↓
    Adapters → External platforms (Runtime, Identity, Marketplace, etc.)
```

## Versioning

Each published workflow creates a version snapshot containing all nodes and connections at that point in time. Rollback restores a previous snapshot without data loss. Version numbers are monotonically increasing.
