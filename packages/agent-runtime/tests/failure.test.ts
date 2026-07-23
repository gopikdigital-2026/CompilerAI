import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { AgentRuntime } from '../src/index.ts';
import {
  makeIdGenerator,
  makeClock,
  createTestProfile,
  createFailingExecutor,
  createThrowingExecutor,
  createTaskInput,
} from './helpers.ts';

describe('Agent failure handling', () => {
  let runtime: AgentRuntime;

  beforeEach(() => {
    runtime = new AgentRuntime({
      idGenerator: makeIdGenerator(),
      clock: makeClock(),
    });
  });

  it('should mark execution as failed when a task fails', async () => {
    const orgId = 'org-1';
    runtime.registerAgent(createTestProfile({ id: 'agent-a', capabilities: ['test-capability'] }), orgId);

    const execution = runtime.createExecution({
      organizationId: orgId,
      triggeredBy: 'test',
      tasks: [
        { ...createTaskInput({ title: 'Failing Task' }) },
      ],
      edges: [],
    });

    const result = await runtime.run(execution, createFailingExecutor());
    assert.equal(result.status, 'failed');
    assert.ok(result.results.some((r) => !r.success));
  });

  it('should handle agent that throws an exception', async () => {
    const orgId = 'org-1';
    runtime.registerAgent(createTestProfile({ id: 'agent-a', capabilities: ['test-capability'] }), orgId);

    const execution = runtime.createExecution({
      organizationId: orgId,
      triggeredBy: 'test',
      tasks: [
        { ...createTaskInput({ title: 'Crashing Task' }) },
      ],
      edges: [],
    });

    const result = await runtime.run(execution, createThrowingExecutor());
    assert.equal(result.status, 'failed');
  });

  it('should record failure in health monitor', async () => {
    const orgId = 'org-1';
    const agent = runtime.registerAgent(
      createTestProfile({ id: 'agent-a', capabilities: ['test-capability'] }),
      orgId,
    );

    const execution = runtime.createExecution({
      organizationId: orgId,
      triggeredBy: 'test',
      tasks: [{ ...createTaskInput({ title: 'Task' }) }],
      edges: [],
    });

    await runtime.run(execution, createThrowingExecutor());
    const health = runtime.healthMonitor.getHealth(agent.id);
    assert.ok(health);
    assert.ok(health!.consecutiveFailures > 0);
  });
});
