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
    engine.emit({ type: 'ingestion.completed', timestamp: new Date().toISOString(), metadata: { count: 5 } });
    assert.equal(engine.getEvents().length, 1);
  });

  test('filters events by type', () => {
    engine.emit({ type: 'ingestion.completed', timestamp: '', metadata: {} });
    engine.emit({ type: 'retrieval.executed', timestamp: '', metadata: {} });
    engine.emit({ type: 'cache.hit', timestamp: '', metadata: {} });
    assert.equal(engine.getEventsByType('ingestion.completed').length, 1);
    assert.equal(engine.getEventsByType('retrieval.executed').length, 1);
  });

  test('clear removes all events', () => {
    engine.emit({ type: 'ingestion.completed', timestamp: '', metadata: {} });
    engine.clear();
    assert.equal(engine.getEvents().length, 0);
  });

  test('all 7 telemetry event types are supported', () => {
    const types: TelemetryEventType[] = [
      'ingestion.completed',
      'indexing.completed',
      'retrieval.executed',
      'ranking.completed',
      'cache.hit',
      'cache.miss',
      'grounding.completed',
    ];
    for (const type of types) {
      engine.emit({ type, timestamp: new Date().toISOString(), metadata: {} });
    }
    assert.equal(engine.getEvents().length, 7);
    for (const type of types) {
      assert.equal(engine.getEventsByType(type).length, 1);
    }
  });

  test('events preserve metadata', () => {
    const event: TelemetryEvent = {
      type: 'retrieval.executed', timestamp: new Date().toISOString(),
      organizationId: 'org-1', metadata: { mode: 'hybrid', resultCount: 5 },
    };
    engine.emit(event);
    const events = engine.getEventsByType('retrieval.executed');
    assert.equal(events[0].metadata.mode, 'hybrid');
    assert.equal(events[0].metadata.resultCount, 5);
    assert.equal(events[0].organizationId, 'org-1');
  });
});
