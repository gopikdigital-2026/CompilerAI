# Code Quality Report

## Metrics

| Metric | Count | Severity |
|--------|-------|----------|
| Files > 500 lines | 1 (CompilerIntelligenceOrchestrator.ts: ~575 lines) | LOW |
| Services with >5 responsibilities | 1 (RuntimeCoordinator) | MEDIUM |
| Circular imports | 0 detected | — |
| `any` types | 0 in production code | — |
| Unsafe casts | 2 (test code: `as unknown as`) | LOW |
| TODOs | 0 | — |
| eslint-disable directives | 0 | — |
| @ts-ignore directives | 0 | — |
| Dead code | 0 confirmed | — |
| Unused dependencies | 0 (verified by typecheck) | — |

## File Size Analysis

| File | Lines | Assessment |
|------|-------|------------|
| `CompilerIntelligenceOrchestrator.ts` | ~575 | Acceptable — single coherent purpose (pipeline orchestration) |
| `RuntimeCoordinator.ts` | ~304 | Acceptable |
| `Controllers.ts` | ~391 | Acceptable — 6 controllers in one file |
| `PostgresRepositories.ts` | ~625 | Acceptable — 10 repository implementations |
| `ApplicationServices.ts` | ~250 | Acceptable |

## Service Responsibility Analysis

### RuntimeCoordinator (MEDIUM)
- **Responsibilities**: Execute, pause, resume, cancel, validate request, manage state, build result, merge event streams, coordinate workflow runner
- **Assessment**: High but cohesive — all operations relate to runtime execution lifecycle
- **Recommendation**: Extract event stream merging into a separate EventMergeService

### CompilerIntelligenceOrchestrator (LOW)
- **Responsibilities**: Run 5 pipeline stages, record trace, handle side effects (memory, tools, execution, learning), build result
- **Assessment**: Large but single-purpose — pipeline orchestration
- **Recommendation**: Extract side-effect handling into a PostPipelineEffectsService

## Import Analysis

- **No circular imports detected** — all imports flow downward (intelligence → runtime → platform → infrastructure)
- **Barrel files**: 18 index.ts barrels provide clean public APIs
- **No unused exports** detected by typecheck

## Naming Consistency

| Issue | Count | Severity |
|-------|-------|----------|
| `IntentClassifier` exists in 2 modules | 1 | LOW — intelligence version is canonical |
| `MemoryEntry` exists in 2 modules | 1 | LOW — intelligence version is canonical |
| `decisionIdGen` vs `idGenerator` | 1 | LOW — divergent name in ApprovalApplicationService |
| Engine `readonly id` field | 12+ | LOW — consistent pattern, no shared EngineId type |

## Mock Consistency

- **Intelligence layer**: Uses in-memory repositories (InMemoryMemoryRepository, InMemoryLearningRepository) — consistent
- **Runtime layer**: Uses InMemoryRuntimeRepository, InMemoryWorkflowRepository, InMemoryApprovalRepository, InMemoryCheckpointStore — consistent
- **Platform API**: Uses InMemoryHttpAdapter, InMemoryIdempotencyRepository, InMemoryRateLimiter — consistent
- **Bootstrap**: Uses createTestApplication() with deterministic clock + IDs — consistent
- **UI mocks**: Separate mock data in `src/lib/*Mocks.ts` — not related to backend tests

## Duplication Status

All duplications identified in `duplication-report.md` are documented. The shared contracts layer (`src/shared/contracts/`) provides canonical types for gradual adoption. No duplications were removed destructively — all existing code remains compatible.

## Dead Code Analysis

- No confirmed dead code detected
- All exports are consumed by at least one importer (verified via typecheck)
- No commented-out code blocks found
- No `_old` or `_backup` files found

## Recommendations

1. **Extract EventMergeService** from RuntimeCoordinator to handle dual event stream merging
2. **Extract PostPipelineEffectsService** from Orchestrator to handle memory/tools/execution/learning side effects
3. **Fix clock leaks** in ApplicationServices (3 sites)
4. **Rename `decisionIdGen`** to `idGenerator` in ApprovalApplicationService for consistency
5. **Adopt shared contracts** gradually — start with new code, migrate existing interfaces when touched
