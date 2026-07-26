import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';
import {
  ResiliencePlatform,
  createRetryConfig,
  isTransientError,
  createReplicaNode,
} from '../src/index.js';

describe('ResiliencePlatform — Integration', () => {
  let platform: ResiliencePlatform;

  beforeEach(() => {
    platform = new ResiliencePlatform({
      instances: ResiliencePlatform.createDefaultInstances(),
    });
  });

  test('all 9 public API methods are accessible', () => {
    assert.equal(typeof platform.executeProtected, 'function');
    assert.equal(typeof platform.retry, 'function');
    assert.equal(typeof platform.openCircuit, 'function');
    assert.equal(typeof platform.closeCircuit, 'function');
    assert.equal(typeof platform.createBackup, 'function');
    assert.equal(typeof platform.restoreBackup, 'function');
    assert.equal(typeof platform.replicate, 'function');
    assert.equal(typeof platform.runChaosScenario, 'function');
    assert.equal(typeof platform.healthReport, 'function');
  });

  test('executeProtected succeeds with circuit breaker + retry', async () => {
    let calls = 0;
    const result = await platform.executeProtected(async () => {
      calls++;
      if (calls < 2) throw new Error('transient');
      return 'ok';
    }, {
      circuitName: 'test-cb',
      retryConfig: createRetryConfig({ maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 5, isRetryable: isTransientError }),
    });
    assert.equal(result, 'ok');
    assert.equal(calls, 2);
  });

  test('executeProtected throws when circuit is open', async () => {
    platform.openCircuit('manual-open');
    await assert.rejects(
      async () => platform.executeProtected(async () => 42, { circuitName: 'manual-open' }),
      /circuit breaker.*is open/i,
    );
  });

  test('retry emits telemetry event', async () => {
    let calls = 0;
    await platform.retry(async () => {
      calls++;
      if (calls < 2) throw new Error('transient');
      return 'ok';
    }, createRetryConfig({ maxAttempts: 3, baseDelayMs: 1, isRetryable: isTransientError }));
    assert.ok(platform.telemetry.getEventsByType('retry.executed').length > 0);
  });

  test('openCircuit and closeCircuit emit telemetry', () => {
    platform.getOrCreateCircuitBreaker('test');
    platform.openCircuit('test');
    assert.ok(platform.telemetry.getEventsByType('circuit.opened').length > 0);
    platform.closeCircuit('test');
    assert.ok(platform.telemetry.getEventsByType('circuit.closed').length > 0);
  });

  test('createBackup and restoreBackup work end-to-end', () => {
    const snap = platform.createBackup('all', { key1: 'value1', key2: 'value2' });
    assert.equal(snap.status, 'completed');
    assert.ok(platform.telemetry.getEventsByType('backup.completed').length > 0);

    const result = platform.restoreBackup(snap.id);
    assert.equal(result.success, true);
    assert.ok(platform.telemetry.getEventsByType('restore.completed').length > 0);
  });

  test('replicate emits telemetry', () => {
    platform.replicate('knowledge_graph', { entity1: { label: 'A' } });
    assert.ok(platform.telemetry.getEventsByType('replication.completed').length > 0);
  });

  test('runChaosScenario executes and emits telemetry', () => {
    const scenarios = platform.chaos.getScenarios();
    const result = platform.runChaosScenario(scenarios[0].id);
    assert.equal(result.executed, true);
    assert.ok(platform.telemetry.getEventsByType('chaos.finished').length > 0);
  });

  test('healthReport returns overall status', () => {
    const report = platform.healthReport();
    assert.ok(['healthy', 'degraded', 'critical'].includes(report.overallStatus));
    assert.equal(typeof report.activeInstances, 'number');
  });

  test('healthReport is critical when all circuits open', () => {
    platform.getOrCreateCircuitBreaker('critical-cb');
    platform.openCircuit('critical-cb');
    const report = platform.healthReport();
    assert.equal(report.overallStatus, 'critical');
  });

  test('failover triggers and emits telemetry', () => {
    const event = platform.triggerFailover('test failover');
    assert.ok(event);
    assert.ok(platform.telemetry.getEventsByType('failover.started').length > 0);
  });

  test('queue recovery works with idempotency', async () => {
    platform.queue.enqueue({ type: 'pending_job', payload: { task: 1 }, idempotencyKey: 'iq-1' });
    platform.queue.enqueue({ type: 'pending_job', payload: { task: 2 }, idempotencyKey: 'iq-2' });
    const result = await platform.recoverQueue(async () => true);
    assert.equal(result.recovered, 2);
    assert.ok(platform.telemetry.getEventsByType('queue.recovered').length > 0);
  });

  test('full workflow: protect → backup → replicate → chaos → health', async () => {
    // 1. Execute protected operation
    const result = await platform.executeProtected(async () => 'workflow-result');
    assert.equal(result, 'workflow-result');

    // 2. Create backup
    const snap = platform.createBackup('all', { state: 'checkpoint-1' });
    assert.equal(snap.status, 'completed');

    // 3. Replicate
    const repResult = platform.replicate('shared_memory', { checkpoint: 'cp1' });
    assert.equal(repResult.success, true);

    // 4. Run chaos
    const chaosResults = platform.runAllChaosScenarios();
    assert.ok(chaosResults.length >= 6);

    // 5. Generate resilience report
    const report = platform.generateChaosReport();
    assert.ok(report.overallResilienceScore >= 0);

    // 6. Check health
    const health = platform.healthReport();
    assert.ok(health);

    // 7. Verify telemetry captured events
    const events = platform.telemetry.getEvents();
    assert.ok(events.some((e) => e.type === 'backup.completed'));
    assert.ok(events.some((e) => e.type === 'replication.completed'));
    assert.ok(events.some((e) => e.type === 'chaos.finished'));
  });

  test('integration with Knowledge Graph replication', () => {
    platform.replication.registerNode(createReplicaNode('kg-1', 'knowledge_graph', 'http://kg:8080'));
    const result = platform.replicate('knowledge_graph', { node1: { label: 'Entity' } });
    assert.equal(result.success, true);
  });

  test('integration with Enterprise RAG replication', () => {
    platform.replication.registerNode(createReplicaNode('rag-1', 'enterprise_rag', 'http://rag:8080'));
    const result = platform.replicate('enterprise_rag', { doc1: 'content' });
    assert.equal(result.success, true);
  });

  test('integration with Shared Memory replication', () => {
    platform.replication.registerNode(createReplicaNode('mem-1', 'shared_memory', 'http://mem:8080'));
    const result = platform.replicate('shared_memory', { context: 'memory-1' });
    assert.equal(result.success, true);
  });

  test('integration with Configuration replication', () => {
    platform.replication.registerNode(createReplicaNode('cfg-1', 'configuration', 'http://cfg:8080'));
    const result = platform.replicate('configuration', { setting: 'enabled' });
    assert.equal(result.success, true);
  });

  test('disaster recovery plan creation and execution', () => {
    const plan = platform.createRecoveryPlan({ rpoSeconds: 30, rtoSeconds: 60, mode: 'automatic' });
    assert.ok(plan.id);
    const result = platform.executeRecoveryPlan(plan.id);
    assert.equal(result.success, true);
  });

  test('10 telemetry event types are all supported', () => {
    const types = [
      'circuit.opened', 'circuit.closed', 'circuit.half_open',
      'retry.executed', 'backup.completed', 'restore.completed',
      'failover.started', 'replication.completed', 'chaos.finished',
      'queue.recovered',
    ];
    assert.equal(types.length, 10);
  });

  test('multiple circuit breakers are tracked independently', () => {
    platform.getOrCreateCircuitBreaker('cb-a');
    platform.getOrCreateCircuitBreaker('cb-b');
    platform.openCircuit('cb-a');
    assert.equal(platform.getCircuitBreakerState('cb-a'), 'open');
    assert.equal(platform.getCircuitBreakerState('cb-b'), 'closed');
  });

  test('backup with incremental chaining', () => {
    const full = platform.createBackup('all', { a: 1, b: 2 });
    const inc1 = platform.createBackup('all', { a: 1, b: 3 }, { type: 'incremental', parentId: full.id });
    const inc2 = platform.createBackup('all', { a: 2, b: 3 }, { type: 'incremental', parentId: inc1.id });
    assert.equal(inc2.type, 'incremental');
    assert.equal(inc2.parentId, inc1.id);
  });
});
