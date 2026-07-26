import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';
import { TelemetryEngine } from '../src/telemetry/TelemetryEngine.js';
import type { TelemetryEvent } from '../src/models.js';

describe('TelemetryEngine', () => {
  let engine: TelemetryEngine;

  beforeEach(() => {
    engine = new TelemetryEngine();
  });

  test('emits and retrieves events', () => {
    const event: TelemetryEvent = {
      type: 'agent.started', timestamp: new Date().toISOString(),
      agentId: 'finance', workflowId: 'wf-1', metadata: { taskId: 't1' },
    };
    engine.emit(event);
    assert.equal(engine.getEvents().length, 1);
  });

  test('filters events by type', () => {
    engine.emit({ type: 'agent.started', timestamp: '', agentId: 'a', metadata: {} });
    engine.emit({ type: 'agent.completed', timestamp: '', agentId: 'a', metadata: {} });
    engine.emit({ type: 'agent.failed', timestamp: '', agentId: 'b', metadata: {} });
    assert.equal(engine.getEventsByType('agent.started').length, 1);
    assert.equal(engine.getEventsByType('agent.completed').length, 1);
    assert.equal(engine.getEventsByType('agent.failed').length, 1);
  });

  test('filters events by agent', () => {
    engine.emit({ type: 'agent.started', timestamp: '', agentId: 'finance', metadata: {} });
    engine.emit({ type: 'agent.completed', timestamp: '', agentId: 'support', metadata: {} });
    assert.equal(engine.getEventsByAgent('finance').length, 1);
    assert.equal(engine.getEventsByAgent('support').length, 1);
    assert.equal(engine.getEventsByAgent('nonexistent').length, 0);
  });

  test('clear removes all events', () => {
    engine.emit({ type: 'agent.started', timestamp: '', agentId: 'a', metadata: {} });
    engine.clear();
    assert.equal(engine.getEvents().length, 0);
  });

  test('all 9 telemetry event types are supported', () => {
    const types = [
      'agent.started', 'agent.completed', 'agent.failed',
      'planner.generated', 'workflow.parallelized', 'workflow.completed',
      'approval.requested', 'approval.completed', 'simulation.finished',
    ] as const;
    for (const type of types) {
      engine.emit({ type, timestamp: new Date().toISOString(), metadata: {} });
    }
    assert.equal(engine.getEvents().length, 9);
    for (const type of types) {
      assert.equal(engine.getEventsByType(type).length, 1);
    }
  });

  test('events preserve metadata', () => {
    engine.emit({
      type: 'workflow.completed', timestamp: new Date().toISOString(),
      workflowId: 'wf-1', metadata: { cost: 1.50, duration: 5000 },
    });
    const events = engine.getEventsByType('workflow.completed');
    assert.equal(events[0].metadata.cost, 1.50);
    assert.equal(events[0].metadata.duration, 5000);
  });
});
