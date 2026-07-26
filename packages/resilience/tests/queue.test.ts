import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';
import { QueueRecovery } from '../src/index.js';

describe('QueueRecovery', () => {
  let queue: QueueRecovery;

  beforeEach(() => {
    queue = new QueueRecovery();
  });

  test('enqueues a pending item', () => {
    const item = queue.enqueue({ type: 'pending_job', payload: { task: 'run' }, idempotencyKey: 'key-1' });
    assert.equal(item.status, 'pending');
    assert.ok(item.id);
    assert.ok(item.createdAt);
  });

  test('idempotent enqueue suppresses duplicates', () => {
    const item1 = queue.enqueue({ type: 'pending_job', payload: { task: 'a' }, idempotencyKey: 'dup-key' });
    assert.equal(item1.status, 'pending');
    const item2 = queue.enqueue({ type: 'pending_job', payload: { task: 'a' }, idempotencyKey: 'dup-key' });
    assert.equal(item2.status, 'completed');
    assert.equal(queue.getPending().length, 1); // original still pending
    assert.equal(queue.count(), 1); // only one item in queue
  });

  test('recovers pending items', async () => {
    queue.enqueue({ type: 'pending_job', payload: { n: 1 }, idempotencyKey: 'k1' });
    queue.enqueue({ type: 'pending_job', payload: { n: 2 }, idempotencyKey: 'k2' });
    queue.enqueue({ type: 'pending_job', payload: { n: 3 }, idempotencyKey: 'k3' });

    const result = await queue.recover(async () => true);
    assert.equal(result.recovered, 3);
    assert.equal(result.failed, 0);
  });

  test('recover tracks failed items', async () => {
    queue.enqueue({ type: 'pending_job', payload: {}, idempotencyKey: 'k1' });
    queue.enqueue({ type: 'pending_job', payload: {}, idempotencyKey: 'k2' });

    const result = await queue.recover(async (item) => item.idempotencyKey === 'k1');
    assert.equal(result.recovered, 1);
    assert.equal(result.failed, 1);
  });

  test('recover suppresses duplicates during processing', async () => {
    queue.enqueue({ type: 'pending_job', payload: { a: 1 }, idempotencyKey: 'k1' });
    // Process once
    await queue.recover(async () => true);
    // Enqueue same key again — suppressed at enqueue time
    const dup = queue.enqueue({ type: 'pending_job', payload: { a: 1 }, idempotencyKey: 'k1' });
    assert.equal(dup.status, 'completed');
    // Second recover has nothing pending
    const result = await queue.recover(async () => true);
    assert.equal(result.totalItems, 0);
  });

  test('all 4 queue item types are supported', () => {
    queue.enqueue({ type: 'pending_job', payload: {}, idempotencyKey: 'k1' });
    queue.enqueue({ type: 'workflow', payload: {}, idempotencyKey: 'k2' });
    queue.enqueue({ type: 'agent_task', payload: {}, idempotencyKey: 'k3' });
    queue.enqueue({ type: 'event', payload: {}, idempotencyKey: 'k4' });
    assert.equal(queue.countByType('pending_job'), 1);
    assert.equal(queue.countByType('workflow'), 1);
    assert.equal(queue.countByType('agent_task'), 1);
    assert.equal(queue.countByType('event'), 1);
  });

  test('markCompleted sets status', () => {
    const item = queue.enqueue({ type: 'pending_job', payload: {}, idempotencyKey: 'k1' });
    queue.markCompleted(item.id);
    assert.equal(item.status, 'completed');
    assert.ok(item.processedAt);
  });

  test('markFailed sets status', () => {
    const item = queue.enqueue({ type: 'pending_job', payload: {}, idempotencyKey: 'k1' });
    queue.markFailed(item.id);
    assert.equal(item.status, 'failed');
  });

  test('getPending returns only pending items', () => {
    queue.enqueue({ type: 'pending_job', payload: {}, idempotencyKey: 'k1' });
    queue.enqueue({ type: 'pending_job', payload: {}, idempotencyKey: 'k2' });
    const items = queue.getAll();
    queue.markCompleted(items[0].id);
    assert.equal(queue.getPending().length, 1);
  });

  test('recover increments attempts', async () => {
    queue.enqueue({ type: 'pending_job', payload: {}, idempotencyKey: 'k1' });
    await queue.recover(async () => false); // fails
    const items = queue.getAll();
    assert.equal(items[0].attempts, 1);
  });

  test('clear removes all items', () => {
    queue.enqueue({ type: 'pending_job', payload: {}, idempotencyKey: 'k1' });
    queue.clear();
    assert.equal(queue.count(), 0);
  });
});
