/**
 * tests/telemetry.test.ts
 *
 * Unit tests for CopilotTelemetry.
 * 15+ assertions. Runs fully offline.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { CopilotTelemetry } from '../src/telemetry/CopilotTelemetry.js';
import type { CopilotEvent } from '../src/telemetry/events.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEvent(
  type: CopilotEvent['type'],
  workflowId: string,
  metadata: CopilotEvent['metadata'] = {},
): CopilotEvent {
  return {
    type,
    timestamp: new Date().toISOString(),
    workflowId,
    metadata,
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('CopilotTelemetry', () => {
  let telemetry: CopilotTelemetry;

  beforeEach(() => {
    telemetry = new CopilotTelemetry();
  });

  // ── emit() and getEvents() ────────────────────────────────────────────

  describe('emit() and getEvents()', () => {
    it('getEvents() returns empty array initially', () => {
      assert.deepEqual(telemetry.getEvents(), []);
    });

    it('emit() stores a single event', () => {
      const event = makeEvent('workflow.generated', 'wf_001');
      telemetry.emit(event);
      assert.equal(telemetry.getEvents().length, 1);
    });

    it('multiple emits accumulate events', () => {
      telemetry.emit(makeEvent('workflow.generated', 'wf_001'));
      telemetry.emit(makeEvent('workflow.validated', 'wf_001'));
      telemetry.emit(makeEvent('workflow.simulated', 'wf_001'));
      assert.equal(telemetry.getEvents().length, 3);
    });

    it('getEvents() returns a copy (array is not the internal store)', () => {
      telemetry.emit(makeEvent('workflow.generated', 'wf_001'));
      const a = telemetry.getEvents();
      const b = telemetry.getEvents();
      assert.notStrictEqual(a, b); // separate array instances
    });

    it('getEvents() returns events in emission order', () => {
      const e1 = makeEvent('workflow.generated', 'wf_001', { stepCount: 1 });
      const e2 = makeEvent('workflow.validated', 'wf_001', { stepCount: 2 });
      telemetry.emit(e1);
      telemetry.emit(e2);
      const events = telemetry.getEvents();
      assert.equal(events[0].type, 'workflow.generated');
      assert.equal(events[1].type, 'workflow.validated');
    });
  });

  // ── clear() ───────────────────────────────────────────────────────────

  describe('clear()', () => {
    it('clear() empties the events list', () => {
      telemetry.emit(makeEvent('workflow.generated', 'wf_001'));
      telemetry.emit(makeEvent('workflow.validated', 'wf_001'));
      telemetry.clear();
      assert.equal(telemetry.getEvents().length, 0);
    });

    it('new events can be added after clear()', () => {
      telemetry.emit(makeEvent('workflow.generated', 'wf_001'));
      telemetry.clear();
      telemetry.emit(makeEvent('workflow.simulated', 'wf_002'));
      assert.equal(telemetry.getEvents().length, 1);
      assert.equal(telemetry.getEvents()[0].type, 'workflow.simulated');
    });
  });

  // ── Event type coverage ───────────────────────────────────────────────

  describe('event types', () => {
    it('emits and stores workflow.generated event', () => {
      const event = makeEvent('workflow.generated', 'wf_gen');
      telemetry.emit(event);
      assert.equal(telemetry.getEvents()[0].type, 'workflow.generated');
    });

    it('emits and stores workflow.validated event', () => {
      const event = makeEvent('workflow.validated', 'wf_val');
      telemetry.emit(event);
      assert.equal(telemetry.getEvents()[0].type, 'workflow.validated');
    });

    it('emits and stores workflow.simulated event', () => {
      const event = makeEvent('workflow.simulated', 'wf_sim');
      telemetry.emit(event);
      assert.equal(telemetry.getEvents()[0].type, 'workflow.simulated');
    });

    it('emits and stores workflow.failed_validation event', () => {
      const event = makeEvent('workflow.failed_validation', 'wf_fail');
      telemetry.emit(event);
      assert.equal(telemetry.getEvents()[0].type, 'workflow.failed_validation');
    });

    it('emits and stores workflow.execution_requested event', () => {
      const event = makeEvent('workflow.execution_requested', 'wf_exec');
      telemetry.emit(event);
      assert.equal(telemetry.getEvents()[0].type, 'workflow.execution_requested');
    });
  });

  // ── Stored event data integrity ───────────────────────────────────────

  describe('stored event data', () => {
    it('stored event has correct workflowId', () => {
      telemetry.emit(makeEvent('workflow.generated', 'wf_specific_id'));
      assert.equal(telemetry.getEvents()[0].workflowId, 'wf_specific_id');
    });

    it('stored event has a timestamp string', () => {
      telemetry.emit(makeEvent('workflow.generated', 'wf_ts'));
      const ts = telemetry.getEvents()[0].timestamp;
      assert.ok(typeof ts === 'string' && ts.length > 0);
    });

    it('metadata.stepCount is stored correctly (number)', () => {
      const event = makeEvent('workflow.generated', 'wf_meta', { stepCount: 5 });
      telemetry.emit(event);
      assert.equal(telemetry.getEvents()[0].metadata.stepCount, 5);
    });

    it('metadata.connectorCount is stored correctly (number)', () => {
      const event = makeEvent('workflow.generated', 'wf_cc', { connectorCount: 3 });
      telemetry.emit(event);
      assert.equal(telemetry.getEvents()[0].metadata.connectorCount, 3);
    });

    it('metadata does not include instruction field', () => {
      // The metadata type never has instruction — verify no leakage at runtime
      const event = makeEvent('workflow.generated', 'wf_pii', {
        stepCount: 2,
        connectorCount: 1,
      });
      telemetry.emit(event);
      const stored = telemetry.getEvents()[0];
      assert.ok(!('instruction' in stored.metadata));
    });

    it('emit stores a defensive copy of metadata (mutation does not affect stored event)', () => {
      const metadata: CopilotEvent['metadata'] = { stepCount: 10 };
      telemetry.emit(makeEvent('workflow.generated', 'wf_copy', metadata));
      // Mutate the original metadata object
      metadata.stepCount = 999;
      // The stored event should still have the original value
      assert.equal(telemetry.getEvents()[0].metadata.stepCount, 10);
    });
  });
});
