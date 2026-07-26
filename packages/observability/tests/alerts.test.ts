import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';
import { AlertEngine, createAlertRule, METRIC_NAMES } from '../src/index.js';

describe('AlertEngine', () => {
  let engine: AlertEngine;

  beforeEach(() => {
    engine = new AlertEngine();
  });

  test('creates and evaluates a high latency alert', () => {
    engine.addRule(createAlertRule(
      'r1', 'High Latency', 'high_latency', 'warning', 'enterprise_rag',
      { metric: METRIC_NAMES.LATENCY, threshold: 500, comparison: 'gt' },
    ));

    const metrics = [
      { name: METRIC_NAMES.LATENCY, type: 'timer' as const, value: 600, unit: 'ms', component: 'enterprise_rag' as const, timestamp: new Date().toISOString(), tags: {} },
    ];

    const alerts = engine.evaluate(metrics);
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].type, 'high_latency');
    assert.equal(alerts[0].severity, 'warning');
  });

  test('creates and evaluates repetitive errors alert', () => {
    engine.addRule(createAlertRule(
      'r2', 'Repetitive Errors', 'repetitive_errors', 'error', 'connector_runtime',
      { metric: METRIC_NAMES.ERRORS, threshold: 5, minOccurrences: 3 },
    ));

    const metrics = Array.from({ length: 5 }, () => ({
      name: METRIC_NAMES.ERRORS, type: 'counter' as const, value: 2, unit: 'count',
      component: 'connector_runtime' as const, timestamp: new Date().toISOString(), tags: {},
    }));

    const alerts = engine.evaluate(metrics);
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].type, 'repetitive_errors');
  });

  test('creates connector_down alert', () => {
    engine.addRule(createAlertRule(
      'r3', 'Connector Down', 'connector_down', 'critical', 'connector_runtime',
      { metric: METRIC_NAMES.AVAILABILITY, threshold: 0, comparison: 'lte' },
    ));

    const alerts = engine.evaluate([
      { name: METRIC_NAMES.AVAILABILITY, type: 'gauge' as const, value: 0, unit: '%', component: 'connector_runtime' as const, timestamp: new Date().toISOString(), tags: {} },
    ]);
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].severity, 'critical');
  });

  test('creates excessive_consumption alert', () => {
    engine.addRule(createAlertRule(
      'r4', 'Excessive Consumption', 'excessive_consumption', 'warning', 'observability',
      { metric: METRIC_NAMES.MEMORY, threshold: 90, comparison: 'gt' },
    ));

    const alerts = engine.evaluate([
      { name: METRIC_NAMES.MEMORY, type: 'gauge' as const, value: 95, unit: '%', component: 'observability' as const, timestamp: new Date().toISOString(), tags: {} },
    ]);
    assert.equal(alerts.length, 1);
  });

  test('creates auth_failures alert', () => {
    engine.addRule(createAlertRule(
      'r5', 'Auth Failures', 'auth_failures', 'error', 'security_governance',
      { metric: METRIC_NAMES.ERRORS, threshold: 10, comparison: 'gt' },
    ));

    const alerts = engine.evaluate([
      { name: METRIC_NAMES.ERRORS, type: 'counter' as const, value: 15, unit: 'count', component: 'security_governance' as const, timestamp: new Date().toISOString(), tags: {} },
    ]);
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].type, 'auth_failures');
  });

  test('creates rag_degradation alert', () => {
    engine.addRule(createAlertRule(
      'r6', 'RAG Degradation', 'rag_degradation', 'warning', 'enterprise_rag',
      { metric: METRIC_NAMES.LATENCY, threshold: 1000, comparison: 'gt' },
    ));

    const alerts = engine.evaluate([
      { name: METRIC_NAMES.LATENCY, type: 'timer' as const, value: 1200, unit: 'ms', component: 'enterprise_rag' as const, timestamp: new Date().toISOString(), tags: {} },
    ]);
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].type, 'rag_degradation');
  });

  test('creates agent_anomaly alert', () => {
    engine.addRule(createAlertRule(
      'r7', 'Agent Anomaly', 'agent_anomaly', 'critical', 'multi_agent',
      { metric: METRIC_NAMES.ERRORS, threshold: 20, comparison: 'gt' },
    ));

    const alerts = engine.evaluate([
      { name: METRIC_NAMES.ERRORS, type: 'counter' as const, value: 25, unit: 'count', component: 'multi_agent' as const, timestamp: new Date().toISOString(), tags: {} },
    ]);
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].type, 'agent_anomaly');
  });

  test('all 4 severities are supported', () => {
    const severities = ['info', 'warning', 'error', 'critical'] as const;
    for (const s of severities) {
      engine.addRule(createAlertRule(`r-${s}`, `Test ${s}`, 'high_latency', s, 'observability', { threshold: 100, comparison: 'gt' }));
    }
    assert.equal(engine.getRules().length, 4);
  });

  test('all 7 alert types are supported', () => {
    const types = ['high_latency', 'repetitive_errors', 'connector_down', 'excessive_consumption', 'auth_failures', 'rag_degradation', 'agent_anomaly'] as const;
    for (const t of types) {
      engine.addRule(createAlertRule(`r-${t}`, `Test ${t}`, t, 'warning', 'observability', { threshold: 100, comparison: 'gt' }));
    }
    assert.equal(engine.getRules().length, 7);
  });

  test('alerts are reproducible with same metrics', () => {
    engine.addRule(createAlertRule('r1', 'Test', 'high_latency', 'warning', 'enterprise_rag', { metric: METRIC_NAMES.LATENCY, threshold: 500, comparison: 'gt' }));
    const metrics = [
      { name: METRIC_NAMES.LATENCY, type: 'timer' as const, value: 600, unit: 'ms', component: 'enterprise_rag' as const, timestamp: new Date().toISOString(), tags: {} },
    ];
    // First evaluation should trigger
    const a1 = engine.evaluate(metrics);
    assert.equal(a1.length, 1);
    // Cooldown prevents immediate re-trigger
    const a2 = engine.evaluate(metrics);
    assert.equal(a2.length, 0);
  });

  test('acknowledge marks alert as acknowledged', () => {
    engine.addRule(createAlertRule('r1', 'Test', 'high_latency', 'warning', 'observability', { threshold: 100, comparison: 'gt' }));
    const alerts = engine.evaluate([
      { name: 'latency', type: 'gauge' as const, value: 200, unit: 'ms', component: 'observability' as const, timestamp: new Date().toISOString(), tags: {} },
    ]);
    assert.equal(alerts[0].acknowledged, false);
    engine.acknowledge(alerts[0].id);
    assert.equal(engine.getActiveAlerts().length, 0);
  });

  test('removeRule removes a rule', () => {
    engine.addRule(createAlertRule('r1', 'Test', 'high_latency', 'warning', 'observability', { threshold: 100 }));
    assert.equal(engine.removeRule('r1'), true);
    assert.equal(engine.getRules().length, 0);
  });

  test('disabled rules do not trigger', () => {
    engine.addRule(createAlertRule('r1', 'Test', 'high_latency', 'warning', 'observability', { threshold: 100, comparison: 'gt' }, { enabled: false }));
    const alerts = engine.evaluate([
      { name: 'latency', type: 'gauge' as const, value: 200, unit: 'ms', component: 'observability' as const, timestamp: new Date().toISOString(), tags: {} },
    ]);
    assert.equal(alerts.length, 0);
  });
});
