import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';
import { TelemetryEngine } from '../src/telemetry/TelemetryEngine.js';
import type { TelemetryEvent, TelemetryEventType } from '../src/models.js';

describe('TelemetryEngine', () => {
  let engine: TelemetryEngine;

  beforeEach(() => {
    engine = new TelemetryEngine();
  });

  test('emits and retrieves events', () => {
    engine.emit({
      type: 'entity.created', timestamp: new Date().toISOString(),
      organizationId: 'org-1', metadata: { entityId: 'e1' },
    });
    assert.equal(engine.getEvents().length, 1);
  });

  test('filters events by type', () => {
    engine.emit({ type: 'entity.created', timestamp: '', metadata: {} });
    engine.emit({ type: 'entity.updated', timestamp: '', metadata: {} });
    engine.emit({ type: 'relationship.created', timestamp: '', metadata: {} });
    assert.equal(engine.getEventsByType('entity.created').length, 1);
    assert.equal(engine.getEventsByType('entity.updated').length, 1);
    assert.equal(engine.getEventsByType('relationship.created').length, 1);
  });

  test('clear removes all events', () => {
    engine.emit({ type: 'entity.created', timestamp: '', metadata: {} });
    engine.clear();
    assert.equal(engine.getEvents().length, 0);
  });

  test('all 8 telemetry event types are supported', () => {
    const types: TelemetryEventType[] = [
      'entity.created', 'entity.updated',
      'relationship.created', 'relationship.deleted',
      'graph.query.executed', 'graph.reasoning.executed',
      'memory.updated', 'memory.retrieved',
    ];
    for (const type of types) {
      engine.emit({ type, timestamp: new Date().toISOString(), metadata: {} });
    }
    assert.equal(engine.getEvents().length, 8);
    for (const type of types) {
      assert.equal(engine.getEventsByType(type).length, 1);
    }
  });

  test('events preserve metadata', () => {
    const event: TelemetryEvent = {
      type: 'graph.query.executed', timestamp: new Date().toISOString(),
      organizationId: 'org-1', metadata: { query: { type: 'company' }, resultCount: 5 },
    };
    engine.emit(event);
    const events = engine.getEventsByType('graph.query.executed');
    assert.deepEqual(events[0].metadata, { query: { type: 'company' }, resultCount: 5 });
  });
});
