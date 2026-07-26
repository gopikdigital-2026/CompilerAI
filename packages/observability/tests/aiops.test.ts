import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';
import { AIOpsEngine, METRIC_NAMES } from '../src/index.js';
import type { MetricSample, ComponentName } from '../src/index.js';

function makeMetric(name: string, value: number, component: ComponentName = 'observability', options?: { agentId?: string; skillId?: string; estimatedCost?: number; organizationId?: string }, index = 0): MetricSample {
  return {
    name, type: 'gauge', value, unit: 'count', component,
    timestamp: new Date(Date.now() + index * 1000).toISOString(),
    tags: {},
    agentId: options?.agentId,
    skillId: options?.skillId,
    estimatedCost: options?.estimatedCost,
    organizationId: options?.organizationId,
  };
}

describe('AIOpsEngine', () => {
  let engine: AIOpsEngine;

  beforeEach(() => {
    engine = new AIOpsEngine();
  });

  test('detects latency spike anomaly', () => {
    const metrics: MetricSample[] = [];
    // Normal values
    for (let i = 0; i < 20; i++) {
      metrics.push(makeMetric(METRIC_NAMES.LATENCY, 100 + Math.random() * 20, 'enterprise_rag', undefined, i));
    }
    // Spike
    metrics.push(makeMetric(METRIC_NAMES.LATENCY, 5000, 'enterprise_rag', undefined, 20));

    const anomalies = engine.detectAnomalies(metrics);
    assert.ok(anomalies.length > 0);
    assert.ok(anomalies.some((a) => a.type === 'latency_spike'));
  });

  test('detects error burst anomaly', () => {
    const metrics: MetricSample[] = [];
    for (let i = 0; i < 20; i++) {
      metrics.push(makeMetric(METRIC_NAMES.ERRORS, 0, 'connector_runtime', undefined, i));
    }
    metrics.push(makeMetric(METRIC_NAMES.ERRORS, 50, 'connector_runtime', undefined, 20));

    const anomalies = engine.detectAnomalies(metrics);
    assert.ok(anomalies.some((a) => a.type === 'error_burst'));
  });

  test('detects progressive degradation', () => {
    const metrics: MetricSample[] = [];
    for (let i = 0; i < 20; i++) {
      metrics.push(makeMetric(METRIC_NAMES.LATENCY, 100 + i * 20, 'enterprise_rag', undefined, i));
    }

    const anomalies = engine.detectProgressiveDegradation(metrics);
    assert.ok(anomalies.length > 0);
    assert.ok(anomalies.some((a) => a.type === 'progressive_degradation'));
  });

  test('detects cost growth anomaly', () => {
    const metrics: MetricSample[] = [];
    for (let i = 0; i < 10; i++) {
      metrics.push(makeMetric(METRIC_NAMES.COST_PER_OP, 1, 'observability', { estimatedCost: 0.01 + i * 0.05 }, i));
    }

    const anomalies = engine.detectCostGrowth(metrics);
    assert.ok(anomalies.length > 0);
    assert.ok(anomalies.some((a) => a.type === 'cost_growth_anomaly'));
  });

  test('detects blocked agent', () => {
    const metrics: MetricSample[] = [];
    for (let i = 0; i < 15; i++) {
      metrics.push(makeMetric(METRIC_NAMES.ERRORS, 1, 'multi_agent', { agentId: 'agent-1' }, i));
    }
    const anomalies = engine.detectAnomalies(metrics);
    assert.ok(anomalies.some((a) => a.type === 'agent_blocked'));
  });

  test('detects unstable skill', () => {
    const metrics: MetricSample[] = [];
    for (let i = 0; i < 8; i++) {
      metrics.push(makeMetric(METRIC_NAMES.ERRORS, 1, 'skills_marketplace', { skillId: 'skill-1' }, i));
    }
    const anomalies = engine.detectAnomalies(metrics);
    assert.ok(anomalies.some((a) => a.type === 'skill_unstable'));
  });

  test('detectTrends returns trend direction', () => {
    const metrics: MetricSample[] = [];
    for (let i = 0; i < 10; i++) {
      metrics.push(makeMetric(METRIC_NAMES.LATENCY, 100 + i * 10, 'enterprise_rag', undefined, i));
    }
    const trends = engine.detectTrends(METRIC_NAMES.LATENCY, metrics);
    assert.equal(trends.length, 1);
    assert.equal(trends[0].direction, 'up');
    assert.ok(trends[0].slope > 0);
  });

  test('detectTrends returns flat for stable metrics', () => {
    const metrics: MetricSample[] = [];
    for (let i = 0; i < 10; i++) {
      metrics.push(makeMetric(METRIC_NAMES.LATENCY, 100, 'enterprise_rag'));
    }
    const trends = engine.detectTrends(METRIC_NAMES.LATENCY, metrics);
    assert.equal(trends[0].direction, 'flat');
  });

  test('anomalies include confidence score', () => {
    const metrics: MetricSample[] = [];
    for (let i = 0; i < 20; i++) {
      metrics.push(makeMetric(METRIC_NAMES.LATENCY, 100, 'enterprise_rag', undefined, i));
    }
    metrics.push(makeMetric(METRIC_NAMES.LATENCY, 10000, 'enterprise_rag', undefined, 20));
    const anomalies = engine.detectAnomalies(metrics);
    assert.ok(anomalies.every((a) => a.confidence >= 0 && a.confidence <= 1));
  });

  test('anomalies include recommendation for cost growth', () => {
    const metrics: MetricSample[] = [];
    for (let i = 0; i < 10; i++) {
      metrics.push(makeMetric(METRIC_NAMES.COST_PER_OP, 1, 'observability', { estimatedCost: 0.01 + i * 0.1 }, i));
    }
    const anomalies = engine.detectCostGrowth(metrics);
    assert.ok(anomalies.some((a) => a.recommendation !== undefined));
  });

  test('getAnomalies returns all detected anomalies', () => {
    const metrics: MetricSample[] = [];
    for (let i = 0; i < 20; i++) {
      metrics.push(makeMetric(METRIC_NAMES.LATENCY, 100, 'enterprise_rag', undefined, i));
    }
    metrics.push(makeMetric(METRIC_NAMES.LATENCY, 5000, 'enterprise_rag', undefined, 20));
    engine.detectAnomalies(metrics);
    assert.ok(engine.getAnomalies().length > 0);
  });

  test('clear removes all anomalies', () => {
    const metrics: MetricSample[] = [];
    for (let i = 0; i < 20; i++) {
      metrics.push(makeMetric(METRIC_NAMES.LATENCY, 100, 'enterprise_rag', undefined, i));
    }
    metrics.push(makeMetric(METRIC_NAMES.LATENCY, 5000, 'enterprise_rag', undefined, 20));
    engine.detectAnomalies(metrics);
    engine.clear();
    assert.equal(engine.count(), 0);
  });

  test('all 7 anomaly types are supported', () => {
    const types = ['latency_spike', 'error_burst', 'progressive_degradation', 'cost_growth_anomaly', 'agent_blocked', 'skill_unstable', 'throughput_drop'];
    assert.equal(types.length, 7);
  });
});
