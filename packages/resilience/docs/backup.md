# Backup & Restore

The Backup module creates full and incremental snapshots, validates their integrity via
checksums, and restores data with optional selective key filtering. It is implemented in
`src/backup/BackupManager.ts` and modeled by the `IBackupManager` interface.

---

## Snapshot types

`BackupType` has two values:

| Type | Behavior |
|------|----------|
| `full` | Stores the entire `data` object as-is. |
| `incremental` | Stores only the keys whose serialized value differs from the parent snapshot identified by `parentId`. |

A `BackupSnapshot` carries `{ id, type, target, status, sizeBytes, checksum, createdAt,
parentId, data, validated }`. Snapshots are versioned through `parentId` chains; an
incremental snapshot without a valid parent falls back to storing the full data.

---

## Checksums and integrity validation

On creation the manager computes a checksum over the snapshot's (possibly diffed) data and
stores it. `validateIntegrity(snapshotId)` recomputes the checksum and compares it to the
stored value, returning `true` only on an exact match. A snapshot is marked `validated`
automatically at creation time.

`restoreBackup` also runs an integrity check and reports `integrityValid` in the
`RestoreResult`; a failed integrity check is recorded as an error and causes `success` to be
`false`.

---

## Selective restore

`restoreBackup(snapshotId, { selectiveKeys })` restores only the listed keys. Keys not
present in the snapshot are reported in `errors` (and do not count toward
`recordsRestored`). When `selectiveKeys` is omitted or empty, the entire snapshot is
restored.

The `RestoreResult` includes:

| Field | Description |
|-------|-------------|
| `snapshotId` | The snapshot being restored |
| `success` | `true` when no errors occurred |
| `recordsRestored` | Number of keys actually restored |
| `integrityValid` | Checksum validation result |
| `durationMs` | Restore duration |
| `errors` | List of missing-key and integrity errors |
| `timestamp` | ISO timestamp |

---

## Parent chain merging for incremental

When restoring an **incremental** snapshot, the manager reconstructs the full data by
walking the `parentId` chain:

```
getParentChain(snapshot)
  → [parent, grandparent, …]   // ordered oldest → newest

merged = {}
for each ancestor in chain: Object.assign(merged, ancestor.data)
Object.assign(merged, snapshot.data)   // incremental delta applied last
```

Selective key filtering is then applied to the merged data, so callers always work against a
complete view regardless of snapshot type.

---

## Code example

```ts
import { BackupManager } from '@compilerai/resilience';

const backup = new BackupManager();

// Full backup
const full = backup.createBackup('knowledge_graph', {
  node1: 'a',
  node2: 'b',
  node3: 'c',
});
console.log(full.type, full.checksum, full.validated); // 'full', 'sha256-…', true

// Incremental backup — only node2 changed
const incremental = backup.createBackup('knowledge_graph', {
  node1: 'a',
  node2: 'B-changed',
  node3: 'c',
}, { type: 'incremental', parentId: full.id });
console.log(incremental.data); // { node2: 'B-changed' } — only the delta

// Restore the incremental snapshot — parent chain is merged automatically
const restore = backup.restoreBackup(incremental.id);
console.log(restore.recordsRestored); // 3 (full reconstructed state)
console.log(restore.integrityValid);  // true

// Selective restore of a single key
const selective = backup.restoreBackup(full.id, { selectiveKeys: ['node1', 'node9'] });
console.log(selective.recordsRestored); // 1 (node9 missing)
console.log(selective.errors);          // ["Key 'node9' not found in snapshot"]

// Standalone integrity check
console.log(backup.validateIntegrity(full.id)); // true

// Inventory
console.log(backup.getSnapshots().length);
console.log(backup.countByType('incremental'));
```

### Via the facade

```ts
import { ResiliencePlatform } from '@compilerai/resilience';

const platform = new ResiliencePlatform();

const snap = platform.createBackup('shared_memory', { session: 'abc' });
// emits a backup.completed event

const result = platform.restoreBackup(snap.id, { selectiveKeys: ['session'] });
// emits a restore.completed event
```

The facade emits `backup.completed` (with snapshot id, target, type, and size) and
`restore.completed` (with snapshot id, success, and records restored) telemetry events.
