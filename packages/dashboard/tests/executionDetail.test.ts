import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MockApiAdapter } from '../src/api/MockApiAdapter.ts';

describe('Execution Detail — stages and trace timeline', () => {
  it('should load execution detail with stages', async () => {
    const adapter = new MockApiAdapter();
    const detail = await adapter.getExecutionDetail('exec_test_001');
    assert.ok(detail.executionId, 'should have executionId');
    assert.ok(detail.stages.length > 0, 'should have stages');
    assert.ok(detail.startedAt, 'should have startedAt');
  });

  it('should have stages with statuses', async () => {
    const adapter = new MockApiAdapter();
    const detail = await adapter.getExecutionDetail('exec_test_002');
    const validStatuses = ['completed', 'running', 'failed', 'skipped', 'pending'];
    detail.stages.forEach((stage) => {
      assert.ok(validStatuses.includes(stage.status), `stage ${stage.stage} should have valid status`);
      assert.ok(stage.durationMs >= 0, 'stage should have non-negative duration');
    });
  });

  it('should load trace events for an execution', async () => {
    const adapter = new MockApiAdapter();
    const events = await adapter.getTraceEvents('exec_test_001');
    assert.ok(events.length > 0, 'should return trace events');
  });

  it('should have trace events with categories', async () => {
    const adapter = new MockApiAdapter();
    const events = await adapter.getTraceEvents('exec_test_001');
    const validCategories = ['event', 'retry', 'error', 'checkpoint', 'approval'];
    events.forEach((event) => {
      assert.ok(validCategories.includes(event.category), `event should have valid category: ${event.category}`);
      assert.ok(event.eventId, 'event should have eventId');
      assert.ok(event.timestamp, 'event should have timestamp');
    });
  });

  it('should have trace events sorted (newest first)', async () => {
    const adapter = new MockApiAdapter();
    const events = await adapter.getTraceEvents('exec_test_001');
    for (let i = 1; i < events.length; i++) {
      const prev = new Date(events[i - 1]!.timestamp).getTime();
      const curr = new Date(events[i]!.timestamp).getTime();
      assert.ok(prev >= curr, 'events should be sorted newest first');
    }
  });
});
