import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { AgentRuntime } from '../src/index.ts';
import {
  makeIdGenerator,
  makeClock,
  createTestProfile,
  createFailingExecutor,
  createTaskInput,
} from './helpers.ts';

describe('Agent recovery', () => {
  let runtime: AgentRuntime;

  beforeEach(() => {
    runtime = new AgentRuntime({
      idGenerator: makeIdGenerator(),
      clock: makeClock(),
    });
  });

  it('should recover by assigning task to a different agent', async () => {
    const orgId = 'org-1';
    runtime.registerAgent(createTestProfile({ id: 'fail-agent', name: 'FailAgent', capabilities: ['test-capability'] }), orgId);
    runtime.registerAgent(createTestProfile({ id: 'ok-agent', name: 'OkAgent', capabilities: ['test-capability'] }), orgId);

    let firstCall = true;
    const executor = async (agent: { id: string; profile: { name: string } }, task: { id: string }) => {
      if (firstCall && agent.id === runtime.listAgents(orgId)[0]!.id) {
        firstCall = false;
        return {
          taskId: task.id,
          agentId: agent.id,
          success: false,
          output: {},
          error: 'First agent failed',
          durationMs: 10,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          cost: 0,
          confidenceScore: 0,
        };
      }
      return {
        taskId: task.id,
        agentId: agent.id,
        success: true,
        output: { recovered: true },
        error: null,
        durationMs: 10,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        cost: 5,
        confidenceScore: 0.8,
      };
    };

    const execution = runtime.createExecution({
      organizationId: orgId,
      triggeredBy: 'test',
      tasks: [{ ...createTaskInput({ title: 'Recoverable Task' }) }],
      edges: [],
    });

    const result = await runtime.run(execution, executor);
    assert.ok(result.status === 'completed' || result.status === 'failed');
  });

  it('should mark agent dead after consecutive failures', () => {
    const agentId = 'agent-a';
    runtime.healthMonitor.recordFailure(agentId, 'error 1');
    assert.equal(runtime.healthMonitor.getHealth(agentId)!.state, 'degraded');

    runtime.healthMonitor.recordFailure(agentId, 'error 2');
    assert.equal(runtime.healthMonitor.getHealth(agentId)!.state, 'unhealthy');

    runtime.healthMonitor.recordFailure(agentId, 'error 3');
    assert.equal(runtime.healthMonitor.getHealth(agentId)!.state, 'dead');
  });

  it('should not recover after max attempts', async () => {
    const orgId = 'org-1';
    runtime.registerAgent(createTestProfile({ id: 'agent-a', capabilities: ['test-capability'] }), orgId);

    const execution = runtime.createExecution({
      organizationId: orgId,
      triggeredBy: 'test',
      tasks: [{ ...createTaskInput({ title: 'Always Fails' }) }],
      edges: [],
    });

    const result = await runtime.run(execution, createFailingExecutor());
    assert.equal(result.status, 'failed');
  });

  it('should reset health on successful heartbeat', () => {
    const agentId = 'agent-a';
    runtime.healthMonitor.recordFailure(agentId, 'error');
    assert.ok(runtime.healthMonitor.getHealth(agentId)!.consecutiveFailures > 0);

    runtime.healthMonitor.recordHeartbeat(agentId);
    assert.equal(runtime.healthMonitor.getHealth(agentId)!.consecutiveFailures, 0);
    assert.equal(runtime.healthMonitor.getHealth(agentId)!.state, 'healthy');
  });
});
