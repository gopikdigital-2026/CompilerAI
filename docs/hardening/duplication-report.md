# Duplication Report

## Summary

| # | Duplication | Severity | Modules Affected | Resolution |
|---|-------------|----------|-----------------|------------|
| 1 | Inline `idGenerator: () => string` redeclared 12+ times | HIGH | All | Consolidated in `shared/contracts/Ids.ts` |
| 2 | Inline `clock: () => string` redeclared 12+ times | HIGH | All | Consolidated in `shared/contracts/Clock.ts` |
| 3 | 4 incompatible error hierarchies | HIGH | Runtime, Infrastructure, API, ApplicationServices | `shared/contracts/DomainError.ts` base class |
| 4 | 7 event types with no shared base | MEDIUM | Runtime, Outbox, Execution, Tool, Learning, Telemetry, Memory | `shared/contracts/EventPublisher.ts` BaseEvent |
| 5 | 5+ repository interfaces with same CRUD shape | MEDIUM | Runtime, Workflow, Approval, Learning, Outbox | `shared/contracts/Repository.ts` IRepository<T> |
| 6 | WorkflowRunner.makeEvent duplicates RuntimeEventBus.emit | HIGH | Runtime/Workflow | Documented — adapter needed |
| 7 | WorkflowApplicationService duplicates IWorkflowRepository | MEDIUM | Platform API | Documented |
| 8 | Clock leaks — new Date().toISOString() bypasses injected clock | HIGH | ApplicationServices, OutboxManager | Documented — needs fix |
| 9 | Mixed time representations (ISO string vs epoch ms) | MEDIUM | RequestContext, ExecutionApplicationService | Documented — needs Timestamp type |
| 10 | MemoryEntry type in two locations | LOW | core/interfaces, intelligence/memory | Intelligence version is canonical |
| 11 | IntentClassifier in two locations | LOW | core/reasoning, intelligence/intent | Intelligence version is canonical |
| 12 | RuntimeCoordinator merges two event streams | MEDIUM | Runtime | Documented — needs unified event path |
| 13 | Hardcoded 'ConfidenceCalculated' telemetry event type | MEDIUM | RuntimeEventBus, ExecutionEngine | Documented — needs proper event typing |
| 14 | VERSION = '1.0.0' hardcoded in 3+ places | LOW | RuntimeCoordinator, CapabilityApplicationService, RuntimeResult | Low risk — semantic versioning per module |
| 15 | Org-indexing Map<string, Set<string>> copy-pasted 3× in InMemoryRepositories | LOW | Runtime repositories | `InMemoryOrgScopedRepository<T>` base class in shared/contracts |

## Detailed Analysis

### 1. Inline IdGenerator / Clock (HIGH)

**Pattern**: Every engine deps interface redeclares `idGenerator: () => string` and `clock: () => string` inline.

**Affected interfaces**:
- `CompilerRuntimeDeps`
- `CompilerIntelligenceOrchestratorDeps`
- `ExecutionEngineDeps`
- `MemoryEngineDeps`
- `ToolIntelligenceEngineDeps`
- `LearningEngineDeps`
- `TelemetryEngineDeps`
- `WorkflowEngine` constructor
- `WorkflowRunner` constructor
- `RuntimeEventBus` constructor
- `OutboxPublisher` constructor
- `PlatformApiConfig`
- `ExecutionApplicationService` / `WorkflowApplicationService`

**Resolution**: `src/shared/contracts/Ids.ts` defines `IdGenerator = () => string`. `src/shared/contracts/Clock.ts` defines `Clock = () => Timestamp` and `ClockWithMath` with `addMs()` and `nowEpochMs()`. Bootstrap layer uses these types.

**Adoption**: Gradual — existing interfaces remain compatible since `() => string` is structurally identical.

### 2. Four Incompatible Error Hierarchies (HIGH)

| Hierarchy | Base | `code` | `retryable` | `httpStatus` | Location |
|-----------|------|--------|-------------|--------------|----------|
| RuntimeError | Error | ✗ | ✗ | ✗ | `compiler/runtime/errors/` |
| InfrastructureError | Error | ✓ | ✓ | ✗ | `infrastructure/errors/` |
| ApiErrorCode | (none, string union) | ✓ | ✓ | ✓ | `platform/api/errors/` |
| Ad-hoc Object.assign | Error | ✓ | ✗ | ✓ | `platform/api/services/ApplicationServices` |

**Resolution**: `src/shared/contracts/DomainError.ts` provides a unified abstract base with `code`, `category`, `retryable`, `severity`, `correlationId`, `entityId`, `metadata`, `cause`, and `toSafe()`. Existing error classes can extend it gradually.

### 3. Seven Event Types with No Shared Base (MEDIUM)

**Event types**: RuntimeEvent, OutboxEvent, ExecutionEvent, ToolEvent, LearningEvent, TelemetryEvent, MemoryEvent

All carry `eventId`/`timestamp`/`organizationId`-ish fields but share no interface.

**Resolution**: `src/shared/contracts/EventPublisher.ts` defines `BaseEvent` with `eventId`, `eventType`, `eventVersion`, `aggregateId`, `organizationId`, `correlationId`, `causationId`, `occurredAt`, `payload`. Plus `IEventPublisher` and `InMemoryEventPublisher`.

### 4. Repository Interface Duplication (MEDIUM)

**Pattern**: `IRuntimeRepository`, `IWorkflowRepository`, `IApprovalRepository`, `ILearningRepository`, `IOutboxRepository` all have the same `save/findById/findByOrganization/update/delete/count/clear` shape.

**Resolution**: `src/shared/contracts/Repository.ts` defines `IRepository<T>`, `IOrgScopedRepository<T>`, and `InMemoryOrgScopedRepository<T>` base class with org-indexing built in.

### 5. WorkflowRunner Event Duplication (HIGH)

**Pattern**: `WorkflowRunner.makeEvent()` constructs `RuntimeEvent` field-by-field, duplicating `RuntimeEventBus.emit()`. Events go to `context.events[]` instead of through the bus.

**Impact**: `RuntimeCoordinator` must merge two event streams (`[...eventBus.getEvents(id), ...context.events]`). Ordering and dedup risks.

**Resolution**: Documented. Future fix: WorkflowRunner should delegate to RuntimeEventBus instead of building events directly.

### 6. Clock Leaks (HIGH)

**Sites**:
- `ApprovalApplicationService.decide()`: `decidedAt: new Date().toISOString()` — bypasses injected clock
- `ExecutionApplicationService.createExecution()`: `receivedAt: Date.now()` — returns number, not ISO string
- `OutboxPublisher.processBatch()`: `new Date(new Date(this.clock()).getTime() + delay).toISOString()` — manual clock arithmetic

**Resolution**: Documented. `ClockWithMath.addMs()` replaces manual arithmetic. Clock leaks need per-site fixes.

### 7. Orchestrator Direct Instantiation (MEDIUM)

**Pattern**: `CompilerIntelligenceOrchestrator` constructor creates `new ContextIntelligenceService()`, `new IntentEngine()`, etc. directly instead of receiving them via deps.

**Impact**: Cannot inject mock engines for testing. Cannot swap implementations.

**Resolution**: Bootstrap layer (`ApplicationContainer`) now wires all engines externally and passes them via deps. The orchestrator still creates its own internal instances — a future refactor should accept them via `CompilerIntelligenceOrchestratorDeps`.
