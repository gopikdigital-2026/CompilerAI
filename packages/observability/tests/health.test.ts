import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';
import {
  HealthMonitor,
  createAvailabilityCheck,
  createMemoryCheck,
  createQueueCheck,
  createConnectorCheck,
  createRagIndexCheck,
  createKnowledgeGraphCheck,
  createSkillsCheck,
  createAuthCheck,
} from '../src/index.js';

describe('HealthMonitor', () => {
  let monitor: HealthMonitor;

  beforeEach(() => {
    monitor = new HealthMonitor();
  });

  test('registers and runs a check', async () => {
    monitor.registerCheck('availability', 'connector_runtime', createAvailabilityCheck('connector_runtime', () => true));
    const result = await monitor.runCheck('availability');
    assert.equal(result.status, 'healthy');
    assert.equal(result.name, 'availability');
  });

  test('returns critical when component is down', async () => {
    monitor.registerCheck('availability', 'connector_runtime', createAvailabilityCheck('connector_runtime', () => false));
    const result = await monitor.runCheck('availability');
    assert.equal(result.status, 'critical');
  });

  test('memory check: healthy under 75%', async () => {
    monitor.registerCheck('memory', 'observability', createMemoryCheck(() => 50));
    const result = await monitor.runCheck('memory');
    assert.equal(result.status, 'healthy');
  });

  test('memory check: warning at 80%', async () => {
    monitor.registerCheck('memory', 'observability', createMemoryCheck(() => 80));
    const result = await monitor.runCheck('memory');
    assert.equal(result.status, 'warning');
  });

  test('memory check: critical at 95%', async () => {
    monitor.registerCheck('memory', 'observability', createMemoryCheck(() => 95));
    const result = await monitor.runCheck('memory');
    assert.equal(result.status, 'critical');
  });

  test('queue check: healthy under threshold', async () => {
    monitor.registerCheck('queue', 'connector_runtime', createQueueCheck(() => 100, 1000));
    const result = await monitor.runCheck('queue');
    assert.equal(result.status, 'healthy');
  });

  test('queue check: critical over threshold', async () => {
    monitor.registerCheck('queue', 'connector_runtime', createQueueCheck(() => 1200, 1000));
    const result = await monitor.runCheck('queue');
    assert.equal(result.status, 'critical');
  });

  test('connector check: critical when no active connectors', async () => {
    monitor.registerCheck('connectors', 'connector_runtime', createConnectorCheck(() => 0));
    const result = await monitor.runCheck('connectors');
    assert.equal(result.status, 'critical');
  });

  test('rag index check: critical when empty', async () => {
    monitor.registerCheck('rag-index', 'enterprise_rag', createRagIndexCheck(() => 0));
    const result = await monitor.runCheck('rag-index');
    assert.equal(result.status, 'critical');
  });

  test('rag index check: healthy with documents', async () => {
    monitor.registerCheck('rag-index', 'enterprise_rag', createRagIndexCheck(() => 100));
    const result = await monitor.runCheck('rag-index');
    assert.equal(result.status, 'healthy');
  });

  test('knowledge graph check', async () => {
    monitor.registerCheck('kg', 'knowledge_graph', createKnowledgeGraphCheck(() => 500));
    const result = await monitor.runCheck('kg');
    assert.equal(result.status, 'healthy');
  });

  test('skills check: warning when none installed', async () => {
    monitor.registerCheck('skills', 'skills_marketplace', createSkillsCheck(() => 0));
    const result = await monitor.runCheck('skills');
    assert.equal(result.status, 'warning');
  });

  test('auth check: critical below 90%', async () => {
    monitor.registerCheck('auth', 'security_governance', createAuthCheck(() => 85));
    const result = await monitor.runCheck('auth');
    assert.equal(result.status, 'critical');
  });

  test('auth check: healthy above 98%', async () => {
    monitor.registerCheck('auth', 'security_governance', createAuthCheck(() => 99));
    const result = await monitor.runCheck('auth');
    assert.equal(result.status, 'healthy');
  });

  test('runAllChecks runs all registered checks', async () => {
    monitor.registerCheck('c1', 'observability', createMemoryCheck(() => 50));
    monitor.registerCheck('c2', 'observability', createMemoryCheck(() => 80));
    const results = await monitor.runAllChecks();
    assert.equal(results.length, 2);
  });

  test('getOverallStatus returns healthy when all healthy', async () => {
    monitor.registerCheck('c1', 'observability', createMemoryCheck(() => 50));
    await monitor.runAllChecks();
    assert.equal(monitor.getOverallStatus(), 'healthy');
  });

  test('getOverallStatus returns critical when any critical', async () => {
    monitor.registerCheck('c1', 'observability', createMemoryCheck(() => 50));
    monitor.registerCheck('c2', 'observability', createMemoryCheck(() => 95));
    await monitor.runAllChecks();
    assert.equal(monitor.getOverallStatus(), 'critical');
  });

  test('getOverallStatus returns warning when any warning but no critical', async () => {
    monitor.registerCheck('c1', 'observability', createMemoryCheck(() => 50));
    monitor.registerCheck('c2', 'observability', createMemoryCheck(() => 80));
    await monitor.runAllChecks();
    assert.equal(monitor.getOverallStatus(), 'warning');
  });

  test('all 8 health check types are supported', () => {
    assert.equal(typeof createAvailabilityCheck, 'function');
    assert.equal(typeof createMemoryCheck, 'function');
    assert.equal(typeof createQueueCheck, 'function');
    assert.equal(typeof createConnectorCheck, 'function');
    assert.equal(typeof createRagIndexCheck, 'function');
    assert.equal(typeof createKnowledgeGraphCheck, 'function');
    assert.equal(typeof createSkillsCheck, 'function');
    assert.equal(typeof createAuthCheck, 'function');
  });

  test('all 3 health states are supported', async () => {
    const states = ['healthy', 'warning', 'critical'] as const;
    for (const usage of [50, 80, 95]) {
      monitor.registerCheck(`check-${usage}`, 'observability', createMemoryCheck(() => usage));
    }
    await monitor.runAllChecks();
    const checks = monitor.getChecks();
    const statuses = new Set(checks.map((c) => c.status));
    for (const s of states) {
      assert.ok(statuses.has(s), `Status ${s} should be present`);
    }
  });
});
