import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { AgentRuntime, AgentCommunicationBus, sanitizeMessagePayload } from '../src/index.ts';
import { makeIdGenerator, makeClock, createTestProfile, createSuccessExecutor, createTaskInput } from './helpers.ts';

describe('Communication bus', () => {
  let commBus: AgentCommunicationBus;

  beforeEach(() => {
    commBus = new AgentCommunicationBus(makeIdGenerator(), makeClock());
  });

  it('should publish and retrieve messages', () => {
    commBus.publish({
      executionId: 'exec-1',
      kind: 'task_request',
      fromAgentId: 'coordinator',
      toAgentId: 'agent-1',
      payload: { taskId: 't1' },
    });
    const messages = commBus.getMessages('exec-1');
    assert.equal(messages.length, 1);
    assert.equal(messages[0]!.kind, 'task_request');
    assert.equal(messages[0]!.sanitized, true);
  });

  it('should support global subscriptions', () => {
    let received = false;
    const unsub = commBus.subscribe(() => { received = true; });
    commBus.publish({
      executionId: 'e1', kind: 'heartbeat', fromAgentId: 'a1', toAgentId: null, payload: {},
    });
    assert.ok(received);
    unsub();
    received = false;
    commBus.publish({
      executionId: 'e1', kind: 'heartbeat', fromAgentId: 'a1', toAgentId: null, payload: {},
    });
    assert.equal(received, false);
  });

  it('should support kind-specific subscriptions', () => {
    let errorReceived = false;
    commBus.subscribeToKind('error', () => { errorReceived = true; });
    commBus.publish({
      executionId: 'e1', kind: 'task_request', fromAgentId: 'a1', toAgentId: null, payload: {},
    });
    assert.equal(errorReceived, false);
    commBus.publish({
      executionId: 'e1', kind: 'error', fromAgentId: 'a1', toAgentId: null, payload: {},
    });
    assert.ok(errorReceived);
  });

  it('should filter messages by kind', () => {
    commBus.publish({ executionId: 'e1', kind: 'task_request', fromAgentId: 'a1', toAgentId: null, payload: {} });
    commBus.publish({ executionId: 'e1', kind: 'error', fromAgentId: 'a1', toAgentId: null, payload: {} });
    commBus.publish({ executionId: 'e1', kind: 'heartbeat', fromAgentId: 'a1', toAgentId: null, payload: {} });
    const errors = commBus.getMessagesByKind('error', 'e1');
    assert.equal(errors.length, 1);
  });

  it('should sanitize sensitive payload fields', () => {
    const sanitized = sanitizeMessagePayload({
      apiKey: 'sk-secret123',
      data: { token: 'bearer-xyz', value: 'ok' },
      safe: 'hello',
    });
    assert.equal(sanitized.apiKey, '[REDACTED]');
    assert.equal((sanitized.data as Record<string, unknown>).token, '[REDACTED]');
    assert.equal(sanitized.safe, 'hello');
  });

  it('should sanitize secret patterns in string values', () => {
    const sanitized = sanitizeMessagePayload({
      message: 'Error using key sk-abc123def456ghi789jkl',
    });
    assert.ok(!sanitized.message!.toString().includes('sk-abc123def456ghi789jkl'));
    assert.ok(sanitized.message!.toString().includes('[REDACTED]'));
  });

  it('should publish messages during execution', async () => {
    const runtime = new AgentRuntime({ idGenerator: makeIdGenerator(), clock: makeClock() });
    runtime.registerAgent(createTestProfile({ id: 'agent-a', capabilities: ['test-capability'] }), 'org-1');
    const execution = runtime.createExecution({
      organizationId: 'org-1', triggeredBy: 'test',
      tasks: [{ ...createTaskInput({ title: 'T' }) }], edges: [],
    });
    await runtime.run(execution, createSuccessExecutor());
    const messages = runtime.getMessages(execution.id);
    assert.ok(messages.length > 0);
    assert.ok(messages.some((m) => m.kind === 'task_request'));
  });
});
