import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  InMemoryStudioTelemetry,
  type StudioEvent,
  type StudioEventType,
} from '../src/telemetry/StudioTelemetry.js';
import { fixedClock } from './sprint28-helpers.js';

function makeEvent(
  type: StudioEventType,
  overrides: Partial<StudioEvent> = {},
): StudioEvent {
  return {
    type,
    timestamp: fixedClock()(),
    organizationId: 'test-org',
    workflowId: 'wf-1',
    userId: 'user-1',
    metadata: {},
    ...overrides,
  };
}

describe('InMemoryStudioTelemetry', () => {
  let telemetry: InMemoryStudioTelemetry;

  beforeEach(() => {
    telemetry = new InMemoryStudioTelemetry();
  });

  // --- Basic emit / getEvents ---

  it('emit stores event', () => {
    telemetry.emit(makeEvent('workflow.created'));
    const events = telemetry.getEvents();
    assert.equal(events.length, 1);
  });

  it('getEvents returns all events', () => {
    telemetry.emit(makeEvent('workflow.created'));
    telemetry.emit(makeEvent('workflow.published'));
    telemetry.emit(makeEvent('node.added'));
    const events = telemetry.getEvents();
    assert.equal(events.length, 3);
  });

  it('getEventsByType filters by type', () => {
    telemetry.emit(makeEvent('workflow.created'));
    telemetry.emit(makeEvent('workflow.published'));
    telemetry.emit(makeEvent('workflow.created'));
    const created = telemetry.getEventsByType('workflow.created');
    assert.equal(created.length, 2);
    assert.ok(created.every((e) => e.type === 'workflow.created'));
  });

  it('getEventsByWorkflow filters by workflow', () => {
    telemetry.emit(makeEvent('workflow.created', { workflowId: 'wf-a' }));
    telemetry.emit(makeEvent('workflow.created', { workflowId: 'wf-b' }));
    telemetry.emit(makeEvent('workflow.created', { workflowId: 'wf-a' }));
    const events = telemetry.getEventsByWorkflow('wf-a');
    assert.equal(events.length, 2);
    assert.ok(events.every((e) => e.workflowId === 'wf-a'));
  });

  it('clear empties events', () => {
    telemetry.emit(makeEvent('workflow.created'));
    telemetry.emit(makeEvent('workflow.published'));
    telemetry.clear();
    assert.equal(telemetry.getEvents().length, 0);
  });

  // --- Event structure ---

  it('Event has timestamp', () => {
    telemetry.emit(makeEvent('workflow.created'));
    const event = telemetry.getEvents()[0]!;
    assert.ok(typeof event.timestamp === 'string');
    assert.ok(event.timestamp.length > 0);
  });

  it('Event has type', () => {
    telemetry.emit(makeEvent('workflow.created'));
    const event = telemetry.getEvents()[0]!;
    assert.equal(event.type, 'workflow.created');
  });

  it('Event has metadata', () => {
    telemetry.emit(makeEvent('workflow.created', { metadata: { nodeCount: 5 } }));
    const event = telemetry.getEvents()[0]!;
    assert.ok(typeof event.metadata === 'object');
    assert.equal(event.metadata['nodeCount'], 5);
  });

  it('Event has organizationId', () => {
    telemetry.emit(makeEvent('workflow.created', { organizationId: 'org-123' }));
    const event = telemetry.getEvents()[0]!;
    assert.equal(event.organizationId, 'org-123');
  });

  it('Event has userId', () => {
    telemetry.emit(makeEvent('workflow.created', { userId: 'user-xyz' }));
    const event = telemetry.getEvents()[0]!;
    assert.equal(event.userId, 'user-xyz');
  });

  it('Event has workflowId', () => {
    telemetry.emit(makeEvent('workflow.created', { workflowId: 'wf-abc' }));
    const event = telemetry.getEvents()[0]!;
    assert.equal(event.workflowId, 'wf-abc');
  });

  // --- Ordering / accumulation ---

  it('Multiple emits accumulate', () => {
    for (let i = 0; i < 10; i++) {
      telemetry.emit(makeEvent('node.added'));
    }
    assert.equal(telemetry.getEvents().length, 10);
  });

  it('Events ordered by insertion', () => {
    telemetry.emit(makeEvent('workflow.created', { metadata: { seq: 1 } }));
    telemetry.emit(makeEvent('workflow.published', { metadata: { seq: 2 } }));
    telemetry.emit(makeEvent('workflow.archived', { metadata: { seq: 3 } }));
    const events = telemetry.getEvents();
    assert.equal(events[0]!.metadata['seq'], 1);
    assert.equal(events[1]!.metadata['seq'], 2);
    assert.equal(events[2]!.metadata['seq'], 3);
  });

  it('getEvents returns a copy (not the internal array)', () => {
    telemetry.emit(makeEvent('workflow.created'));
    const events1 = telemetry.getEvents();
    const events2 = telemetry.getEvents();
    assert.ok(events1 !== events2);
  });

  // --- Event types ---

  it('workflow.created event', () => {
    telemetry.emit(makeEvent('workflow.created'));
    assert.equal(telemetry.getEventsByType('workflow.created').length, 1);
  });

  it('workflow.published event', () => {
    telemetry.emit(makeEvent('workflow.published'));
    assert.equal(telemetry.getEventsByType('workflow.published').length, 1);
  });

  it('simulation.started event', () => {
    telemetry.emit(makeEvent('simulation.started'));
    assert.equal(telemetry.getEventsByType('simulation.started').length, 1);
  });

  it('simulation.completed event', () => {
    telemetry.emit(makeEvent('simulation.completed'));
    assert.equal(telemetry.getEventsByType('simulation.completed').length, 1);
  });

  it('canvas.zoom_changed event', () => {
    telemetry.emit(makeEvent('canvas.zoom_changed'));
    assert.equal(telemetry.getEventsByType('canvas.zoom_changed').length, 1);
  });

  it('copilot.workflow_imported event', () => {
    telemetry.emit(makeEvent('copilot.workflow_imported'));
    assert.equal(telemetry.getEventsByType('copilot.workflow_imported').length, 1);
  });

  it('deployment.published event', () => {
    telemetry.emit(makeEvent('deployment.published'));
    assert.equal(telemetry.getEventsByType('deployment.published').length, 1);
  });

  it('node.updated event', () => {
    telemetry.emit(makeEvent('node.updated'));
    assert.equal(telemetry.getEventsByType('node.updated').length, 1);
  });

  // --- Privacy / PII ---

  it('No PII in metadata (no instruction text)', () => {
    telemetry.emit(
      makeEvent('workflow.created', { metadata: { nodeCount: 5, stepCount: 3 } }),
    );
    const event = telemetry.getEvents()[0]!;
    const metadataStr = JSON.stringify(event.metadata);
    // Metadata should not contain free-form instruction text.
    assert.ok(!metadataStr.includes('instruction'));
    assert.ok(!metadataStr.includes('password'));
    assert.ok(!metadataStr.includes('secret'));
  });

  it('metadata can hold numeric counts without PII', () => {
    telemetry.emit(
      makeEvent('copilot.workflow_imported', { metadata: { stepCount: 5, nodeCount: 5 } }),
    );
    const event = telemetry.getEvents()[0]!;
    assert.equal(event.metadata['stepCount'], 5);
    assert.equal(event.metadata['nodeCount'], 5);
  });

  // --- Edge cases ---

  it('getEventsByType returns empty for type with no events', () => {
    telemetry.emit(makeEvent('workflow.created'));
    assert.equal(telemetry.getEventsByType('simulation.failed').length, 0);
  });

  it('getEventsByWorkflow returns empty for unknown workflow', () => {
    telemetry.emit(makeEvent('workflow.created', { workflowId: 'wf-1' }));
    assert.equal(telemetry.getEventsByWorkflow('wf-unknown').length, 0);
  });
});
