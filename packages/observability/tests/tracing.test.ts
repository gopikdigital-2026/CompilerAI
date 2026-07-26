import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';
import { TracingEngine } from '../src/index.js';

describe('TracingEngine', () => {
  let engine: TracingEngine;

  beforeEach(() => {
    engine = new TracingEngine();
  });

  test('starts a trace with trace ID and span ID', () => {
    const span = engine.startTrace('rag-query', 'enterprise_rag');
    assert.ok(span.traceId);
    assert.ok(span.spanId);
    assert.equal(span.status, 'started');
    assert.equal(span.operationName, 'rag-query');
    assert.equal(span.component, 'enterprise_rag');
  });

  test('finishTrace completes the span with duration', () => {
    const span = engine.startTrace('operation', 'multi_agent');
    const finished = engine.finishTrace(span);
    assert.equal(finished.status, 'completed');
    assert.ok(finished.endTime);
    assert.ok(finished.durationMs !== undefined);
    assert.ok(finished.durationMs! >= 0);
  });

  test('finishTrace supports error status', () => {
    const span = engine.startTrace('failing-op', 'connector_runtime');
    const finished = engine.finishTrace(span, 'error');
    assert.equal(finished.status, 'error');
  });

  test('parent span linking works', () => {
    const parent = engine.startTrace('parent-op', 'multi_agent');
    const child = engine.startTrace('child-op', 'enterprise_rag', {
      parentSpanId: parent.spanId,
      traceId: parent.traceId,
    });
    assert.equal(child.parentSpanId, parent.spanId);
    assert.equal(child.traceId, parent.traceId);
  });

  test('targetComponent is set', () => {
    const span = engine.startTrace('cross-component', 'multi_agent', {
      targetComponent: 'knowledge_graph',
    });
    assert.equal(span.targetComponent, 'knowledge_graph');
  });

  test('addEvent adds events to a span', () => {
    const span = engine.startTrace('op', 'observability');
    engine.addEvent(span, 'checkpoint', { phase: 'start' });
    const retrieved = engine.getSpan(span.spanId);
    assert.equal(retrieved?.events.length, 1);
    assert.equal(retrieved?.events[0].name, 'checkpoint');
  });

  test('getTrace returns all spans in a trace', () => {
    const parent = engine.startTrace('root', 'multi_agent');
    engine.startTrace('child1', 'enterprise_rag', { parentSpanId: parent.spanId, traceId: parent.traceId });
    engine.startTrace('child2', 'knowledge_graph', { parentSpanId: parent.spanId, traceId: parent.traceId });
    const trace = engine.getTrace(parent.traceId);
    assert.equal(trace.length, 3);
  });

  test('getSpans filters by component', () => {
    engine.startTrace('op1', 'multi_agent');
    engine.startTrace('op2', 'enterprise_rag');
    assert.equal(engine.getSpans({ component: 'multi_agent' }).length, 1);
  });

  test('getSpans filters by status', () => {
    const s1 = engine.startTrace('op1', 'multi_agent');
    engine.finishTrace(s1, 'completed');
    engine.startTrace('op2', 'multi_agent');
    assert.equal(engine.getSpans({ status: 'completed' }).length, 1);
    assert.equal(engine.getSpans({ status: 'started' }).length, 1);
  });

  test('organizationId is tracked', () => {
    const span = engine.startTrace('op', 'multi_agent', { organizationId: 'org-1' });
    assert.equal(span.organizationId, 'org-1');
  });

  test('tags are preserved', () => {
    const span = engine.startTrace('op', 'observability', { tags: { env: 'test', version: '1.0' } });
    assert.equal(span.tags.env, 'test');
    assert.equal(span.tags.version, '1.0');
  });
});
