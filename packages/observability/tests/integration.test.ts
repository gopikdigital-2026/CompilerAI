import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';
import { ObservabilityPlatform, METRIC_NAMES, createAlertRule, createAvailabilityCheck, createMemoryCheck } from '../src/index.js';

describe('ObservabilityPlatform — Integration', () => {
  let platform: ObservabilityPlatform;

  beforeEach(() => {
    platform = new ObservabilityPlatform();
  });

  test('all 8 public API methods are accessible', () => {
    assert.equal(typeof platform.recordMetric, 'function');
    assert.equal(typeof platform.startTrace, 'function');
    assert.equal(typeof platform.finishTrace, 'function');
    assert.equal(typeof platform.writeLog, 'function');
    assert.equal(typeof platform.healthStatus, 'function');
    assert.equal(typeof platform.createAlert, 'function');
    assert.equal(typeof platform.detectAnomalies, 'function');
    assert.equal(typeof platform.exportMetrics, 'function');
  });

  test('recordMetric stores and emits telemetry', () => {
    platform.recordMetric({
      name: METRIC_NAMES.LATENCY, type: 'timer', value: 200, unit: 'ms',
      component: 'enterprise_rag', tags: {},
    });
    assert.equal(platform.metrics.count(), 1);
    assert.ok(platform.telemetry.getEventsByType('metric.recorded').length > 0);
  });

  test('startTrace and finishTrace work end-to-end', () => {
    const span = platform.startTrace('rag-query', 'enterprise_rag');
    assert.equal(span.status, 'started');
    assert.ok(platform.telemetry.getEventsByType('trace.started').length > 0);

    const finished = platform.finishTrace(span);
    assert.equal(finished.status, 'completed');
    assert.ok(finished.durationMs !== undefined);
    assert.ok(platform.telemetry.getEventsByType('trace.finished').length > 0);
  });

  test('writeLog stores and emits telemetry', () => {
    platform.writeLog({
      level: 'info', component: 'multi_agent', message: 'Agent started',
      context: {},
    });
    assert.equal(platform.logger.count(), 1);
    assert.ok(platform.telemetry.getEventsByType('log.written').length > 0);
  });

  test('healthStatus returns healthy when no checks registered', () => {
    assert.equal(platform.healthStatus(), 'healthy');
  });

  test('healthStatus returns overall status from checks', async () => {
    platform.registerHealthCheck('mem', 'observability', createMemoryCheck(() => 50));
    await platform.runAllHealthChecks();
    assert.equal(platform.healthStatus(), 'healthy');
  });

  test('createAlert and evaluateAlerts work together', () => {
    platform.createAlert(createAlertRule(
      'r1', 'High Latency', 'high_latency', 'warning', 'enterprise_rag',
      { metric: METRIC_NAMES.LATENCY, threshold: 500, comparison: 'gt' },
    ));
    platform.recordMetric({
      name: METRIC_NAMES.LATENCY, type: 'timer', value: 600, unit: 'ms',
      component: 'enterprise_rag', tags: {},
    });
    const alerts = platform.evaluateAlerts();
    assert.ok(alerts.length > 0);
    assert.ok(platform.telemetry.getEventsByType('alert.triggered').length > 0);
  });

  test('detectAnomalies detects anomalies from recorded metrics', () => {
    // Record normal metrics
    for (let i = 0; i < 20; i++) {
      platform.recordMetric({
        name: METRIC_NAMES.LATENCY, type: 'timer', value: 100, unit: 'ms',
        component: 'enterprise_rag', tags: {},
      });
    }
    // Record spike
    platform.recordMetric({
      name: METRIC_NAMES.LATENCY, type: 'timer', value: 5000, unit: 'ms',
      component: 'enterprise_rag', tags: {},
    });
    const anomalies = platform.detectAnomalies();
    assert.ok(anomalies.length > 0);
    assert.ok(platform.telemetry.getEventsByType('anomaly.detected').length > 0);
  });

  test('exportMetrics exports to JSON by default', () => {
    platform.recordMetric({
      name: METRIC_NAMES.LATENCY, type: 'timer', value: 100, unit: 'ms',
      component: 'observability', tags: {},
    });
    const result = platform.exportMetrics();
    assert.equal(result.format, 'json');
    assert.equal(result.success, true);
    assert.ok(result.recordCount > 0);
    assert.ok(platform.telemetry.getEventsByType('export.completed').length > 0);
  });

  test('exportMetrics supports all 3 formats', () => {
    platform.recordMetric({
      name: METRIC_NAMES.LATENCY, type: 'timer', value: 100, unit: 'ms',
      component: 'observability', tags: {},
    });
    for (const format of ['json', 'prometheus', 'opentelemetry'] as const) {
      const result = platform.exportMetrics(format);
      assert.equal(result.success, true);
    }
  });

  test('sensitive data is redacted in logs', () => {
    platform.writeLog({
      level: 'info', component: 'security_governance', message: 'auth attempt',
      context: { password: 'secret123', username: 'alice' },
    });
    const logs = platform.queryLogs({});
    assert.equal(logs[0].context.password, '[REDACTED]');
    assert.equal(logs[0].context.username, 'alice');
  });

  test('full workflow: metrics → trace → log → alert → anomaly → export', () => {
    // 1. Record metrics from all 8 components
    const components = [
      'connector_runtime', 'automation_studio', 'ai_workflow_copilot',
      'multi_agent', 'knowledge_graph', 'enterprise_rag',
      'skills_marketplace', 'security_governance',
    ] as const;
    for (const c of components) {
      platform.recordMetric({
        name: METRIC_NAMES.LATENCY, type: 'timer', value: 100, unit: 'ms',
        component: c, organizationId: 'org-1', tags: {},
      });
    }

    // 2. Start and finish a trace
    const span = platform.startTrace('cross-component-op', 'multi_agent', {
      targetComponent: 'enterprise_rag',
      organizationId: 'org-1',
    });
    platform.addTraceEvent(span, 'checkpoint');
    platform.finishTrace(span);

    // 3. Write a log
    platform.writeLog({
      level: 'info', component: 'multi_agent', message: 'Operation completed',
      organizationId: 'org-1', traceId: span.traceId, context: { duration: '150ms' },
    });

    // 4. Create and evaluate alert
    platform.createAlert(createAlertRule(
      'r1', 'High Latency', 'high_latency', 'warning', 'enterprise_rag',
      { metric: METRIC_NAMES.LATENCY, threshold: 50, comparison: 'gt' },
    ));
    const alerts = platform.evaluateAlerts();
    assert.ok(alerts.length > 0);

    // 5. Export
    const exportResult = platform.exportMetrics('json');
    assert.equal(exportResult.success, true);

    // 6. Verify telemetry bus captured all events
    const events = platform.telemetry.getEvents();
    assert.ok(events.some((e) => e.type === 'metric.recorded'));
    assert.ok(events.some((e) => e.type === 'trace.started'));
    assert.ok(events.some((e) => e.type === 'trace.finished'));
    assert.ok(events.some((e) => e.type === 'log.written'));
    assert.ok(events.some((e) => e.type === 'alert.triggered'));
    assert.ok(events.some((e) => e.type === 'export.completed'));
  });

  test('8 telemetry event types are all emitted', async () => {
    // metric.recorded
    platform.recordMetric({ name: 'm', type: 'gauge', value: 1, unit: 'c', component: 'observability', tags: {} });
    // trace.started + trace.finished
    const span = platform.startTrace('op', 'observability');
    platform.finishTrace(span);
    // log.written
    platform.writeLog({ level: 'info', component: 'observability', message: 'test', context: {} });
    // health.checked
    platform.registerHealthCheck('c', 'observability', createAvailabilityCheck('observability', () => true));
    await platform.runHealthCheck('c');
    // alert.triggered
    platform.createAlert(createAlertRule('r1', 'Test', 'high_latency', 'warning', 'observability', { metric: 'm', threshold: 0, comparison: 'gt' }));
    platform.evaluateAlerts();
    // anomaly.detected
    for (let i = 0; i < 20; i++) {
      platform.recordMetric({ name: 'm2', type: 'gauge', value: 100, unit: 'c', component: 'observability', tags: {} });
    }
    platform.recordMetric({ name: 'm2', type: 'gauge', value: 10000, unit: 'c', component: 'observability', tags: {} });
    platform.detectAnomalies();
    // export.completed
    platform.exportMetrics('json');

    const types = new Set(platform.telemetry.getEvents().map((e) => e.type));
    assert.ok(types.has('metric.recorded'));
    assert.ok(types.has('trace.started'));
    assert.ok(types.has('trace.finished'));
    assert.ok(types.has('log.written'));
    assert.ok(types.has('alert.triggered'));
    assert.ok(types.has('anomaly.detected'));
    assert.ok(types.has('export.completed'));
  });

  test('integration with Security & Governance metrics', () => {
    platform.recordMetric({
      name: METRIC_NAMES.ERRORS, type: 'counter', value: 5, unit: 'count',
      component: 'security_governance', organizationId: 'org-1', tags: { type: 'auth' },
    });
    const secMetrics = platform.queryMetrics({ component: 'security_governance' });
    assert.equal(secMetrics.length, 1);
  });

  test('integration with Enterprise RAG metrics', () => {
    platform.recordMetric({
      name: METRIC_NAMES.LATENCY, type: 'timer', value: 150, unit: 'ms',
      component: 'enterprise_rag', organizationId: 'org-1', tags: {},
    });
    const ragMetrics = platform.queryMetrics({ component: 'enterprise_rag' });
    assert.equal(ragMetrics.length, 1);
  });

  test('integration with Multi-Agent metrics', () => {
    platform.recordMetric({
      name: METRIC_NAMES.AGENT_USAGE, type: 'counter', value: 100, unit: 'count',
      component: 'multi_agent', agentId: 'agent-1', organizationId: 'org-1', tags: {},
    });
    const agentMetrics = platform.queryMetrics({ agentId: 'agent-1' });
    assert.equal(agentMetrics.length, 1);
  });

  test('integration with Skills Marketplace metrics', () => {
    platform.recordMetric({
      name: METRIC_NAMES.SKILL_USAGE, type: 'counter', value: 50, unit: 'count',
      component: 'skills_marketplace', skillId: 'skill-1', organizationId: 'org-1', tags: {},
    });
    const skillMetrics = platform.queryMetrics({ skillId: 'skill-1' });
    assert.equal(skillMetrics.length, 1);
  });

  test('dashboards are created and listed', () => {
    platform.createDashboard('global_health', 'Global Health');
    platform.createDashboard('ai_agents', 'AI Agents');
    assert.equal(platform.listDashboards().length, 2);
  });
});
