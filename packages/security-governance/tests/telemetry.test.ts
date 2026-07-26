import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { TelemetryEngine } from '../src/telemetry/TelemetryEngine.js';

describe('TelemetryEngine', () => {
  test('emits and retrieves events', () => {
    const engine = new TelemetryEngine();
    engine.emit({ type: 'authentication.success', timestamp: '', metadata: {} });
    assert.equal(engine.getEvents().length, 1);
  });

  test('filters by type', () => {
    const engine = new TelemetryEngine();
    engine.emit({ type: 'authentication.success', timestamp: '', metadata: {} });
    engine.emit({ type: 'authorization.denied', timestamp: '', metadata: {} });
    assert.equal(engine.getEventsByType('authentication.success').length, 1);
    assert.equal(engine.getEventsByType('authorization.denied').length, 1);
  });

  test('all 8 telemetry event types supported', () => {
    const engine = new TelemetryEngine();
    const types = [
      'authentication.success', 'authentication.failed',
      'authorization.denied', 'authorization.granted',
      'policy.evaluated', 'secret.accessed',
      'encryption.completed', 'audit.written',
    ] as const;
    for (const type of types) {
      engine.emit({ type, timestamp: '', metadata: {} });
    }
    assert.equal(engine.getEvents().length, 8);
    for (const type of types) {
      assert.equal(engine.getEventsByType(type).length, 1);
    }
  });

  test('clear removes all events', () => {
    const engine = new TelemetryEngine();
    engine.emit({ type: 'audit.written', timestamp: '', metadata: {} });
    engine.clear();
    assert.equal(engine.getEvents().length, 0);
  });
});
