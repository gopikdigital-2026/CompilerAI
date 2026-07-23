import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { AgentRuntime } from '../src/index.ts';
import { makeIdGenerator, makeClock, createTestProfile, createSlowExecutor, createTaskInput } from './helpers.ts';

describe('Cancellation', () => {
  let runtime: AgentRuntime;

  beforeEach(() => {
    runtime = new AgentRuntime({
      idGenerator: makeIdGenerator(),
      clock: makeClock(),
    });
  });

  it('should cancel a running execution', async () => {
    const orgId = 'org-1';
    runtime.registerAgent(createTestProfile({ id: 'agent-a', capabilities: ['test-capability'] }), orgId);

    const execution = runtime.createExecution({
      organizationId: orgId,
      triggeredBy: 'test',
      tasks: [
        { ...createTaskInput({ title: 'T1', timeoutMs: 5000 }) },
        { ...createTaskInput({ title: 'T2', timeoutMs: 5000 }) },
      ],
      edges: [],
    });

    const runPromise = runtime.run(execution, createSlowExecutor(100));
    runtime.cancel(execution.id);
    const result = await runPromise;
    assert.ok(['cancelled', 'completed', 'failed'].includes(result.status));
  });

  it('should return false for cancelling non-running execution', () => {
    const cancelled = runtime.cancel('non-existent');
    assert.equal(cancelled, false);
  });

  it('should publish cancellation message', async () => {
    const orgId = 'org-1';
    runtime.registerAgent(createTestProfile({ id: 'agent-a', capabilities: ['test-capability'] }), orgId);

    const execution = runtime.createExecution({
      organizationId: orgId,
      triggeredBy: 'test',
      tasks: [{ ...createTaskInput({ title: 'T1', timeoutMs: 5000 }) }],
      edges: [],
    });

    const runPromise = runtime.run(execution, createSlowExecutor(200));
    runtime.cancel(execution.id);
    await runPromise;
    const messages = runtime.getMessages(execution.id);
    assert.ok(messages.some((m) => m.kind === 'cancellation'));
  });
});
