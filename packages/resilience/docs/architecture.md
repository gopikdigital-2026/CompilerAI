# Architecture

This document describes the module layout of `@compilerai/resilience` and how data flows
between its 11 modules. The package is organized as a set of single-responsibility modules,
each implementing an interface declared in `src/models.ts`, orchestrated by the
`ResiliencePlatform` facade in `src/api/`.

---

## Module map

```
                         ┌─────────────────────────────────────┐
                         │        ResiliencePlatform           │  (src/api)
                         │       — public facade (9 API) —     │
                         └───────────────┬─────────────────────┘
                                         │
   ┌──────────────┬──────────────┬───────┴────────┬──────────────┬──────────────┐
   ▼              ▼              ▼                ▼              ▼              ▼
┌──────────┐ ┌──────────┐ ┌────────────┐ ┌──────────────┐ ┌──────────┐ ┌────────────┐
│ Circuit  │ │  Retry   │ │  Failover  │ │ Replication  │ │  Backup  │ │   Chaos    │
│ Breaker  │ │  Engine  │ │            │ │   Manager    │ │ Manager  │ │   Engine   │
│ (3-state)│ │ (3 strat)│ │ (3 LB strat)│ │ (4 targets)  │ │ (2 types)│ │ (6 scenari)│
└──────────┘ └──────────┘ └────────────┘ └──────────────┘ └──────────┘ └────────────┘
                                                                              │
   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┘
   ▼              ▼  ▼              ▼  ▼              ▼
┌──────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  Queue   │ │  Disaster    │ │   Health     │ │  Telemetry   │
│ Recovery │ │  Recovery    │ │  Provider    │ │              │
│ (4 types)│ │  (RPO/RTO)   │ │ (3 statuses) │ │ (10 events)  │
└──────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

All modules sit behind the facade. Telemetry is written to by every operation; Health reads
from the circuit breakers, failover registry, queue, backup, and replication modules to
produce an aggregate status.

---

## Module descriptions

### 1. Circuit Breaker — `src/circuit-breaker/`
Protects downstream calls by tracking consecutive failures and a rolling window. Trips to
`open` when `failureThreshold` or `failurePercentageThreshold` is exceeded, transitions to
`half_open` after `resetTimeoutMs`, and back to `closed` on trial success.

### 2. Retry Engine — `src/retry/`
Executes a function up to `maxAttempts` times. Computes delay via `exponential`, `linear`,
or `fixed` backoff, optionally applies jitter, caps at `maxDelayMs`, and short-circuits on
non-retryable errors via the `isRetryable` predicate.

### 3. Failover — `src/failover/`
Holds a registry of `Instance`s with status and health score. Selects the active instance
by `priority`, `round_robin`, or `least_load`. On `failover()` the active instance is marked
`failed` and the next candidate is promoted; the event is recorded.

### 4. Replication — `src/replication/`
Syncs data to one of four targets. On key-level divergence between source and existing store
value, a `ConflictRecord` is created. Conflicts are resolved with `source_wins`,
`target_wins`, `merge`, or `manual`.

### 5. Backup — `src/backup/`
Creates `full` or `incremental` snapshots. Incremental snapshots store only keys that differ
from the parent and link via `parentId`. Restore merges the parent chain for incremental
snapshots, supports selective key restore, and validates integrity via a checksum.

### 6. Chaos — `src/chaos/`
Registers and runs chaos scenarios of 6 types. Each run produces a `ChaosResult` with
detected issues and recovery timing. `generateReport()` aggregates results into a
`ResilienceReport` with an overall score and recommendations.

### 7. Queue Recovery — `src/queue/`
Enqueues 4 item types with an `idempotencyKey`. `recover()` processes pending items through a
caller-supplied processor, suppressing duplicates and already-processed keys, and reports
recovered/failed/skipped/duplicateSuppressed counts.

### 8. Scheduler / Disaster Recovery — `src/scheduler/`
Creates recovery plans with RPO/RTO targets and ordered `RecoveryStep`s. Manual mode
prepends an "Await Manual Approval" step. `executePlan()` runs every step and reports whether
RPO/RTO were met; `validateRecovery()` confirms completion.

### 9. Health — `src/health/`
Aggregates circuit-breaker states, active/total instance counts, pending queue depth, and
last backup/replication timestamps into a single `ResilienceHealth` with `overallStatus` of
`healthy`, `degraded`, or `critical`.

### 10. Telemetry — `src/telemetry/`
In-memory event log for 10 event types. The facade emits an event on every significant
operation; events are queryable by type and clearable.

### 11. API — `src/api/`
The `ResiliencePlatform` class. Constructs and wires all modules, exposes 9 public methods,
and provides static convenience factories (`createDefaultCircuitBreaker`,
`createDefaultRetryConfig`, `createDefaultInstances`).

---

## Data flow

### Protected execution
```
executeProtected(fn)
  └─ retryEngine.execute(cb.execute(fn))
       └─ on error: computeDelay → sleep → retry
            └─ cb tracks failure → may trip to open
```
`executeProtected` wraps the function in a circuit breaker (looked up or created by name)
and then wraps that in the retry engine. Circuit-open errors are explicitly non-retryable.

### Backup → Restore
```
createBackup(target, data, {type, parentId})
  └─ full: snapshot = { data, checksum }
  └─ incremental: diff against parent → snapshot = { delta, checksum }

restoreBackup(snapshotId, {selectiveKeys})
  └─ incremental: merge parent chain → full data
  └─ selective: filter by keys
  └─ validate checksum → RestoreResult
```

### Replication → Conflict detection
```
replicate(target, data)
  └─ for each key: compare to store
       └─ divergence → ConflictRecord (status: conflict)
       └─ match/new → write (recordsSynced++)

resolveConflict(conflictId, strategy)
  └─ source_wins | target_wins | merge | manual
```

### Chaos → Report
```
runChaosScenario(scenarioId)
  └─ detect issues by type → ChaosResult { passed, recovered, recoveryTimeMs }

generateReport()
  └─ aggregate results → ResilienceReport { score, recommendations }
```

### Queue → Recover
```
enqueue(item with idempotencyKey)        // duplicate keys suppressed at enqueue
recover(processor)
  └─ for each pending: skip if processedKeys has key
       └─ else processor(item) → completed | back to pending
```

### Disaster Recovery → Plan → Execute
```
createPlan(config)                       // 5 steps (6 if manual)
executePlan(planId)
  └─ mark each step completed → RecoveryExecutionResult { rpoMet, rtoMet }
validateRecovery(planId)                 // every step completed?
```

---

## Design principles

1. **Zero runtime dependencies** — every module is pure TypeScript.
2. **Interface-first** — all contracts live in `src/models.ts`; implementations are
   swappable.
3. **Single facade** — `ResiliencePlatform` is the only entry point most callers need.
4. **Composable** — each module is usable independently of the facade.
5. **Observable** — every significant operation emits a telemetry event.
