import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { AgentRuntime } from '../src/index.ts';
import {
  makeIdGenerator,
  makeClock,
  createTestProfile,
  createSuccessExecutor,
  createTaskInput,
} from './helpers.ts';

describe('Checkpoint management', () => {
  let runtime: AgentRuntime;

  beforeEach(() => {
    runtime = new AgentRuntime({
      idGenerator: makeIdGenerator(),
      clock: makeClock(),
    });
  });

  it('should save checkpoints after task completion', async () => {
    const orgId = 'org-1';
    runtime.registerAgent(createTestProfile({ id: 'agent-a', capabilities: ['test-capability'] }), orgId);

    const execution = runtime.createExecution({
      organizationId: orgId,
      triggeredBy: 'test',
      tasks: [{ ...createTaskInput({ title: 'Task A' }) }],
      edges: [],
    });

    const result = await runtime.run(execution, createSuccessExecutor());
    const checkpoints = runtime.getCheckpoints(result.id);
    assert.ok(checkpoints.length > 0);
    assert.equal(checkpoints[0]!.executionId, result.id);
  });

  it('should retrieve latest checkpoint for a task', async () => {
    const orgId = 'org-1';
    runtime.registerAgent(createTestProfile({ id: 'agent-a', capabilities: ['test-capability'] }), orgId);

    const execution = runtime.createExecution({
      organizationId: orgId,
      triggeredBy: 'test',
      tasks: [{ ...createTaskInput({ title: 'Task A' }) }],
      edges: [],
    });

    await runtime.run(execution, createSuccessExecutor());
    const taskId = execution.taskGraph.tasks[0]!.id;
    const latest = runtime.checkpointManager.getLatest(execution.id, taskId);
    assert.ok(latest);
    assert.equal(latest!.taskId, taskId);
  });

  it('should get all checkpoints for an execution', async () => {
    const orgId = 'org-1';
    runtime.registerAgent(createTestProfile({ id: 'agent-a', capabilities: ['test-capability'] }), orgId);
    runtime.registerAgent(createTestProfile({ id: 'agent-b', capabilities: ['test-capability'] }), orgId);

    const execution = runtime.createExecution({
      organizationId: orgId,
      triggeredBy: 'test',
      tasks: [
        { ...createTaskInput({ title: 'Task A' }) },
        { ...createTaskInput({ title: 'Task B' }) },
      ],
      edges: [],
    });

    await runtime.run(execution, createSuccessExecutor());
    const all = runtime.getCheckpoints(execution.id);
    assert.ok(all.length >= 1);
  });

  it('should return null for non-existent checkpoint', () => {
    const latest = runtime.checkpointManager.getLatest('fake-exec', 'fake-task');
    assert.equal(latest, null);
  });
});
