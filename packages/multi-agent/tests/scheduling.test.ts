import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { TaskScheduler } from '../src/scheduling/TaskScheduler.js';
import { IntelligentPlanner } from '../src/planner/IntelligentPlanner.js';
import { AgentRegistry } from '../src/registry/AgentRegistry.js';
import { createAllAgents } from '../src/agents/AgentDefinitions.js';
import type { AgentPriority, PlannedTask } from '../src/models.js';

function makeTask(id: string, priority: AgentPriority, deps: string[] = []): PlannedTask {
  return {
    id, name: `Task ${id}`, description: 'test', agentId: 'research',
    dependencies: deps.map((taskId) => ({ taskId, type: 'finish_to_start' as const })),
    approval: { required: false, reason: '' },
    estimatedCost: 0.20, estimatedDurationMs: 200, priority,
    inputRefs: deps, outputKey: `out-${id}`,
  };
}

describe('TaskScheduler', () => {
  test('schedules independent tasks in a single wave when concurrency allows', () => {
    const scheduler = new TaskScheduler();
    const tasks = [makeTask('t1', 'normal'), makeTask('t2', 'normal'), makeTask('t3', 'normal')];
    const waves = scheduler.schedule(tasks, 3);
    assert.equal(waves.length, 1);
    assert.equal(waves[0].length, 3);
  });

  test('respects maxConcurrency limit', () => {
    const scheduler = new TaskScheduler();
    const tasks = [makeTask('t1', 'normal'), makeTask('t2', 'normal'), makeTask('t3', 'normal')];
    const waves = scheduler.schedule(tasks, 1);
    assert.equal(waves.length, 3);
    assert.equal(waves[0].length, 1);
  });

  test('schedules tasks with dependencies in correct order', () => {
    const scheduler = new TaskScheduler();
    const tasks = [
      makeTask('t1', 'normal'),
      makeTask('t2', 'normal', ['t1']),
      makeTask('t3', 'normal', ['t2']),
    ];
    const waves = scheduler.schedule(tasks, 3);
    assert.equal(waves.length, 3);
    assert.equal(waves[0][0].taskId, 't1');
    assert.equal(waves[1][0].taskId, 't2');
    assert.equal(waves[2][0].taskId, 't3');
  });

  test('prioritizes higher priority tasks', () => {
    const scheduler = new TaskScheduler();
    const tasks = [
      makeTask('t1', 'low'),
      makeTask('t2', 'critical'),
      makeTask('t3', 'normal'),
    ];
    const waves = scheduler.schedule(tasks, 1);
    assert.equal(waves[0][0].taskId, 't2');
    assert.equal(waves[1][0].taskId, 't3');
    assert.equal(waves[2][0].taskId, 't1');
  });

  test('handles parallel tasks with shared dependency', () => {
    const scheduler = new TaskScheduler();
    const tasks = [
      makeTask('t1', 'normal'),
      makeTask('t2', 'normal', ['t1']),
      makeTask('t3', 'normal', ['t1']),
    ];
    const waves = scheduler.schedule(tasks, 3);
    assert.equal(waves.length, 2);
    assert.equal(waves[0][0].taskId, 't1');
    assert.equal(waves[1].length, 2);
  });

  test('schedules real plan from planner', () => {
    const registry = new AgentRegistry();
    for (const a of createAllAgents()) registry.register(a);
    const plan = new IntelligentPlanner().generate('Manage all critical incidents', 'org-1', registry);
    const scheduler = new TaskScheduler();
    const waves = scheduler.schedule(plan.tasks, 3);
    assert.ok(waves.length > 0);
    const allScheduled = waves.flat().map((s) => s.taskId);
    assert.equal(allScheduled.length, plan.tasks.length);
  });
});
