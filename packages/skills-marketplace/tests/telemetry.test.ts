import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { TelemetryEngine } from '../src/telemetry/TelemetryEngine.js';

describe('TelemetryEngine', () => {
  test('emits and retrieves events', () => {
    const engine = new TelemetryEngine();
    engine.emit({ type: 'skill.installed', timestamp: '', skillId: 's1', metadata: {} });
    assert.equal(engine.getEvents().length, 1);
  });

  test('filters by type', () => {
    const engine = new TelemetryEngine();
    engine.emit({ type: 'skill.installed', timestamp: '', skillId: 's1', metadata: {} });
    engine.emit({ type: 'skill.executed', timestamp: '', skillId: 's1', metadata: {} });
    assert.equal(engine.getEventsByType('skill.installed').length, 1);
    assert.equal(engine.getEventsByType('skill.executed').length, 1);
  });

  test('all 7 telemetry event types supported', () => {
    const engine = new TelemetryEngine();
    const types = ['skill.installed', 'skill.updated', 'skill.enabled', 'skill.disabled', 'skill.executed', 'permission.denied', 'sandbox.violation'] as const;
    for (const type of types) {
      engine.emit({ type, timestamp: '', metadata: {} });
    }
    assert.equal(engine.getEvents().length, 7);
    for (const type of types) {
      assert.equal(engine.getEventsByType(type).length, 1);
    }
  });

  test('clear removes all events', () => {
    const engine = new TelemetryEngine();
    engine.emit({ type: 'skill.installed', timestamp: '', metadata: {} });
    engine.clear();
    assert.equal(engine.getEvents().length, 0);
  });
});
