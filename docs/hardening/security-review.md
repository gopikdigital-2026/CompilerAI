# Security Review

## Findings

### CRITICAL

| # | Finding | Location | Status |
|---|---------|----------|--------|
| C1 | Clock leak — `new Date().toISOString()` bypasses injected clock, breaking deterministic time-based security checks | `ApplicationServices.ts` (ApprovalApplicationService.decide) | Documented — fix needed |

### HIGH

| # | Finding | Location | Status |
|---|---------|----------|--------|
| H1 | WorkflowRunner bypasses RuntimeEventBus — events not sanitized through central path | `compiler/runtime/workflow/WorkflowRunner.ts` | Documented |
| H2 | Hardcoded 'ConfidenceCalculated' telemetry event type for all forwarded events — lossy, may leak event metadata | `RuntimeEventBus.ts`, `ExecutionEngine.ts` | Documented |
| H3 | ApplicationServices uses ad-hoc `Object.assign(new Error(), {code})` — no instanceof guard, no sanitization | `platform/api/services/ApplicationServices.ts` | Documented |
| H4 | `receivedAt: Date.now()` returns number (epoch ms) while convention is ISO string — type mismatch may bypass time validation | `ExecutionApplicationService.createExecution` | Documented |
| H5 | No declarative tenant isolation guard — every service re-implements org-scope check inline | All services | Partially addressed by shared contracts |

### MEDIUM

| # | Finding | Location | Status |
|---|---------|----------|--------|
| M1 | Orchestrator directly instantiates engines — cannot inject security-hardened implementations | `CompilerIntelligenceOrchestrator.ts` | Addressed by bootstrap layer |
| M2 | CompilerRuntime hardcodes InMemoryRepositories — cannot swap for secured Postgres repos | `CompilerRuntime.ts` | Addressed by bootstrap layer |
| M3 | No input size limits on prompts or metadata | Platform API validators | Documented |
| M4 | No dangerous metadata key validation | Platform API, Runtime | Documented |
| M5 | Mixed time representations (ISO string vs epoch ms) | RequestContext, ExecutionApplicationService | Documented |

### LOW

| # | Finding | Location | Status |
|---|---------|----------|--------|
| L1 | VERSION = '1.0.0' hardcoded in 3+ places | RuntimeCoordinator, CapabilityApplicationService | Documented |
| L2 | Tool IDs minted across 5 ID spaces with no namespacing | WorkflowRunner | Documented |
| L3 | MemoryEntry type in two locations | core/interfaces, intelligence/memory | Documented |

## Hardening Applied (Sprint 15A)

### 1. Canonical DomainError with Safe Serialization
- `shared/contracts/DomainError.ts` provides `toSafe()` that excludes stack traces and sensitive data
- `toSafeError()` utility function for unknown error types
- `isRetryableError()` helper for retry logic

### 2. Event Sanitization via BaseEvent
- `shared/contracts/EventPublisher.ts` defines `BaseEvent` with `payload: Metadata` (typed, not `any`)
- Event catalog documents sensitive data rules
- `sanitizeLogMessage()` already exists in `infrastructure/observability/InfrastructureMetrics.ts`

### 3. Composition Root (Bootstrap Layer)
- `src/bootstrap/ApplicationContainer.ts` — single wiring point
- Eliminates scattered instantiation that could bypass security hardening
- `createTestApplication()` uses deterministic clock + IDs for reproducible security tests

### 4. Organization Isolation via Shared Contracts
- `IOrgScopedRepository<T>` enforces org-scoped access at the repository level
- `InMemoryOrgScopedRepository<T>` base class handles org-indexing correctly
- All new code should use these contracts

## Remaining Hardening (Post-Sprint)

1. **Fix clock leaks**: Replace `new Date().toISOString()` with injected `clock()` in ApplicationServices
2. **Fix `receivedAt` type**: Should use `clock()` (ISO string), not `Date.now()` (number)
3. **Unify event path**: WorkflowRunner should delegate to RuntimeEventBus
4. **Add input size limits**: Platform API validators should enforce max prompt length, max metadata size
5. **Add metadata key validation**: Block keys like `__proto__`, `constructor`, `prototype`
6. **Migrate errors to DomainError**: RuntimeError and InfrastructureError should extend DomainError
7. **Add declarative tenant guard**: Middleware or decorator that checks org membership before handler
