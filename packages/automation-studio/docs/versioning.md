# Versioning

> **Sprint 28** — This guide covers the `VersionManager`: version history, structural diffing, tagging, finding versions by tag, restore (which creates a new version from an old snapshot), and snapshot creation.

## Overview

Every time a workflow is published, a **version snapshot** is captured — a copy of all nodes and connections at that point in time. The `VersionManager` provides read access to version history, structural diffs between versions, tagging, and restore. Version numbers are monotonically increasing and never reused.

```typescript
import { VersionManager } from '@compilerai/automation-studio';

const versionManager = new VersionManager(
  () => crypto.randomUUID(),
  () => new Date().toISOString(),
);
```

## Version History

`getHistory` returns a sorted (ascending by version) list of `VersionHistoryEntry` items, including the current working draft as an implicit entry if it isn't already represented by a published version.

```typescript
const history = versionManager.getHistory(workflow);
```

```typescript
interface VersionHistoryEntry {
  version: number;
  status: string;            // 'published' | 'draft' | 'unpublished' | ...
  publishedAt: string;       // ISO timestamp or ''
  publishedBy: string;       // user id or ''
  changelog: string;         // publish changelog or 'Working draft'
  tags: string[];            // tags applied to this version
  nodeCount: number;
  connectionCount: number;
}
```

Each entry includes the tags applied to that version and the node/connection counts at that version — useful for a history timeline UI.

```typescript
for (const entry of versionManager.getHistory(workflow)) {
  console.log(
    `v${entry.version} [${entry.status}] ${entry.changelog} ` +
    `(${entry.nodeCount} nodes, ${entry.connectionCount} edges) ` +
    `tags: ${entry.tags.join(', ') || '—'}`
  );
}
```

## Structural Diff

`diff` compares two versions and produces a `VersionDiff` describing exactly what changed: added, removed, and modified nodes, plus added and removed connections.

```typescript
const d = versionManager.diff(workflow, 1, 3);
```

```typescript
interface VersionDiff {
  fromVersion: number;
  toVersion: number;
  addedNodes: Array<{ id: string; type: string; label: string }>;
  removedNodes: Array<{ id: string; type: string; label: string }>;
  modifiedNodes: Array<{ id: string; changes: string[] }>;
  addedConnections: Array<{ from: string; to: string }>;
  removedConnections: Array<{ from: string; to: string }>;
  summary: string;
}
```

### How Diffing Works

1. **Snapshots** — The manager loads the snapshots for `fromVersion` and `toVersion` (from `workflow.versions`, or the current working nodes/connections if the version matches `currentVersion`).
2. **Nodes** — Compares node maps by ID:
   - Nodes in `toVersion` but not `fromVersion` → `addedNodes`
   - Nodes in `fromVersion` but not `toVersion` → `removedNodes`
   - Nodes in both with changed `label` or `config` → `modifiedNodes` with a `changes[]` array (e.g., `['label changed']`, `['config changed']`)
3. **Connections** — Compares connection sets by `from->to` key:
   - Keys in `toVersion` but not `fromVersion` → `addedConnections`
   - Keys in `fromVersion` but not `toVersion` → `removedConnections`
4. **Summary** — A compact string like `+2 nodes, -1 nodes, ~3 nodes, +4 edges`.

### Example

```typescript
const d = versionManager.diff(workflow, 1, 2);
console.log(d.summary);
// → '+2 nodes, ~1 nodes, +1 edges'

console.log(d.addedNodes);
// → [{ id: 'node-5', type: 'notification', label: 'Send Alert' }]

console.log(d.modifiedNodes);
// → [{ id: 'node-2', changes: ['config changed'] }]

console.log(d.removedConnections);
// → [{ from: 'node-3', to: 'node-4' }]
```

If there are no changes, `summary` is `'no changes'`.

## Tagging

Tags are labels applied to specific versions — for example `v1.0`, `stable`, `pre-redesign`. Tags are stored per workflow and never collide across workflows.

### Add a Tag

```typescript
workflow = versionManager.tagVersion(workflow, 2, 'v1.0', 'user-1');
// workflow.tags now includes 'v1.0'
```

`tagVersion` returns an updated workflow (with the tag added to `workflow.tags`). If the version already has that tag, it's a no-op — the workflow is returned unchanged.

### Remove a Tag

```typescript
workflow = versionManager.untagVersion(workflow, 2, 'v1.0');
// 'v1.0' removed from both the version tags and workflow.tags
```

### Get All Tags

```typescript
const tags = versionManager.getTags(workflow);
// → [{ version: 2, tag: 'v1.0', taggedAt: '...', taggedBy: 'user-1' }]
```

```typescript
interface VersionTag {
  version: number;
  tag: string;
  taggedAt: string;
  taggedBy: string;
}
```

## Find by Tag

`findByTag` locates the `VersionHistoryEntry` for a given tag:

```typescript
const entry = versionManager.findByTag(workflow, 'v1.0');
if (entry) {
  console.log(`Found v${entry.version} tagged 'v1.0'`);
}
// → null if no version has that tag
```

## Restore to Version

`restore` creates a **new version** from an old snapshot. It never mutates or deletes existing version history — it always appends a new version.

```typescript
workflow = versionManager.restore(workflow, 2, 'user-1');
```

### How Restore Works

1. Loads the snapshot for `targetVersion` from `workflow.versions`.
2. Deep-copies the snapshot's nodes and connections.
3. Creates a new `WorkflowVersion` with:
   - `version = workflow.currentVersion + 1`
   - `status = 'draft'`
   - `changelog = 'Restored from version {targetVersion}'`
   - The copied snapshot
4. Returns an updated workflow with:
   - `status = 'draft'`
   - `currentVersion` incremented
   - `nodes` and `connections` replaced with the restored snapshot
   - The new version appended to `versions`
   - `lastModifiedBy` and `updatedAt` updated

If the target version doesn't exist, the workflow is returned unchanged.

```typescript
const before = workflow.currentVersion;        // 3
workflow = versionManager.restore(workflow, 1, 'user-1');
const after = workflow.currentVersion;         // 4 (new version)
console.log(workflow.status);                  // 'draft'
console.log(workflow.nodes.length);            // matches v1 snapshot
```

## Snapshot Creation

`createSnapshot` captures the current nodes and connections as a `WorkflowSnapshot`:

```typescript
const snapshot = versionManager.createSnapshot(workflow);
```

```typescript
interface WorkflowSnapshot {
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  version: number;
  capturedAt: string;
}
```

The snapshot contains deep copies of all nodes and connections — safe to store without worrying about later mutations to the workflow.

## Code Examples

### View History with Tags

```typescript
import { VersionManager } from '@compilerai/automation-studio';

const vm = new VersionManager(() => crypto.randomUUID(), () => new Date().toISOString());

const history = vm.getHistory(workflow);
for (const entry of history) {
  console.log(
    `v${entry.version} — ${entry.changelog} — ` +
    `${entry.nodeCount} nodes — tags: [${entry.tags.join(', ')}]`
  );
}
```

### Diff Two Versions

```typescript
const d = vm.diff(workflow, 1, 3);
console.log(`Summary: ${d.summary}`);
console.log('Added nodes:', d.addedNodes.map((n) => n.label));
console.log('Removed nodes:', d.removedNodes.map((n) => n.label));
console.log('Modified:', d.modifiedNodes.map((n) => `${n.id}: ${n.changes.join('; ')}`));
console.log('Added edges:', d.addedConnections.length);
console.log('Removed edges:', d.removedConnections.length);
```

### Tag and Restore

```typescript
// Tag the current version as 'stable'
workflow = vm.tagVersion(workflow, workflow.currentVersion, 'stable', 'user-1');

// ... later, after some destructive edits ...

// Restore to the 'stable' version
const stable = vm.findByTag(workflow, 'stable');
if (stable) {
  workflow = vm.restore(workflow, stable.version, 'user-1');
  console.log(`Restored to v${stable.version}, now at v${workflow.currentVersion}`);
}
```

### Create and Store a Snapshot

```typescript
const snapshot = vm.createSnapshot(workflow);
// snapshot.nodes and snapshot.connections are deep copies
// safe to persist to a database or file
```

### Find by Tag

```typescript
const entry = vm.findByTag(workflow, 'v2.0');
if (!entry) {
  console.log('No version tagged v2.0');
} else {
  console.log(`v2.0 is version ${entry.version}`);
}
```

## Integration

The `VersionManager` is exposed through the `StudioApi` facade:

```typescript
import { StudioApi } from '@compilerai/automation-studio';

const api = new StudioApi({
  idGenerator: () => crypto.randomUUID(),
  clock: () => new Date().toISOString(),
});

const history = api.versionManager.getHistory(workflow);
const diff = api.versionManager.diff(workflow, 1, 2);
workflow = api.versionManager.tagVersion(workflow, 2, 'release', 'user-1');
workflow = api.versionManager.restore(workflow, 1, 'user-1');
```

Version snapshots are created automatically by the `DeploymentManager` during publish. See `docs/deployment.md` for the publish workflow, and `docs/examples.md` for a tagging-and-restore example.
