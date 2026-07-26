# Public API Reference

The `ResiliencePlatform` class in `src/api/ResiliencePlatform.ts` is the primary entry point
to the package. It wires together all 11 modules and exposes the 9 public API methods
defined by the `IResiliencePlatform` interface, plus convenience helpers and direct access to
each subsystem.

---

## `ResiliencePlatform`

### Constructor

```ts
new ResiliencePlatform(options?: {
  instances?: Instance[];                      // enables failover when provided
  disasterRecoveryConfig?: Partial<DisasterRecoveryConfig>;
})
```

When `instances` is a non-empty array, a `FailoverManager` is constructed and exposed as
`platform.failover`; otherwise `platform.failover` is `undefined`. The constructor also
registers all six default chaos scenarios via `chaos.registerAllDefaults()`.

### Public properties

| Property | Type | Description |
|----------|------|-------------|
| `circuitBreakers` | `Map<string, CircuitBreaker>` | Named breakers, created lazily |
| `retryEngine` | `RetryEngine` | Shared retry engine |
| `failover` | `FailoverManager?` | Present only when instances were supplied |
| `replication` | `ReplicationManager` | Replication subsystem |
| `backup` | `BackupManager` | Backup subsystem |
| `chaos` | `ChaosEngine` | Chaos subsystem (defaults registered) |
| `queue` | `QueueRecovery` | Queue recovery subsystem |
| `disasterRecovery` | `DisasterRecoveryManager` | DR subsystem |
| `telemetry` | `ResilienceTelemetry` | Event log |

---

## Public API methods

### `executeProtected<T>(fn, options?) → Promise<T>`

```ts
executeProtected<T>(
  fn: () => Promise<T>,
  options?: { circuitName?: string; retryConfig?: RetryConfig },
): Promise<T>
```

Runs `fn` inside a named circuit breaker wrapped by the retry engine. If no `circuitName` is
given, `'default'` is used. If no `retryConfig` is given, a default exponential config
(max 3 attempts, 50ms base, 5s cap, no jitter) is used with `isRetryable` that treats
circuit-open errors as non-retryable and otherwise defers to `isTransientError`. Throws the
last error if all attempts fail.

### `retry<T>(fn, config) → Promise<RetryResult<T>>`

```ts
retry<T>(fn: () => Promise<T>, config: RetryConfig): Promise<RetryResult<T>>
```

Runs `fn` with the supplied retry config and returns the full `RetryResult`. Emits a
`retry.executed` telemetry event with attempts, success, and total delay.

### `openCircuit(name) → void`

```ts
openCircuit(name: string): void
```

Force-opens the named circuit breaker (creating it lazily if needed). Emits a
`circuit.opened` event.

### `closeCircuit(name) → void`

```ts
closeCircuit(name: string): void
```

Force-closes the named circuit breaker (creating it lazily if needed). Emits a
`circuit.closed` event.

### `createBackup(target, data, options?) → BackupSnapshot`

```ts
createBackup(
  target: ReplicationTarget | 'all',
  data: Record<string, unknown>,
  options?: { type?: BackupType; parentId?: string },
): BackupSnapshot
```

Creates a full (default) or incremental snapshot. Emits a `backup.completed` event with the
snapshot id, target, type, and size.

### `restoreBackup(snapshotId, options?) → RestoreResult`

```ts
restoreBackup(
  snapshotId: string,
  options?: { selectiveKeys?: string[] },
): RestoreResult
```

Restores a snapshot, optionally limited to `selectiveKeys`. Emits a `restore.completed`
event with the snapshot id, success flag, and records restored.

### `replicate(target, data) → ReplicationResult`

```ts
replicate(target: ReplicationTarget, data: Record<string, unknown>): ReplicationResult
```

Replicates `data` to the given target, returning sync results and any conflicts. Emits a
`replication.completed` event with target, success, records synced, and conflict count.

### `runChaosScenario(scenarioId) → ChaosResult`

```ts
runChaosScenario(scenarioId: string): ChaosResult
```

Runs a registered chaos scenario by id. Emits a `chaos.finished` event with the scenario id,
pass flag, and recovery flag. (See also `runAllChaosScenarios()` and
`generateChaosReport()`.)

### `healthReport() → ResilienceHealth`

```ts
healthReport(): ResilienceHealth
```

Returns an aggregate `ResilienceHealth` snapshot: per-breaker state, active/total instance
counts, pending queue depth, last backup/replication timestamps, and an `overallStatus` of
`healthy`, `degraded`, or `critical`.

---

## Additional facade methods

Beyond the 9 core API methods, the facade exposes:

| Method | Description |
|--------|-------------|
| `getOrCreateCircuitBreaker(name, config?)` | Look up or lazily create a breaker |
| `getCircuitBreakerState(name)` | Current state of a named breaker |
| `runAllChaosScenarios()` | Run every registered scenario |
| `generateChaosReport()` | Delegate to `chaos.generateReport()` |
| `recoverQueue(processor)` | Idempotent queue recovery |
| `createRecoveryPlan(config?)` | Create a DR plan from the platform's config |
| `executeRecoveryPlan(planId)` | Execute a DR plan |
| `triggerFailover(reason)` | Delegate to `failover.failover` (null if no failover) |
| `getTelemetryEvents()` | Read the telemetry event log |

### Static factories

| Factory | Description |
|---------|-------------|
| `ResiliencePlatform.createDefaultCircuitBreaker(name)` | Breaker with threshold 5, 30s reset, window 20, 3 half-open calls |
| `ResiliencePlatform.createDefaultRetryConfig(maxAttempts?)` | Exponential, 100ms base, 5s cap, jitter on, `isTransientError` |
| `ResiliencePlatform.createDefaultInstances()` | Three instances (Primary/Secondary/Tertiary) at priorities 1/2/3 |

---

## Code example

```ts
import { ResiliencePlatform } from '@compilerai/resilience';

const platform = new ResiliencePlatform({
  instances: ResiliencePlatform.createDefaultInstances(),
  disasterRecoveryConfig: { rpoSeconds: 60, rtoSeconds: 300, mode: 'automatic' },
});

// Protected execution
const data = await platform.executeProtected(
  async () => fetch('https://api.example.com').then((r) => r.json()),
  { circuitName: 'api' },
);

// Backup + restore
const snap = platform.createBackup('all', { key: 'value' });
const restored = platform.restoreBackup(snap.id);

// Replicate
const repl = platform.replicate('knowledge_graph', { node: 'n1' });

// Chaos + health
platform.runAllChaosScenarios();
const report = platform.generateChaosReport();
const health = platform.healthReport();

console.log(health.overallStatus, report.overallResilienceScore);

// Telemetry
console.log(platform.getTelemetryEvents().length);
```
