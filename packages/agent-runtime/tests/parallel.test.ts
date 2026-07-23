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

describe('Parallel execution', () => {
  let runtime: AgentRuntime;

  beforeEach(() => {
    runtime = new AgentRuntime({
      idGenerator: makeIdGenerator(),
      clock: makeClock(),
    });
  });

  it('should execute independent tasks in parallel', async () => {
    const orgId = 'org-1';
    runtime.registerAgent(createTestProfile({ id: 'agent-a', name: 'AgentA', capabilities: ['research'] }), orgId);
    runtime.registerAgent(createTestProfile({ id: 'agent-b', name: 'AgentB', capabilities: ['planning'] }), orgId);

    const execution = runtime.createExecution({
      organizationId: orgId,
      triggeredBy: 'test',
      tasks: [
        { ...createTaskInput({ title: 'Research Task', requiredCapabilities: ['research'] }) },
        { ...createTaskInput({ title: 'Planning Task', requiredCapabilities: ['planning'] }) },
      ],
      edges: [],
    });

    const result = await runtime.run(execution, createSuccessExecutor());
    assert.equal(result.status, 'completed');
    assert.equal(result.results.length, 2);
    assert.ok(result.results.every((r) => r.success));
  });

  it('should execute dependent tasks in order', async () => {
    const orgId = 'org-1';
    runtime.registerAgent(createTestProfile({ id: 'agent-a', capabilities: ['research', 'planning'] }), orgId);
    runtime.registerAgent(createTestProfile({ id: 'agent-b', capabilities: ['research', 'planning'] }), orgId);

    const execution = runtime.createExecution({
      organizationId: orgId,
      triggeredBy: 'test',
      tasks: [
        { ...createTaskInput({ title: 'Task A', requiredCapabilities: ['research'] }) },
        { ...createTaskInput({ title: 'Task B', requiredCapabilities: ['planning'], dependencies: [] }) },
      ],
      edges: [],
    });

    const taskAId = execution.taskGraph.tasks[0]!.id;
    execution.taskGraph.tasks[1]!.dependencies = [taskAId];

    const result = await runtime.run(execution, createSuccessExecutor());
    assert.equal(result.status, 'completed');
    assert.equal(result.results.length, 2);
  });
});
