# Roadmap

## Completed Sprints

| Sprint | Focus | Status |
|--------|-------|--------|
| 1-14 | Core engines, UI, infrastructure, platform API | Complete |
| 15 | Identity, Access & Organization Management | Complete |
| 15A | Core Integration & Hardening | Complete |

## Sprint 15A Deliverables

- Shared canonical contracts (`src/shared/contracts/`)
- Composition root (`src/bootstrap/`)
- End-to-end pipeline test (8 tests, all passing)
- Performance baseline benchmark
- 10 hardening documents (module inventory, duplication report, state model, error model, event catalog, security review, performance baseline, code quality report)
- 11 architecture documents
- 14 ADRs

## Recommended Next Steps

### Priority 1: Fix Clock Leaks
- `ApprovalApplicationService.decide()`: Replace `new Date().toISOString()` with injected `clock()`
- `ExecutionApplicationService.createExecution()`: Replace `Date.now()` with `clock()`
- `OutboxPublisher`: Use `ClockWithMath.addMs()` instead of manual arithmetic

### Priority 2: Unify Event Path
- WorkflowRunner should delegate to RuntimeEventBus instead of building events via `makeEvent()`
- Remove dual event stream merge in RuntimeCoordinator

### Priority 3: Migrate Errors to DomainError
- RuntimeError extends DomainError (add `code`, `retryable`)
- InfrastructureError extends DomainError
- Replace ad-hoc `Object.assign(new Error(), {code})` with DomainError subclasses

### Priority 4: Orchestrator DI Refactor
- Accept ContextIntelligenceService, IntentEngine, PlanningEngine, DecisionEngine, ConfidenceEngine via deps
- Remove direct instantiation in constructor

### Priority 5: Adopt Shared Contracts
- Replace inline `idGenerator: () => string` with `IdGenerator` type from shared/contracts
- Replace inline `clock: () => string` with `Clock` / `ClockWithMath`
- Use `IOrgScopedRepository<T>` for new repositories

### Future Sprints
- OAuth2/OIDC integration (Google, Microsoft, GitHub)
- Stripe billing integration
- Real tool adapters (replacing SimulatedToolAdapter)
- Postgres repository implementations for all intelligence engines
- Coverage tooling (c8 or vitest coverage)
- CI/CD pipeline
