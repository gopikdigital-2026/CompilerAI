import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';
import { ReplicationManager, createReplicaNode } from '../src/index.js';

describe('ReplicationManager', () => {
  let mgr: ReplicationManager;

  beforeEach(() => {
    mgr = new ReplicationManager();
  });

  test('registers a node', () => {
    mgr.registerNode(createReplicaNode('n1', 'knowledge_graph', 'http://kg:8080'));
    assert.equal(mgr.countNodes(), 1);
  });

  test('unregisters a node', () => {
    mgr.registerNode(createReplicaNode('n1', 'knowledge_graph', 'http://kg:8080'));
    assert.equal(mgr.unregisterNode('n1'), true);
    assert.equal(mgr.countNodes(), 0);
  });

  test('replicates data to target store', () => {
    mgr.registerNode(createReplicaNode('n1', 'knowledge_graph', 'http://kg:8080'));
    const result = mgr.replicate('knowledge_graph', { node1: { label: 'Entity A' }, node2: { label: 'Entity B' } });
    assert.equal(result.success, true);
    assert.equal(result.recordsSynced, 2);
    assert.equal(result.conflicts.length, 0);
  });

  test('detects conflicts on conflicting data', () => {
    mgr.registerNode(createReplicaNode('n1', 'enterprise_rag', 'http://rag:8080'));
    mgr.replicate('enterprise_rag', { doc1: 'version A' });
    const result = mgr.replicate('enterprise_rag', { doc1: 'version B' });
    assert.equal(result.success, false);
    assert.equal(result.conflicts.length, 1);
    assert.equal(result.conflicts[0].key, 'doc1');
  });

  test('resolves conflict with source_wins', () => {
    mgr.registerNode(createReplicaNode('n1', 'enterprise_rag', 'http://rag:8080'));
    mgr.replicate('enterprise_rag', { doc1: 'original' });
    const result = mgr.replicate('enterprise_rag', { doc1: 'updated' });
    const conflictId = result.conflicts[0].id;
    const resolved = mgr.resolveConflict(conflictId, 'source_wins');
    assert.equal(resolved, true);
    assert.equal(mgr.getConflicts().length, 0);
    const store = mgr.getStore('enterprise_rag');
    assert.equal(store.doc1, 'updated');
  });

  test('resolves conflict with target_wins', () => {
    mgr.registerNode(createReplicaNode('n1', 'shared_memory', 'http://mem:8080'));
    mgr.replicate('shared_memory', { key1: 'original' });
    const result = mgr.replicate('shared_memory', { key1: 'new' });
    mgr.resolveConflict(result.conflicts[0].id, 'target_wins');
    const store = mgr.getStore('shared_memory');
    assert.equal(store.key1, 'original');
  });

  test('resolves conflict with merge', () => {
    mgr.registerNode(createReplicaNode('n1', 'configuration', 'http://cfg:8080'));
    mgr.replicate('configuration', { config: { a: 1, b: 2 } });
    const result = mgr.replicate('configuration', { config: { b: 3, c: 4 } });
    mgr.resolveConflict(result.conflicts[0].id, 'merge');
    const store = mgr.getStore('configuration');
    const config = store.config as Record<string, number>;
    assert.equal(config.a, 1);
    assert.equal(config.b, 3);
    assert.equal(config.c, 4);
  });

  test('detectConflicts between source and target data', () => {
    const conflicts = mgr.detectConflicts(
      'knowledge_graph',
      { key1: 'source', key2: 'same' },
      { key1: 'target', key2: 'same' },
    );
    assert.equal(conflicts.length, 1);
    assert.equal(conflicts[0].key, 'key1');
  });

  test('getNodes filters by target', () => {
    mgr.registerNode(createReplicaNode('n1', 'knowledge_graph', 'http://kg:8080'));
    mgr.registerNode(createReplicaNode('n2', 'enterprise_rag', 'http://rag:8080'));
    assert.equal(mgr.getNodes('knowledge_graph').length, 1);
    assert.equal(mgr.getNodes('enterprise_rag').length, 1);
    assert.equal(mgr.getNodes().length, 2);
  });

  test('replicate updates node status', () => {
    const node = createReplicaNode('n1', 'shared_memory', 'http://mem:8080');
    mgr.registerNode(node);
    mgr.replicate('shared_memory', { data: 'test' });
    const updated = mgr.getNodes('shared_memory')[0];
    assert.equal(updated.status, 'synced');
    assert.ok(updated.lastSyncAt);
  });

  test('replicate to non-registered target still works', () => {
    const result = mgr.replicate('configuration', { key: 'value' });
    assert.equal(result.recordsSynced, 1);
  });

  test('all 4 replication targets are supported', () => {
    const targets = ['knowledge_graph', 'enterprise_rag', 'shared_memory', 'configuration'] as const;
    for (const t of targets) {
      mgr.registerNode(createReplicaNode(`n-${t}`, t, `http://${t}:8080`));
      mgr.replicate(t, { data: 'test' });
    }
    assert.equal(mgr.countNodes(), 4);
  });
});
