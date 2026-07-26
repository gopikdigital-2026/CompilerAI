# Examples

This document collects 16 complete, runnable examples for `@compilerai/resilience`. Every
example is self-contained — copy it into a `.ts` file and run with `tsx`. Signatures are
verified against the source in `src/`.

```ts
// Common import for every example below:
import { ResiliencePlatform } from '@compilerai/resilience';
```

---

## 1. Execute a function with circuit breaker protection

```ts
import { ResiliencePlatform } from '@compilerai/resilience';

const platform = new ResiliencePlatform();

const data = await platform.executeProtected(
  async () => {
    const res = await fetch('https://api.example.com/users');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<{ users: unknown[] }>;
  },
  { circuitName: 'users-api' },
);

console.log(data.users.length);
console.log(platform.getCircuitBreakerState('users-api')); // 'closed'
```

`executeProtected` wraps the call in a circuit breaker named `'users-api'` and retries with
the default exponential config. If the breaker is open, the call rejects immediately with
`Circuit breaker 'users-api' is open`.

---

## 2. Retry with exponential backoff

```ts
import {
  ResiliencePlatform,
  createRetryConfig,
  isTransientError,
} from '@compilerai/resilience';

const platform = new ResiliencePlatform();

let calls = 0;
const result = await platform.retry(
  async () => {
    calls++;
    if (calls < 3) throw new Error('timeout'); // transient → retried
    return `ok after ${calls} calls`;
  },
  createRetryConfig({
    maxAttempts: 5,
    strategy: 'exponential',
    baseDelayMs: 50,
    maxDelayMs: 1000,
    jitter: true,
    isRetryable: isTransientError,
  }),
);

console.log(result.success);   // true
console.log(result.result);    // 'ok after 3 calls'
console.log(result.attempts);  // 3
console.log(result.delays);    // [50, 100] (before jitter)
```

A non-transient error (e.g. `'unauthorized'`) would stop retries immediately.

---

## 3. Open and close a circuit breaker manually

```ts
import { ResiliencePlatform } from '@compilerai/resilience';

const platform = new ResiliencePlatform();

// Force-open the breaker — subsequent executeProtected calls will reject
platform.openCircuit('billing-api');
console.log(platform.getCircuitBreakerState('billing-api')); // 'open'

try {
  await platform.executeProtected(
    async () => 'should not run',
    { circuitName: 'billing-api' },
  );
} catch (err) {
  console.error((err as Error).message); // "Circuit breaker 'billing-api' is open"
}

// Force-close and try again
platform.closeCircuit('billing-api');
const ok = await platform.executeProtected(
  async () => 'now it works',
  { circuitName: 'billing-api' },
);
console.log(ok); // 'now it works'
```

Manual transitions emit `circuit.opened` and `circuit.closed` telemetry events.

---

## 4. Set up failover with multiple instances

```ts
import {
  ResiliencePlatform,
  createInstance,
} from '@compilerai/resilience';

const platform = new ResiliencePlatform({
  instances: [
    createInstance('inst-1', 'Primary',   'http://primary:8080',   1),
    createInstance('inst-2', 'Secondary', 'http://secondary:8080', 2),
    createInstance('inst-3', 'Tertiary',  'http://tertiary:8080',  3),
  ],
});

const active = platform.failover?.getActiveInstance();
console.log(active?.id);   // 'inst-1'
console.log(active?.name); // 'Primary'

console.log(platform.failover?.getAllInstances().length); // 3
```

The highest-priority standby is promoted to `active` on construction.

---

## 5. Trigger failover

```ts
import { ResiliencePlatform } from '@compilerai/resilience';

const platform = new ResiliencePlatform({
  instances: ResiliencePlatform.createDefaultInstances(),
});

console.log(platform.failover?.getActiveInstance()?.id); // 'inst-1'

const event = platform.triggerFailover('primary health check failed');
console.log(event?.fromInstanceId); // 'inst-1'
console.log(event?.toInstanceId);   // 'inst-2'
console.log(event?.reason);         // 'primary health check failed'

// Mark the new active instance failed → automatic failover
platform.failover?.markFailed('inst-2');
console.log(platform.failover?.getActiveInstance()?.id); // 'inst-3'

// Recover the primary back to standby
platform.failover?.markRecovered('inst-1');
console.log(platform.failover?.getFailoverEvents().length); // 2
```

`triggerFailover` emits a `failover.started` telemetry event. Calling it when `failover` is
absent (no instances supplied) returns `null`.

---

## 6. Replicate data to the knowledge graph

```ts
import {
  ResiliencePlatform,
  createReplicaNode,
} from '@compilerai/resilience';

const platform = new ResiliencePlatform();

platform.replication.registerNode(
  createReplicaNode('kg-node-1', 'knowledge_graph', 'http://kg:7000'),
);

const result = platform.replicate('knowledge_graph', {
  node: 'n1',
  label: 'Person',
  edges: ['n2', 'n3'],
});

console.log(result.success);       // true (no conflicts)
console.log(result.recordsSynced); // 3
console.log(result.conflicts);     // []
console.log(result.durationMs);
```

The facade emits a `replication.completed` event carrying the target, success, records
synced, and conflict count.

---

## 7. Detect and resolve replication conflicts

```ts
import { ResiliencePlatform, createReplicaNode } from '@compilerai/resilience';

const platform = new ResiliencePlatform();
platform.replication.registerNode(
  createReplicaNode('mem-1', 'shared_memory', 'http://mem:9000'),
);

// Seed a value
platform.replicate('shared_memory', { session: 'abc', count: 1 });

// Replicate a divergent value for 'session' → conflict
const r = platform.replicate('shared_memory', { session: 'xyz' });
console.log(r.success);           // false
console.log(r.conflicts.length);  // 1
console.log(r.conflicts[0].key);  // 'session'

// Resolve with source_wins — the incoming value wins
const conflictId = r.conflicts[0].id;
const ok = platform.replication.resolveConflict(conflictId, 'source_wins');
console.log(ok); // true
console.log(platform.replication.getConflicts().length); // 0

// Verify the value was overwritten
const store = platform.replication.getStore('shared_memory');
console.log(store.session); // 'xyz'

// Pre-flight detection without writing
const detected = platform.replication.detectConflicts(
  'shared_memory',
  { count: 99 },
  store,
);
console.log(detected.length); // 1 (count differs)
```

The other strategies are `target_wins` (keep existing), `merge` (shallow-merge objects), and
`manual` (no automatic action).

---

## 8. Create a full backup

```ts
import { ResiliencePlatform } from '@compilerai/resilience';

const platform = new ResiliencePlatform();

const snapshot = platform.createBackup('knowledge_graph', {
  node1: 'a',
  node2: 'b',
  node3: 'c',
});

console.log(snapshot.type);      // 'full'
console.log(snapshot.target);    // 'knowledge_graph'
console.log(snapshot.status);    // 'completed'
console.log(snapshot.validated); // true
console.log(snapshot.checksum);  // 'sha256-…'
console.log(snapshot.sizeBytes);

// Verify integrity independently
console.log(platform.backup.validateIntegrity(snapshot.id)); // true
console.log(platform.backup.getSnapshots().length);          // 1
```

The facade emits a `backup.completed` event with the snapshot id, target, type, and size.

---

## 9. Create an incremental backup

```ts
import { ResiliencePlatform } from '@compilerai/resilience';

const platform = new ResiliencePlatform();

// Full backup first
const full = platform.createBackup('shared_memory', {
  a: 1,
  b: 2,
  c: 3,
});

// Only 'b' changed — incremental stores just the delta
const incremental = platform.createBackup(
  'shared_memory',
  { a: 1, b: 99, c: 3 },
  { type: 'incremental', parentId: full.id },
);

console.log(incremental.type);      // 'incremental'
console.log(incremental.parentId);  // full.id
console.log(incremental.data);      // { b: 99 } — only the diff
console.log(incremental.validated); // true
```

If the `parentId` does not exist, the snapshot falls back to storing the full data set.

---

## 10. Restore from a backup (selective)

```ts
import { ResiliencePlatform } from '@compilerai/resilience';

const platform = new ResiliencePlatform();

const full = platform.createBackup('all', {
  user: 'alice',
  email: 'alice@example.com',
  prefs: { theme: 'dark' },
});

// Selective restore — only two keys
const selective = platform.restoreBackup(full.id, {
  selectiveKeys: ['user', 'email', 'missing-key'],
});

console.log(selective.success);         // false (missing-key is an error)
console.log(selective.recordsRestored); // 2
console.log(selective.integrityValid);  // true
console.log(selective.errors);          // ["Key 'missing-key' not found in snapshot"]

// Restore everything
const fullRestore = platform.restoreBackup(full.id);
console.log(fullRestore.recordsRestored); // 3
console.log(fullRestore.success);         // true

// Restore from an incremental snapshot — parent chain is merged automatically
const inc = platform.createBackup('all', { user: 'bob' }, {
  type: 'incremental',
  parentId: full.id,
});
const incRestore = platform.restoreBackup(inc.id);
console.log(incRestore.recordsRestored); // 3 (full reconstructed state)
```

The facade emits a `restore.completed` event with the snapshot id, success, and records
restored.

---

## 11. Run a chaos scenario

```ts
import { ResiliencePlatform } from '@compilerai/resilience';

const platform = new ResiliencePlatform(); // 6 default scenarios registered

const scenarios = platform.chaos.getScenarios();
console.log(scenarios.map((s) => s.type));
// ['connector_failure','memory_pressure','agent_timeout',
//  'data_corruption','high_latency','service_interruption']

const connectorScenario = scenarios.find((s) => s.type === 'connector_failure')!;
const result = platform.runChaosScenario(connectorScenario.id);

console.log(result.executed);        // true
console.log(result.passed);          // true (issues were detected)
console.log(result.recovered);       // true
console.log(result.detectedIssues);  // ['Connector became unavailable', 'Circuit breaker opened']
console.log(result.recoveryTimeMs);
```

`runChaosScenario` emits a `chaos.finished` telemetry event. An unknown scenario id returns
a result with `executed: false` instead of throwing.

---

## 12. Generate a resilience report

```ts
import { ResiliencePlatform } from '@compilerai/resilience';

const platform = new ResiliencePlatform();

// Run all six default scenarios
const results = platform.runAllChaosScenarios();
console.log(results.length); // 6

// Aggregate into a report
const report = platform.generateChaosReport();

console.log(report.totalScenarios);          // 6
console.log(report.passed + report.failed);  // 6
console.log(report.overallResilienceScore);  // 100
console.log(report.scenarios.length);        // 6
for (const rec of report.recommendations) {
  console.log('-', rec);
}
```

Recommendations are auto-generated based on pass/fail counts, recovery times, and
data-corruption recovery status.

---

## 13. Recover a queue with idempotency

```ts
import { ResiliencePlatform } from '@compilerai/resilience';
import type { QueueItem } from '@compilerai/resilience';

const platform = new ResiliencePlatform();

// Enqueue some items — each has an idempotencyKey
platform.queue.enqueue({
  type: 'pending_job',
  payload: { task: 'send-email' },
  idempotencyKey: 'job-001',
});
platform.queue.enqueue({
  type: 'workflow',
  payload: { flow: 'onboarding' },
  idempotencyKey: 'wf-001',
});
platform.queue.enqueue({
  type: 'agent_task',
  payload: { agent: 'planner' },
  idempotencyKey: 'agent-001',
});
platform.queue.enqueue({
  type: 'event',
  payload: { name: 'user.created' },
  idempotencyKey: 'evt-001',
});

// Duplicate enqueue with the same idempotencyKey is suppressed
const dup = platform.queue.enqueue({
  type: 'pending_job',
  payload: { task: 'send-email' },
  idempotencyKey: 'job-001',
});
console.log(dup.status); // 'completed' (suppressed, not re-queued)

// Recover — process every pending item
const processedKeys = new Set<string>();
const result = await platform.recoverQueue(async (item: QueueItem) => {
  if (processedKeys.has(item.idempotencyKey)) return false; // safety net
  processedKeys.add(item.idempotencyKey);
  // ... do the actual work ...
  return true;
});

console.log(result.totalItems);          // 4
console.log(result.recovered);           // 4
console.log(result.failed);              // 0
console.log(result.duplicateSuppressed); // 0 (dup was suppressed at enqueue)

console.log(platform.queue.getPending().length); // 0
```

`recover` marks each item `processing`, calls the processor, and on success marks it
`completed` and records the idempotency key. A processor returning `false` or throwing
leaves the item `pending` for a later retry.

---

## 14. Create and execute a disaster recovery plan

```ts
import { ResiliencePlatform } from '@compilerai/resilience';

const platform = new ResiliencePlatform({
  disasterRecoveryConfig: {
    rpoSeconds: 60,
    rtoSeconds: 300,
    mode: 'automatic',
    backupIntervalMs: 3_600_000,
    maxBackups: 10,
  },
});

// Create a plan from the platform's config
const plan = platform.createRecoveryPlan();
console.log(plan.steps.map((s) => s.name));
// ['Assess Damage','Select Backup','Restore Data','Restart Services','Validate Integrity']
console.log(plan.estimatedRecoveryTimeMs); // 5 * 300 * 100 = 150000

// Execute it
const result = platform.executeRecoveryPlan(plan.id);
console.log(result.success);         // true
console.log(result.completedSteps);  // 5
console.log(result.totalSteps);      // 5
console.log(result.rpoMet);          // true (recovery was instant)
console.log(result.rtoMet);          // true

// Validate
console.log(platform.disasterRecovery.validateRecovery(plan.id)); // true

// Manual mode prepends an approval step
platform.disasterRecovery.updateConfig({ mode: 'manual' });
const manualPlan = platform.createRecoveryPlan({ mode: 'manual' });
console.log(manualPlan.steps[0].name); // 'Await Manual Approval'
console.log(manualPlan.steps.length);  // 6
```

---

## 15. Get a health report

```ts
import { ResiliencePlatform } from '@compilerai/resilience';

const platform = new ResiliencePlatform({
  instances: ResiliencePlatform.createDefaultInstances(),
});

// Perform some operations to populate state
await platform.executeProtected(async () => 'ok', { circuitName: 'api' });
platform.createBackup('all', { k: 'v' });
platform.replicate('configuration', { setting: true });

const health = platform.healthReport();

console.log(health.overallStatus);    // 'healthy' | 'degraded' | 'critical'
console.log(health.activeInstances);  // 1
console.log(health.totalInstances);   // 3
console.log(health.pendingQueueItems);// 0
console.log(health.lastBackupAt);     // ISO timestamp
console.log(health.lastReplicationAt);// ISO timestamp
for (const cb of health.circuitBreakers) {
  console.log(cb.name, cb.state, cb.healthy);
}
```

`overallStatus` is `critical` when any circuit is open or no instances are active,
`degraded` when the queue backlog exceeds 100 or some instances are down, and `healthy`
otherwise.

---

## 16. Full end-to-end resilience workflow

```ts
import { ResiliencePlatform } from '@compilerai/resilience';
import type { QueueItem, RetryConfig } from '@compilerai/resilience';
import { createRetryConfig, isTransientError } from '@compilerai/resilience';

// ── 1. Bootstrap the platform with HA + DR config ─────────────────────────────
const platform = new ResiliencePlatform({
  instances: ResiliencePlatform.createDefaultInstances(),
  disasterRecoveryConfig: { rpoSeconds: 60, rtoSeconds: 300, mode: 'automatic' },
});

// ── 2. Replicate initial data ─────────────────────────────────────────────────
platform.replication.registerNode({
  id: 'kg-1', target: 'knowledge_graph', endpoint: 'http://kg:7000',
  status: 'synced', lastSyncAt: new Date().toISOString(), lag: 0,
});
const repl = platform.replicate('knowledge_graph', { root: 'concept-1' });
console.log('replicated:', repl.recordsSynced, 'keys');

// ── 3. Take a full backup ─────────────────────────────────────────────────────
const fullBackup = platform.createBackup('all', {
  root: 'concept-1',
  session: 'abc',
  config: { region: 'us-east' },
});
console.log('backup:', fullBackup.id, fullBackup.checksum);

// ── 4. Execute protected work through the breaker + retry ─────────────────────
const retryConfig: RetryConfig = createRetryConfig({
  maxAttempts: 4,
  strategy: 'exponential',
  baseDelayMs: 50,
  maxDelayMs: 2000,
  jitter: true,
  isRetryable: isTransientError,
});

const processed = await platform.executeProtected(async () => {
  // ... call a flaky downstream service ...
  return { ok: true };
}, { circuitName: 'downstream', retryConfig });
console.log('processed:', processed.ok);

// ── 5. Enqueue recovery work and process it idempotently ──────────────────────
platform.queue.enqueue({
  type: 'pending_job', payload: { task: 'reindex' }, idempotencyKey: 'reindex-1',
});
const queueResult = await platform.recoverQueue(async (item: QueueItem) => {
  console.log('processing', item.id, item.type);
  return true;
});
console.log('queue recovered:', queueResult.recovered);

// ── 6. Simulate a failover ────────────────────────────────────────────────────
const foEvent = platform.triggerFailover('planned maintenance');
console.log('failed over:', foEvent?.fromInstanceId, '→', foEvent?.toInstanceId);

// ── 7. Run chaos scenarios and review the report ──────────────────────────────
platform.runAllChaosScenarios();
const report = platform.generateChaosReport();
console.log('resilience score:', report.overallResilienceScore);
for (const rec of report.recommendations) console.log('  -', rec);

// ── 8. Create and validate a disaster recovery plan ───────────────────────────
const drPlan = platform.createRecoveryPlan();
const drResult = platform.executeRecoveryPlan(drPlan.id);
console.log('DR:', drResult.success, 'rpoMet:', drResult.rpoMet, 'rtoMet:', drResult.rtoMet);

// ── 9. Restore from the incremental backup if needed ──────────────────────────
const incBackup = platform.createBackup('all', { session: 'def' }, {
  type: 'incremental', parentId: fullBackup.id,
});
const restore = platform.restoreBackup(incBackup.id);
console.log('restored:', restore.recordsRestored, 'records, valid:', restore.integrityValid);

// ── 10. Final health + telemetry review ───────────────────────────────────────
const health = platform.healthReport();
console.log('overall:', health.overallStatus, 'active:', health.activeInstances);

const events = platform.getTelemetryEvents();
console.log('telemetry events:', events.length);
console.log('by type:',
  events.filter((e) => e.type === 'backup.completed').length, 'backups,',
  events.filter((e) => e.type === 'chaos.finished').length, 'chaos,',
  events.filter((e) => e.type === 'failover.started').length, 'failovers');
```

This workflow exercises every subsystem — replication, backup, protected execution, queue
recovery, failover, chaos, disaster recovery, restore, health, and telemetry — in a single
coherent script.
