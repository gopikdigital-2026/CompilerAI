import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';
import { DashboardManager, createWidget } from '../src/index.js';

describe('DashboardManager', () => {
  let mgr: DashboardManager;

  beforeEach(() => {
    mgr = new DashboardManager();
  });

  test('creates a dashboard with default widgets', () => {
    const dashboard = mgr.create('global_health', 'Global Health');
    assert.ok(dashboard.id);
    assert.equal(dashboard.name, 'Global Health');
    assert.equal(dashboard.type, 'global_health');
    assert.ok(dashboard.widgets.length > 0);
  });

  test('all 8 dashboard types are supported', () => {
    const types = ['global_health', 'ai_agents', 'connectors', 'rag', 'security', 'skills', 'costs', 'organizations'] as const;
    for (const t of types) {
      mgr.create(t, `Dashboard ${t}`);
    }
    assert.equal(mgr.count(), 8);
  });

  test('each dashboard type generates relevant widgets', () => {
    const ragDash = mgr.create('rag', 'RAG Dashboard');
    assert.ok(ragDash.widgets.some((w) => w.metricName.includes('latency')));
    assert.ok(ragDash.widgets.some((w) => w.component === 'enterprise_rag'));

    const agentDash = mgr.create('ai_agents', 'Agent Dashboard');
    assert.ok(agentDash.widgets.some((w) => w.component === 'multi_agent'));

    const secDash = mgr.create('security', 'Security Dashboard');
    assert.ok(secDash.widgets.some((w) => w.component === 'security_governance'));
  });

  test('get retrieves a dashboard by id', () => {
    const dashboard = mgr.create('global_health', 'Test');
    assert.ok(mgr.get(dashboard.id));
    assert.equal(mgr.get('nonexistent'), undefined);
  });

  test('list returns all dashboards', () => {
    mgr.create('global_health', 'A');
    mgr.create('ai_agents', 'B');
    assert.equal(mgr.list().length, 2);
  });

  test('getByType filters by type', () => {
    mgr.create('rag', 'RAG 1');
    mgr.create('rag', 'RAG 2');
    mgr.create('security', 'Sec 1');
    assert.equal(mgr.getByType('rag').length, 2);
    assert.equal(mgr.getByType('security').length, 1);
  });

  test('addWidget adds a custom widget', () => {
    const dashboard = mgr.create('global_health', 'Test');
    const initialCount = dashboard.widgets.length;
    mgr.addWidget(dashboard.id, createWidget('Custom', 'counter', 'custom.metric', 'observability'));
    assert.equal(dashboard.widgets.length, initialCount + 1);
  });

  test('removeWidget removes a widget', () => {
    const dashboard = mgr.create('global_health', 'Test');
    const widgetId = dashboard.widgets[0].id;
    assert.equal(mgr.removeWidget(dashboard.id, widgetId), true);
    assert.equal(dashboard.widgets.length, 1); // started with 2, removed 1
  });

  test('createWidget generates unique ids', () => {
    const w1 = createWidget('A', 'counter', 'm1', 'observability');
    const w2 = createWidget('B', 'counter', 'm2', 'observability');
    assert.notEqual(w1.id, w2.id);
  });

  test('dashboard widgets have refresh interval', () => {
    const dashboard = mgr.create('global_health', 'Test');
    assert.ok(dashboard.widgets.every((w) => w.refreshIntervalMs > 0));
  });

  test('dashboard widgets have valid types', () => {
    const validTypes = ['line', 'gauge', 'table', 'counter', 'bar', 'heatmap'];
    const types = ['global_health', 'ai_agents', 'connectors', 'rag', 'security', 'skills', 'costs', 'organizations'] as const;
    for (const t of types) {
      const d = mgr.create(t, `D ${t}`);
      for (const w of d.widgets) {
        assert.ok(validTypes.includes(w.type), `Widget type ${w.type} is valid`);
      }
    }
  });
});
