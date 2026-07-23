import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { AgentRuntime, AgentScheduler } from '../src/index.ts';
import {
  makeIdGenerator,
  makeClock,
  createTestProfile,
  createTaskInput,
} from './helpers.ts';

describe('Scheduler policies', () => {
  let idGen: () => string;
  let clock: () => string;

  beforeEach(() => {
    idGen = makeIdGenerator();
    clock = makeClock();
  });

  it('capability_based: should select agent with matching capabilities', () => {
    const scheduler = new AgentScheduler('capability_based');
    const task = {
      ...createTaskInput({ requiredCapabilities: ['research'] }),
      id: 't1', executionId: 'e1', status: 'pending' as const,
      assignedAgentId: null, createdAt: clock(), dispatchedAt: null,
      startedAt: null, completedAt: null,
    };
    const agents = [
      { id: 'a1', profile: createTestProfile({ id: 'p1', capabilities: ['planning'] }), status: 'idle' as const,
        organizationId: 'org', currentTaskId: null, createdAt: clock(), lastActiveAt: clock(), load: 0, totalExecutions: 0, failedExecutions: 0 },
      { id: 'a2', profile: createTestProfile({ id: 'p2', capabilities: ['research'] }), status: 'idle' as const,
        organizationId: 'org', currentTaskId: null, createdAt: clock(), lastActiveAt: clock(), load: 0, totalExecutions: 0, failedExecutions: 0 },
    ];
    const selected = scheduler.selectAgent(task as never, agents as never);
    assert.ok(selected);
    assert.equal(selected!.id, 'a2');
  });

  it('priority: should select highest priority agent', () => {
    const scheduler = new AgentScheduler('priority');
    const task = {
      ...createTaskInput({ requiredCapabilities: ['test-capability'] }),
      id: 't1', executionId: 'e1', status: 'pending' as const,
      assignedAgentId: null, createdAt: clock(), dispatchedAt: null,
      startedAt: null, completedAt: null,
    };
    const agents = [
      { id: 'a1', profile: createTestProfile({ id: 'p1', priority: 'low' }), status: 'idle' as const,
        organizationId: 'org', currentTaskId: null, createdAt: clock(), lastActiveAt: clock(), load: 0, totalExecutions: 0, failedExecutions: 0 },
      { id: 'a2', profile: createTestProfile({ id: 'p2', priority: 'critical' }), status: 'idle' as const,
        organizationId: 'org', currentTaskId: null, createdAt: clock(), lastActiveAt: clock(), load: 0, totalExecutions: 0, failedExecutions: 0 },
    ];
    const selected = scheduler.selectAgent(task as never, agents as never);
    assert.equal(selected!.id, 'a2');
  });

  it('least_loaded: should select agent with lowest load', () => {
    const scheduler = new AgentScheduler('least_loaded');
    const task = {
      ...createTaskInput({ requiredCapabilities: ['test-capability'] }),
      id: 't1', executionId: 'e1', status: 'pending' as const,
      assignedAgentId: null, createdAt: clock(), dispatchedAt: null,
      startedAt: null, completedAt: null,
    };
    const agents = [
      { id: 'a1', profile: createTestProfile({ id: 'p1' }), status: 'idle' as const,
        organizationId: 'org', currentTaskId: null, createdAt: clock(), lastActiveAt: clock(), load: 5, totalExecutions: 0, failedExecutions: 0 },
      { id: 'a2', profile: createTestProfile({ id: 'p2' }), status: 'idle' as const,
        organizationId: 'org', currentTaskId: null, createdAt: clock(), lastActiveAt: clock(), load: 1, totalExecutions: 0, failedExecutions: 0 },
    ];
    const selected = scheduler.selectAgent(task as never, agents as never);
    assert.equal(selected!.id, 'a2');
  });

  it('round_robin: should cycle through agents', () => {
    const scheduler = new AgentScheduler('round_robin');
    const task = {
      ...createTaskInput({ requiredCapabilities: ['test-capability'] }),
      id: 't1', executionId: 'e1', status: 'pending' as const,
      assignedAgentId: null, createdAt: clock(), dispatchedAt: null,
      startedAt: null, completedAt: null,
    };
    const agents = [
      { id: 'a1', profile: createTestProfile({ id: 'p1' }), status: 'idle' as const,
        organizationId: 'org', currentTaskId: null, createdAt: clock(), lastActiveAt: clock(), load: 0, totalExecutions: 0, failedExecutions: 0 },
      { id: 'a2', profile: createTestProfile({ id: 'p2' }), status: 'idle' as const,
        organizationId: 'org', currentTaskId: null, createdAt: clock(), lastActiveAt: clock(), load: 0, totalExecutions: 0, failedExecutions: 0 },
    ];
    const first = scheduler.selectAgent(task as never, agents as never);
    const second = scheduler.selectAgent(task as never, agents as never);
    assert.notEqual(first!.id, second!.id);
  });

  it('should return null when no idle agents', () => {
    const scheduler = new AgentScheduler('capability_based');
    const task = {
      ...createTaskInput({ requiredCapabilities: ['test-capability'] }),
      id: 't1', executionId: 'e1', status: 'pending' as const,
      assignedAgentId: null, createdAt: clock(), dispatchedAt: null,
      startedAt: null, completedAt: null,
    };
    const selected = scheduler.selectAgent(task as never, []);
    assert.equal(selected, null);
  });

  it('runtime should allow changing scheduler policy', async () => {
    const runtime = new AgentRuntime({ idGenerator: idGen, clock });
    runtime.setSchedulerPolicy('round_robin');
    assert.equal(runtime.scheduler.getPolicy(), 'round_robin');
    runtime.setSchedulerPolicy('least_loaded');
    assert.equal(runtime.scheduler.getPolicy(), 'least_loaded');
  });
});
