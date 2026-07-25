import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { VersionManager } from '../src/versioning/VersionManager.js';
import {
  makeNode,
  makeConnection,
  buildWorkflow,
  buildWorkflowWithVersions,
  makeIdGenerator,
  fixedClock,
} from './sprint28-helpers.js';
import type { Workflow } from '../src/models/WorkflowDefinition.js';
import type { WorkflowNode, WorkflowConnection } from '../src/models/WorkflowModels.js';

describe('VersionManager', () => {
  let vm: VersionManager;

  beforeEach(() => {
    vm = new VersionManager(makeIdGenerator(), fixedClock());
  });

  // Helper: create a workflow with two versions.
  function createVersionedWorkflow(): Workflow {
    const v1Nodes: WorkflowNode[] = [
      makeNode({ id: 'n1', type: 'trigger', label: 'Start', config: { eventType: 'manual' } }),
      makeNode({ id: 'n2', type: 'tool', label: 'Tool', config: { toolId: 't1' } }),
    ];
    const v1Conns: WorkflowConnection[] = [
      makeConnection({ id: 'c1', fromNodeId: 'n1', toNodeId: 'n2' }),
    ];

    const v2Nodes: WorkflowNode[] = [
      makeNode({ id: 'n1', type: 'trigger', label: 'Start', config: { eventType: 'manual' } }),
      makeNode({ id: 'n2', type: 'tool', label: 'Tool', config: { toolId: 't1' } }),
      makeNode({ id: 'n3', type: 'end', label: 'End', config: {} }),
    ];
    const v2Conns: WorkflowConnection[] = [
      makeConnection({ id: 'c1', fromNodeId: 'n1', toNodeId: 'n2' }),
      makeConnection({ id: 'c2', fromNodeId: 'n2', toNodeId: 'n3' }),
    ];

    return buildWorkflowWithVersions([
      { version: 1, nodes: v1Nodes, connections: v1Conns, status: 'published' },
      { version: 2, nodes: v2Nodes, connections: v2Conns, status: 'draft' },
    ]);
  }

  // --- getHistory ---

  it('getHistory returns entries for each version', () => {
    const wf = createVersionedWorkflow();
    const history = vm.getHistory(wf);
    assert.ok(history.length >= 2);
    assert.equal(history[0]!.version, 1);
    assert.equal(history[1]!.version, 2);
  });

  it('getHistory entries have correct fields', () => {
    const wf = createVersionedWorkflow();
    const history = vm.getHistory(wf);
    for (const entry of history) {
      assert.ok(typeof entry.version === 'number');
      assert.ok(typeof entry.status === 'string');
      assert.ok(typeof entry.nodeCount === 'number');
      assert.ok(typeof entry.connectionCount === 'number');
      assert.ok(typeof entry.changelog === 'string');
      assert.ok(Array.isArray(entry.tags));
    }
  });

  it('getHistory empty for workflow with no versions', () => {
    const wf = buildWorkflow(
      [makeNode({ id: 'n1', type: 'trigger', label: 'T', config: { eventType: 'manual' } })],
      [],
    );
    const history = vm.getHistory(wf);
    // Should include at least the current working version as an implicit entry.
    assert.equal(history.length, 1);
    assert.equal(history[0]!.version, wf.currentVersion);
  });

  it('getHistory entries sorted by version ascending', () => {
    const wf = createVersionedWorkflow();
    const history = vm.getHistory(wf);
    for (let i = 1; i < history.length; i++) {
      assert.ok(history[i]!.version >= history[i - 1]!.version);
    }
  });

  it('getHistory includes nodeCount and connectionCount', () => {
    const wf = createVersionedWorkflow();
    const history = vm.getHistory(wf);
    const v1 = history.find((h) => h.version === 1);
    assert.equal(v1!.nodeCount, 2);
    assert.equal(v1!.connectionCount, 1);
    const v2 = history.find((h) => h.version === 2);
    assert.equal(v2!.nodeCount, 3);
    assert.equal(v2!.connectionCount, 2);
  });

  // --- diff ---

  it('diff returns added nodes', () => {
    const wf = createVersionedWorkflow();
    const d = vm.diff(wf, 1, 2);
    assert.ok(d.addedNodes.length > 0);
    assert.ok(d.addedNodes.some((n) => n.id === 'n3'));
  });

  it('diff returns removed nodes', () => {
    const wf = createVersionedWorkflow();
    const d = vm.diff(wf, 2, 1);
    assert.ok(d.removedNodes.length > 0);
    assert.ok(d.removedNodes.some((n) => n.id === 'n3'));
  });

  it('diff returns added connections', () => {
    const wf = createVersionedWorkflow();
    const d = vm.diff(wf, 1, 2);
    assert.ok(d.addedConnections.length > 0);
    assert.ok(d.addedConnections.some((c) => c.from === 'n2' && c.to === 'n3'));
  });

  it('diff returns removed connections', () => {
    const wf = createVersionedWorkflow();
    const d = vm.diff(wf, 2, 1);
    assert.ok(d.removedConnections.length > 0);
  });

  it('diff returns modified nodes', () => {
    // Create a versioned workflow where a node's config changes between versions.
    const v1Nodes = [
      makeNode({ id: 'n1', type: 'trigger', label: 'Start', config: { eventType: 'manual' } }),
    ];
    const v2Nodes = [
      makeNode({ id: 'n1', type: 'trigger', label: 'Start Renamed', config: { eventType: 'webhook' } }),
    ];
    const wf = buildWorkflowWithVersions([
      { version: 1, nodes: v1Nodes, connections: [] },
      { version: 2, nodes: v2Nodes, connections: [] },
    ]);
    const d = vm.diff(wf, 1, 2);
    assert.ok(d.modifiedNodes.length > 0);
    assert.ok(d.modifiedNodes.some((m) => m.id === 'n1'));
  });

  it('diff summary is non-empty', () => {
    const wf = createVersionedWorkflow();
    const d = vm.diff(wf, 1, 2);
    assert.ok(d.summary.length > 0);
  });

  it('diff same version returns empty diff', () => {
    const wf = createVersionedWorkflow();
    const d = vm.diff(wf, 1, 1);
    assert.equal(d.addedNodes.length, 0);
    assert.equal(d.removedNodes.length, 0);
    assert.equal(d.addedConnections.length, 0);
    assert.equal(d.removedConnections.length, 0);
  });

  it('diff includes fromVersion and toVersion', () => {
    const wf = createVersionedWorkflow();
    const d = vm.diff(wf, 1, 2);
    assert.equal(d.fromVersion, 1);
    assert.equal(d.toVersion, 2);
  });

  // --- tagVersion / untagVersion ---

  it('tagVersion adds tag to version', () => {
    const wf = createVersionedWorkflow();
    vm.tagVersion(wf, 1, 'v1.0', 'user1');
    const tags = vm.getTags(wf);
    assert.ok(tags.some((t) => t.tag === 'v1.0' && t.version === 1));
  });

  it('tagVersion appears in history', () => {
    const wf = createVersionedWorkflow();
    vm.tagVersion(wf, 1, 'release', 'user1');
    const history = vm.getHistory(wf);
    const v1 = history.find((h) => h.version === 1);
    assert.ok(v1!.tags.includes('release'));
  });

  it('tagVersion adds tag to workflow.tags', () => {
    const wf = createVersionedWorkflow();
    const updated = vm.tagVersion(wf, 1, 'stable', 'user1');
    assert.ok(updated.tags.includes('stable'));
  });

  it('tagVersion does not duplicate tag', () => {
    const wf = createVersionedWorkflow();
    vm.tagVersion(wf, 1, 'v1', 'user1');
    vm.tagVersion(wf, 1, 'v1', 'user1');
    const tags = vm.getTags(wf);
    const v1Tags = tags.filter((t) => t.tag === 'v1');
    assert.equal(v1Tags.length, 1);
  });

  it('untagVersion removes tag', () => {
    const wf = createVersionedWorkflow();
    vm.tagVersion(wf, 1, 'temp', 'user1');
    vm.untagVersion(wf, 1, 'temp');
    const tags = vm.getTags(wf);
    assert.ok(!tags.some((t) => t.tag === 'temp'));
  });

  it('untagVersion non-existent tag (no error)', () => {
    const wf = createVersionedWorkflow();
    assert.doesNotThrow(() => vm.untagVersion(wf, 1, 'nonexistent'));
  });

  it('untagVersion removes from workflow.tags', () => {
    const wf = createVersionedWorkflow();
    const tagged = vm.tagVersion(wf, 1, 'remove-me', 'user1');
    const untagged = vm.untagVersion(tagged, 1, 'remove-me');
    assert.ok(!untagged.tags.includes('remove-me'));
  });

  // --- getTags ---

  it('getTags returns all tags', () => {
    const wf = createVersionedWorkflow();
    vm.tagVersion(wf, 1, 'tag-a', 'user1');
    vm.tagVersion(wf, 2, 'tag-b', 'user1');
    const tags = vm.getTags(wf);
    assert.equal(tags.length, 2);
  });

  it('getTags empty for no tags', () => {
    const wf = createVersionedWorkflow();
    const tags = vm.getTags(wf);
    assert.equal(tags.length, 0);
  });

  it('getTags entries have taggedAt and taggedBy', () => {
    const wf = createVersionedWorkflow();
    vm.tagVersion(wf, 1, 'release', 'user1');
    const tags = vm.getTags(wf);
    assert.ok(tags[0]!.taggedAt);
    assert.equal(tags[0]!.taggedBy, 'user1');
  });

  // --- findByTag ---

  it('findByTag returns version entry', () => {
    const wf = createVersionedWorkflow();
    vm.tagVersion(wf, 1, 'stable', 'user1');
    const entry = vm.findByTag(wf, 'stable');
    assert.ok(entry);
    assert.equal(entry!.version, 1);
  });

  it('findByTag returns null for unknown tag', () => {
    const wf = createVersionedWorkflow();
    const entry = vm.findByTag(wf, 'nonexistent');
    assert.equal(entry, null);
  });

  // --- restore ---

  it('restore creates new version from old snapshot', () => {
    const wf = createVersionedWorkflow();
    const currentVersion = wf.currentVersion;
    const restored = vm.restore(wf, 1, 'user1');
    assert.ok(restored.currentVersion > currentVersion);
    assert.equal(restored.currentVersion, currentVersion + 1);
  });

  it('restore restores nodes from target version', () => {
    const wf = createVersionedWorkflow();
    const restored = vm.restore(wf, 1, 'user1');
    // v1 had 2 nodes.
    assert.equal(restored.nodes.length, 2);
  });

  it('restore restores connections from target version', () => {
    const wf = createVersionedWorkflow();
    const restored = vm.restore(wf, 1, 'user1');
    // v1 had 1 connection.
    assert.equal(restored.connections.length, 1);
  });

  it('restore updates currentVersion', () => {
    const wf = createVersionedWorkflow();
    const restored = vm.restore(wf, 1, 'user1');
    assert.ok(restored.currentVersion > wf.currentVersion);
  });

  it('restore sets status to draft', () => {
    const wf = createVersionedWorkflow();
    const restored = vm.restore(wf, 1, 'user1');
    assert.equal(restored.status, 'draft');
  });

  it('restore adds new version to versions array', () => {
    const wf = createVersionedWorkflow();
    const originalVersionCount = wf.versions.length;
    const restored = vm.restore(wf, 1, 'user1');
    assert.equal(restored.versions.length, originalVersionCount + 1);
  });

  it('restore sets changelog mentioning target version', () => {
    const wf = createVersionedWorkflow();
    const restored = vm.restore(wf, 1, 'user1');
    const lastVersion = restored.versions[restored.versions.length - 1]!;
    assert.ok(lastVersion.changelog.includes('1'));
  });

  it('restore sets lastModifiedBy', () => {
    const wf = createVersionedWorkflow();
    const restored = vm.restore(wf, 1, 'user1');
    assert.equal(restored.lastModifiedBy, 'user1');
  });

  it('restore for non-existent version returns workflow unchanged', () => {
    const wf = createVersionedWorkflow();
    const restored = vm.restore(wf, 999, 'user1');
    assert.equal(restored.currentVersion, wf.currentVersion);
  });

  // --- createSnapshot ---

  it('createSnapshot captures current nodes', () => {
    const wf = createVersionedWorkflow();
    const snapshot = vm.createSnapshot(wf);
    assert.equal(snapshot.nodes.length, wf.nodes.length);
  });

  it('createSnapshot captures current connections', () => {
    const wf = createVersionedWorkflow();
    const snapshot = vm.createSnapshot(wf);
    assert.equal(snapshot.connections.length, wf.connections.length);
  });

  it('createSnapshot captures current version', () => {
    const wf = createVersionedWorkflow();
    const snapshot = vm.createSnapshot(wf);
    assert.equal(snapshot.version, wf.currentVersion);
  });

  it('createSnapshot has capturedAt timestamp', () => {
    const wf = createVersionedWorkflow();
    const snapshot = vm.createSnapshot(wf);
    assert.ok(snapshot.capturedAt);
    assert.ok(snapshot.capturedAt.length > 0);
  });

  it('createSnapshot does not share node references (deep copy)', () => {
    const wf = createVersionedWorkflow();
    const snapshot = vm.createSnapshot(wf);
    // Mutating snapshot nodes should not affect original.
    const originalLabel = wf.nodes[0]!.label;
    snapshot.nodes[0]!.label = 'CHANGED';
    assert.equal(wf.nodes[0]!.label, originalLabel);
  });
});
