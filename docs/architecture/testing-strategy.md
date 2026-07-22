# Testing Strategy

## Test Pyramid

```
         ┌─────────┐
         │   E2E   │  8 tests — full pipeline
         ├─────────┤
         │ Integr. │  ~40 tests — cross-module
         ├─────────┤
         │  Unit   │  ~250 tests — per-engine
         └─────────┘
```

## Test Categories

### Unit Tests
- **Location**: `src/compiler/core/intelligence/*/tests/`
- **Pattern**: Fire-and-forget with `node:assert/strict`, run via `npx vite-node`
- **Coverage**: All engine services, validators, rules, policies, mappers, errors
- **Determinism**: Each test creates its own engines with deterministic IDs

### Integration Tests
- **Location**: `src/compiler/runtime/tests/`, `src/platform/api/tests/`, `src/infrastructure/tests/`
- **Coverage**: Orchestrator + Telemetry, Runtime + Workflow, Memory + Learning, Platform API + Runtime, Persistence + Outbox

### End-to-End Tests
- **Location**: `src/tests/e2e-pipeline.test.ts`
- **Coverage**: Full pipeline: API → Runtime → Orchestrator → all 5 stages → side effects → persistence
- **Determinism**: `createTestApplication()` with deterministic clock + IDs
- **Tests**: Successful execution, idempotency, wrong-org rejection, determinism

### Performance Tests
- **Location**: `src/tests/performance/pipeline.benchmark.ts`
- **Coverage**: Pipeline latency, memory usage, event count, trace size
- **Iterations**: 10 runs, avg/min/max reported

## Determinism Rules

1. **Same inputs** → same outputs (structural equality)
2. **Deterministic clock**: `createDeterministicClock(startMs, stepMs)` — increments by 1s per call
3. **Deterministic IDs**: `createDeterministicIdGenerator()` — `id_000001`, `id_000002`, ...
4. **Same configuration**: `createTestApplication()` provides identical config every run
5. **No `Math.random()`** in test paths (except non-deterministic `createApplication()`)

## Test Execution

```bash
# All tests
npx vite-node <test-file>

# E2E pipeline
npx vite-node src/tests/e2e-pipeline.test.ts

# Performance
npx vite-node src/tests/performance/pipeline.benchmark.ts

# Type check
npm run typecheck

# Lint
npm run lint

# Build
npm run build
```

## Coverage Targets

| Module | Target | Current |
|--------|--------|---------|
| Runtime | 85% | ~80% (existing tests) |
| Orchestrator | 85% | ~85% |
| Execution | 85% | ~80% |
| Platform API | 85% | ~80% |
| Persistence | 85% | ~80% |
| Memory | 85% | ~85% |
| Authorization | 85% | ~85% |
| Workflow | 85% | ~80% |
| Overall | 80% | ~82% |

## Anti-Patterns Banned

- No `skip` or `only` in tests
- No `@ts-ignore` to silence type errors
- No `eslint-disable` to suppress lint
- No commented-out tests
- No empty tests to inflate coverage
- No casts to bypass type safety (except `as unknown as` in test assertions)
