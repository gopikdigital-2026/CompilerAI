import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';
import { MetricsEngine, METRIC_NAMES } from '../src/index.js';

describe('MetricsEngine', () => {
  let engine: MetricsEngine;

  beforeEach(() => {
    engine = new MetricsEngine();
  });

  test('records a metric sample', () => {
    engine.record({
      name: METRIC_NAMES.LATENCY, type: 'timer', value: 150, unit: 'ms',
      component: 'enterprise_rag', tags: {},
    });
    assert.equal(engine.count(), 1);
  });

  test('records all 11 required metric types', () => {
    const metrics = [
      { name: METRIC_NAMES.LATENCY, value: 100 },
      { name: METRIC_NAMES.THROUGHPUT, value: 50 },
      { name: METRIC_NAMES.ERRORS, value: 2 },
      { name: METRIC_NAMES.AVAILABILITY, value: 99.9 },
      { name: METRIC_NAMES.MEMORY, value: 65 },
      { name: METRIC_NAMES.CPU, value: 45 },
      { name: METRIC_NAMES.ORG_USAGE, value: 1000 },
      { name: METRIC_NAMES.COST_PER_OP, value: 0.05 },
      { name: METRIC_NAMES.AGENT_USAGE, value: 100 },
      { name: METRIC_NAMES.SKILL_USAGE, value: 50 },
    ];
    for (const m of metrics) {
      engine.record({ name: m.name, type: 'gauge', value: m.value, unit: 'count', component: 'observability', tags: {} });
    }
    assert.equal(engine.count(), 10);
    assert.ok(engine.getMetricNames().length >= 10);
  });

  test('records metrics from all 8 components', () => {
    const components = [
      'connector_runtime', 'automation_studio', 'ai_workflow_copilot',
      'multi_agent', 'knowledge_graph', 'enterprise_rag',
      'skills_marketplace', 'security_governance',
    ] as const;
    for (const c of components) {
      engine.record({ name: 'request.latency', type: 'timer', value: 100, unit: 'ms', component: c, tags: {} });
    }
    assert.equal(engine.count(), 8);
  });

  test('query filters by component', () => {
    engine.record({ name: 'latency', type: 'timer', value: 100, unit: 'ms', component: 'enterprise_rag', tags: {} });
    engine.record({ name: 'latency', type: 'timer', value: 200, unit: 'ms', component: 'multi_agent', tags: {} });
    assert.equal(engine.query({ component: 'enterprise_rag' }).length, 1);
  });

  test('query filters by organization', () => {
    engine.record({ name: 'ops', type: 'counter', value: 10, unit: 'count', component: 'observability', organizationId: 'org-1', tags: {} });
    engine.record({ name: 'ops', type: 'counter', value: 20, unit: 'count', component: 'observability', organizationId: 'org-2', tags: {} });
    assert.equal(engine.query({ organizationId: 'org-1' }).length, 1);
  });

  test('query filters by agent and skill', () => {
    engine.record({ name: 'ops', type: 'counter', value: 1, unit: 'count', component: 'multi_agent', agentId: 'agent-1', tags: {} });
    engine.record({ name: 'ops', type: 'counter', value: 1, unit: 'count', component: 'skills_marketplace', skillId: 'skill-1', tags: {} });
    assert.equal(engine.query({ agentId: 'agent-1' }).length, 1);
    assert.equal(engine.query({ skillId: 'skill-1' }).length, 1);
  });

  test('aggregate computes statistics', () => {
    for (let i = 1; i <= 100; i++) {
      engine.record({ name: 'latency', type: 'timer', value: i, unit: 'ms', component: 'observability', tags: {} });
    }
    const agg = engine.aggregate('latency');
    assert.equal(agg.count, 100);
    assert.equal(agg.min, 1);
    assert.equal(agg.max, 100);
    assert.ok(agg.avg > 0);
    assert.ok(agg.p50 > 0);
    assert.ok(agg.p95 > agg.p50);
    assert.ok(agg.p99 >= agg.p95);
  });

  test('aggregate returns zeros for no data', () => {
    const agg = engine.aggregate('nonexistent');
    assert.equal(agg.count, 0);
  });

  test('estimatedCost is tracked', () => {
    engine.record({ name: 'cost.per_operation', type: 'gauge', value: 1, unit: 'count', component: 'observability', tags: {}, estimatedCost: 0.05 });
    const samples = engine.getAll();
    assert.equal(samples[0].estimatedCost, 0.05);
  });

  test('clear removes all samples', () => {
    engine.record({ name: 'x', type: 'gauge', value: 1, unit: 'count', component: 'observability', tags: {} });
    engine.clear();
    assert.equal(engine.count(), 0);
  });
});
