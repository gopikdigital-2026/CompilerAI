import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';
import { MemoryEngine } from '../src/memory/MemoryEngine.js';

describe('MemoryEngine', () => {
  let memory: MemoryEngine;

  beforeEach(() => {
    memory = new MemoryEngine();
  });

  test('stores and retrieves a memory record', () => {
    memory.store({
      type: 'short_term', agentId: 'agent-1', key: 'context-1',
      content: { data: 'test' }, context: { task: 'task-1' },
      importance: 0.8, organizationId: 'org-1',
    });
    const record = memory.retrieve('context-1', 'agent-1');
    assert.ok(record);
    assert.deepEqual(record!.content, { data: 'test' });
  });

  test('retrieve returns undefined for non-existent key', () => {
    assert.equal(memory.retrieve('nonexistent', 'agent-1'), undefined);
  });

  test('retrieve increments access count', () => {
    memory.store({
      type: 'long_term', agentId: 'agent-1', key: 'mem-1',
      content: 'data', context: {}, importance: 0.5, organizationId: 'org-1',
    });
    memory.retrieve('mem-1', 'agent-1');
    memory.retrieve('mem-1', 'agent-1');
    const record = memory.retrieve('mem-1', 'agent-1');
    assert.equal(record!.accessCount, 3);
  });

  test('retrieveContextual returns memories matching context', () => {
    memory.store({
      type: 'short_term', agentId: 'agent-1', key: 'mem-1',
      content: 'data1', context: { taskId: 't1', project: 'p1' },
      importance: 0.8, organizationId: 'org-1',
    });
    memory.store({
      type: 'short_term', agentId: 'agent-1', key: 'mem-2',
      content: 'data2', context: { taskId: 't2', project: 'p1' },
      importance: 0.5, organizationId: 'org-1',
    });
    const results = memory.retrieveContextual('agent-1', { taskId: 't1' });
    assert.ok(results.length > 0);
    assert.equal(results[0].key, 'mem-1');
  });

  test('retrieveContextual includes shared context memories', () => {
    memory.store({
      type: 'shared_context', agentId: 'agent-1', key: 'shared-1',
      content: 'shared data', context: { project: 'p1' },
      importance: 0.9, organizationId: 'org-1',
    });
    const results = memory.retrieveContextual('agent-2', { project: 'p1' });
    assert.ok(results.some((r) => r.key === 'shared-1'));
  });

  test('recordDecision stores and retrieves decision history', () => {
    memory.recordDecision({
      agentId: 'agent-1', taskId: 'task-1', decision: 'Process payment',
      reasoning: 'Invoice validated', alternatives: ['Hold for review'],
      confidence: 0.92, outcome: 'success', relatedEntityIds: ['ent-1', 'ent-2'],
      organizationId: 'org-1',
    });
    const history = memory.getDecisionHistory('agent-1');
    assert.equal(history.length, 1);
    assert.equal(history[0].decision, 'Process payment');
    assert.equal(history[0].outcome, 'success');
  });

  test('getDecisionHistory filters by agent', () => {
    memory.recordDecision({
      agentId: 'agent-1', taskId: 't1', decision: 'A', reasoning: 'r',
      alternatives: [], confidence: 0.9, outcome: 'success', relatedEntityIds: [],
      organizationId: 'org-1',
    });
    memory.recordDecision({
      agentId: 'agent-2', taskId: 't2', decision: 'B', reasoning: 'r',
      alternatives: [], confidence: 0.9, outcome: 'pending', relatedEntityIds: [],
      organizationId: 'org-1',
    });
    assert.equal(memory.getDecisionHistory('agent-1').length, 1);
    assert.equal(memory.getDecisionHistory('agent-2').length, 1);
  });

  test('summarize generates a summary for an agent', () => {
    memory.store({
      type: 'long_term', agentId: 'agent-1', key: 'mem-1',
      content: ['ent-1', 'ent-2'], context: {},
      importance: 0.8, organizationId: 'org-1',
    });
    memory.recordDecision({
      agentId: 'agent-1', taskId: 't1', decision: 'A', reasoning: 'r',
      alternatives: [], confidence: 0.9, outcome: 'success',
      relatedEntityIds: ['ent-3'], organizationId: 'org-1',
    });
    const summary = memory.summarize('agent-1');
    assert.ok(summary.summary.length > 0);
    assert.ok(summary.entityIds.length >= 3);
    assert.ok(summary.summary.includes('agent-1'));
  });

  test('forget removes a memory record', () => {
    memory.store({
      type: 'short_term', agentId: 'agent-1', key: 'mem-1',
      content: 'data', context: {}, importance: 0.5, organizationId: 'org-1',
    });
    assert.equal(memory.forget('mem-1', 'agent-1'), true);
    assert.equal(memory.retrieve('mem-1', 'agent-1'), undefined);
  });

  test('clear removes memories for an organization', () => {
    memory.store({
      type: 'short_term', agentId: 'agent-1', key: 'mem-1',
      content: 'data', context: {}, importance: 0.5, organizationId: 'org-1',
    });
    memory.store({
      type: 'short_term', agentId: 'agent-1', key: 'mem-2',
      content: 'data', context: {}, importance: 0.5, organizationId: 'org-2',
    });
    memory.clear('org-1');
    assert.equal(memory.retrieve('mem-1', 'agent-1'), undefined);
    assert.ok(memory.retrieve('mem-2', 'agent-1'));
  });

  test('short-term memory can have expiration', () => {
    memory.store({
      type: 'short_term', agentId: 'agent-1', key: 'temp-1',
      content: 'temp', context: {}, importance: 0.3,
      organizationId: 'org-1', expiresAt: new Date(Date.now() - 1000).toISOString(),
    } as never);
    const record = memory.retrieve('temp-1', 'agent-1');
    assert.ok(record);
    assert.ok(record!.expiresAt);
  });

  test('shared context is accessible across agents', () => {
    memory.store({
      type: 'shared_context', agentId: 'agent-1', key: 'shared-ctx',
      content: { project: 'Alpha' }, context: { project: 'Alpha' },
      importance: 0.9, organizationId: 'org-1',
    });
    const results = memory.retrieveContextual('agent-2', { project: 'Alpha' });
    assert.ok(results.some((r) => r.key === 'shared-ctx'));
  });

  test('getMemoryCount returns total count', () => {
    memory.store({
      type: 'short_term', agentId: 'agent-1', key: 'mem-1',
      content: 'data', context: {}, importance: 0.5, organizationId: 'org-1',
    });
    assert.equal(memory.getMemoryCount(), 1);
  });

  test('getDecisionCount returns total decision count', () => {
    memory.recordDecision({
      agentId: 'a', taskId: 't', decision: 'd', reasoning: 'r',
      alternatives: [], confidence: 0.9, outcome: 'success',
      relatedEntityIds: [], organizationId: 'org-1',
    });
    assert.equal(memory.getDecisionCount(), 1);
  });
});
