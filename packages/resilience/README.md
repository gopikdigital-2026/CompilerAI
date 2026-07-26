# @compilerai/resilience v1.0.0

> Enterprise Resilience, High Availability & Disaster Recovery platform for CompilerAI.

`@compilerai/resilience` provides a unified, production-grade toolkit for keeping CompilerAI
services available and durable under failure. It bundles circuit breakers, a smart retry
engine, multi-instance failover, multi-target replication, snapshot-based backup & restore,
chaos testing, queue recovery, and disaster-recovery planning behind a single
`ResiliencePlatform` facade.

The package ships as pure TypeScript with zero runtime dependencies, compiles to ESM, and is
fully validated: **111 tests · 98.31% line coverage · 9 suites · 15 source files**.

---

## Key features

### Circuit Breaker
Three states — **Closed**, **Open**, **Half-Open** — with configurable tripping by error
count (`failureThreshold`), rolling time-window failure percentage
(`failurePercentageThreshold`), reset timeout (`resetTimeoutMs`), window size, and a
half-open trial-call limit (`halfOpenMaxCalls`).

### Smart Retry Engine
Three backoff strategies — **exponential**, **linear**, **fixed** — with optional jitter,
`maxAttempts`, `maxDelayMs` cap, and pluggable `isRetryable` predicate for filtering which
errors warrant a retry (built-in `isNetworkError` / `isTransientError` helpers).

### Failover & High Availability
Register multiple `Instance`s with priority and health score. Supports three load-balancing
strategies — **priority**, **round_robin**, **least_load** — with automatic failover on
failure, manual `markFailed` / `markRecovered`, and a recorded event log.

### Replication Manager
Four replication targets — `knowledge_graph`, `enterprise_rag`, `shared_memory`,
`configuration`. Detects conflicts on key-level divergence and resolves them with four
strategies: **source_wins**, **target_wins**, **merge**, **manual**.

### Backup & Restore
Full and incremental snapshots with checksum-based integrity validation, selective key
restore, and parent-chain merging so incremental snapshots reconstruct full state on
restore. Versioned via `parentId` chains.

### Chaos Testing
Six scenario types — `connector_failure`, `memory_pressure`, `agent_timeout`,
`data_corruption`, `high_latency`, `service_interruption` — registered by default with
factory helpers. Each run produces a `ChaosResult`; `generateReport()` rolls results into a
`ResilienceReport` with an overall score and recommendations.

### Queue Recovery
Four item types — `pending_job`, `workflow`, `agent_task`, `event` — with idempotent
processing keyed on `idempotencyKey`. Duplicate enqueues and already-processed keys are
suppressed automatically during `recover()`.

### Disaster Recovery
Configurable **RPO** (recovery point objective) and **RTO** (recovery time objective) in
seconds, automatic or manual `mode`, recovery plans with ordered step execution, and
`validateRecovery()` to confirm every step completed.

### Telemetry
Ten event types — `circuit.opened`, `circuit.closed`, `circuit.half_open`,
`retry.executed`, `backup.completed`, `restore.completed`, `failover.started`,
`replication.completed`, `chaos.finished`, `queue.recovered` — emitted automatically by the
facade and queryable by type.

---

## Quick start

```ts
import { ResiliencePlatform } from '@compilerai/resilience';

const platform = new ResiliencePlatform({
  instances: ResiliencePlatform.createDefaultInstances(),
});

// 1. Execute a function protected by circuit breaker + retry
const result = await platform.executeProtected(
  async () => fetch('https://api.example.com/data').then((r) => r.json()),
  { circuitName: 'api' },
);

// 2. Standalone retry with exponential backoff + jitter
const retryResult = await platform.retry(
  async () => riskyWork(),
  ResiliencePlatform.createDefaultRetryConfig(5),
);

// 3. Manual circuit control
platform.openCircuit('api');
platform.closeCircuit('api');

// 4. Backup & restore
const snap = platform.createBackup('knowledge_graph', { node1: 'value' });
const restore = platform.restoreBackup(snap.id, { selectiveKeys: ['node1'] });

// 5. Replicate with conflict detection
const repl = platform.replicate('shared_memory', { session: 'abc' });

// 6. Chaos testing
const scenarioId = platform.chaos.getScenarios()[0].id;
const chaosResult = platform.runChaosScenario(scenarioId);

// 7. Health report
const health = platform.healthReport();
console.log(health.overallStatus); // 'healthy' | 'degraded' | 'critical'
```

---

## Modules

| # | Module | Path | Description |
|---|--------|------|-------------|
| 1 | circuit-breaker | `src/circuit-breaker/CircuitBreaker.ts` | 3-state breaker with windowed failure tracking |
| 2 | retry | `src/retry/RetryEngine.ts` | Backoff strategies, jitter, retryable filtering |
| 3 | failover | `src/failover/FailoverManager.ts` | Instance registry, load balancing, failover events |
| 4 | replication | `src/replication/ReplicationManager.ts` | 4 targets, conflict detection & resolution |
| 5 | backup | `src/backup/BackupManager.ts` | Full/incremental snapshots, integrity, selective restore |
| 6 | chaos | `src/chaos/ChaosEngine.ts` | 6 scenario types, factories, resilience reports |
| 7 | queue | `src/queue/QueueRecovery.ts` | Idempotent queue recovery for 4 item types |
| 8 | scheduler / DR | `src/scheduler/DisasterRecoveryManager.ts` | RPO/RTO plans, step execution, validation |
| 9 | health | `src/health/ResilienceHealthProvider.ts` | Aggregated `healthy` / `degraded` / `critical` status |
| 10 | telemetry | `src/telemetry/ResilienceTelemetry.ts` | 10-event-type event log |
| 11 | api | `src/api/ResiliencePlatform.ts` | `ResiliencePlatform` facade orchestrating all modules |

---

## Public API

The `ResiliencePlatform` class exposes 9 public API methods:

| Method | Signature | Description |
|--------|-----------|-------------|
| `executeProtected` | `<T>(fn, options?) => Promise<T>` | Run `fn` behind a named circuit breaker + retry |
| `retry` | `<T>(fn, config) => Promise<RetryResult<T>>` | Run `fn` with a custom retry config |
| `openCircuit` | `(name: string) => void` | Force-open a named circuit breaker |
| `closeCircuit` | `(name: string) => void` | Force-close a named circuit breaker |
| `createBackup` | `(target, data, options?) => BackupSnapshot` | Create a full or incremental snapshot |
| `restoreBackup` | `(snapshotId, options?) => RestoreResult` | Restore a snapshot, optionally selective |
| `replicate` | `(target, data) => ReplicationResult` | Replicate data to a target with conflict detection |
| `runChaosScenario` | `(scenarioId: string) => ChaosResult` | Execute a registered chaos scenario |
| `healthReport` | `() => ResilienceHealth` | Aggregate health across all subsystems |

---

## Package statistics

| Metric | Value |
|--------|-------|
| Source files | 15 |
| Test files | 9 |
| Test suites | 9 |
| Tests | 111 (all passing) |
| Line coverage | 98.31% |
| Runtime dependencies | 0 |

---

## Documentation

| Document | Topic |
|----------|-------|
| [VALIDATION_REPORT.md](./VALIDATION_REPORT.md) | Build, test & coverage validation results |
| [docs/architecture.md](./docs/architecture.md) | Module layout and data flow |
| [docs/circuit-breaker.md](./docs/circuit-breaker.md) | States, transitions, configuration |
| [docs/retry.md](./docs/retry.md) | Backoff strategies, jitter, predicates |
| [docs/failover.md](./docs/failover.md) | Instances, load balancing, failover |
| [docs/replication.md](./docs/replication.md) | Targets, conflicts, resolution |
| [docs/backup.md](./docs/backup.md) | Snapshots, integrity, selective restore |
| [docs/chaos.md](./docs/chaos.md) | Scenarios, factories, reports |
| [docs/disaster-recovery.md](./docs/disaster-recovery.md) | RPO/RTO, plans, step execution |
| [docs/api.md](./docs/api.md) | Full public API reference |
| [docs/examples.md](./docs/examples.md) | 16 end-to-end examples |

---

## License

Proprietary © CompilerAI. All rights reserved.
