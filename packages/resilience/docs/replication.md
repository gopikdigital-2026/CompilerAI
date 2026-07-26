# Replication Manager

The Replication module synchronizes data to one of four replication targets, detects
key-level conflicts between source and existing data, and resolves them with one of four
strategies. It is implemented in `src/replication/ReplicationManager.ts` and modeled by the
`IReplicationManager` interface.

---

## Replication targets

`ReplicationTarget` enumerates the four destinations:

| Target | Typical contents |
|--------|------------------|
| `knowledge_graph` | Graph nodes and edges |
| `enterprise_rag` | RAG index documents and embeddings |
| `shared_memory` | Cross-service shared state / sessions |
| `configuration` | Service configuration values |

Each target is served by one or more registered `ReplicaNode`s (`{ id, target, endpoint,
status, lastSyncAt, lag }`). Use `createReplicaNode(id, target, endpoint)` to create a node
with `status: 'synced'` and `lag: 0`. A node's `ReplicationStatus` is `synced`, `syncing`,
`conflict`, or `failed`.

---

## Conflict detection

`replicate(target, data)` walks each key in `data`:

- If the key is **new** to the target store → it is written and `recordsSynced` increments.
- If the key **exists** and its serialized value differs from the incoming value → a
  `ConflictRecord` is created (`{ id, target, key, sourceValue, targetValue, detectedAt }`)
  and the key is **not** overwritten. The node status becomes `conflict`.
- If the key exists and matches → no-op (still counts as synced).

The result `success` is `true` only when no conflicts were detected.

`detectConflicts(target, sourceData, targetData)` performs the same comparison without
writing, returning the list of `ConflictRecord`s — useful for pre-flight checks.

---

## Resolution strategies

`resolveConflict(conflictId, strategy)` applies one of four strategies:

| Strategy | Action |
|----------|--------|
| `source_wins` | Overwrite the target value with the source value. |
| `target_wins` | Keep the existing target value (source discarded). |
| `merge` | If the source value is an object, shallow-merge it onto the existing value; otherwise overwrite with the source value. |
| `manual` | Take no automatic action — the conflict remains for an operator to resolve. |

On any strategy except `manual`, the conflict is removed from the active conflict list after
resolution. `resolveConflict` returns `false` if the conflict or store cannot be found.

The full conflict list is available via `getConflicts()`.

---

## Code example

```ts
import {
  ReplicationManager,
  createReplicaNode,
} from '@compilerai/resilience';

const replication = new ReplicationManager();

// Register a node for the shared_memory target
replication.registerNode(createReplicaNode('node-mem-1', 'shared_memory', 'http://mem:9000'));

// First replication — all keys are new
const r1 = replication.replicate('shared_memory', { session: 'abc', user: 'alice' });
console.log(r1.success, r1.recordsSynced); // true, 2

// Second replication with a divergent value → conflict
const r2 = replication.replicate('shared_memory', { session: 'xyz' });
console.log(r2.success, r2.conflicts.length); // false, 1

// Resolve the conflict
const conflict = r2.conflicts[0];
replication.resolveConflict(conflict.id, 'source_wins');
console.log(replication.getConflicts().length); // 0

// Pre-flight conflict detection without writing
const detected = replication.detectConflicts(
  'shared_memory',
  { user: 'bob' },
  replication.getStore('shared_memory'),
);
```

### Via the facade

```ts
import { ResiliencePlatform } from '@compilerai/resilience';

const platform = new ResiliencePlatform();

const result = platform.replicate('knowledge_graph', { node: 'n1', edges: [] });
// emits a replication.completed telemetry event with conflicts count

const conflicts = platform.replication.getConflicts();
platform.replication.resolveConflict(conflicts[0].id, 'merge');
```

The facade's `replicate` method emits a `replication.completed` event carrying the target,
success flag, records synced, and conflict count.
