import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { AgentRuntime, AgentPolicyEngine, AgentPermissionError } from '../src/index.ts';
import { makeIdGenerator, makeClock, createTestProfile, createSuccessExecutor, createTaskInput } from './helpers.ts';

describe('Agent isolation', () => {
  let runtime: AgentRuntime;

  beforeEach(() => {
    runtime = new AgentRuntime({
      idGenerator: makeIdGenerator(),
      clock: makeClock(),
    });
  });

  it('should isolate agents by organization', () => {
    runtime.registerAgent(createTestProfile({ id: 'agent-a' }), 'org-1');
    runtime.registerAgent(createTestProfile({ id: 'agent-b' }), 'org-2');

    const org1Agents = runtime.listAgents('org-1');
    const org2Agents = runtime.listAgents('org-2');
    assert.equal(org1Agents.length, 1);
    assert.equal(org2Agents.length, 1);
    assert.equal(org1Agents[0]!.organizationId, 'org-1');
    assert.equal(org2Agents[0]!.organizationId, 'org-2');
  });

  it('should not allow org-1 agent to execute org-2 tasks', async () => {
    runtime.registerAgent(createTestProfile({ id: 'agent-a', capabilities: ['test-capability'] }), 'org-1');

    const execution = runtime.createExecution({
      organizationId: 'org-2',
      triggeredBy: 'test',
      tasks: [{ ...createTaskInput({ title: 'T' }) }],
      edges: [],
    });

    const result = await runtime.run(execution, createSuccessExecutor());
    assert.notEqual(result.status, 'completed');
  });

  it('policy engine should reject cross-org agent access', () => {
    const policy = new AgentPolicyEngine();
    const agent = {
      id: 'a1', profile: createTestProfile({ id: 'p1' }), status: 'idle' as const,
      organizationId: 'org-1', currentTaskId: null, createdAt: '', lastActiveAt: '',
      load: 0, totalExecutions: 0, failedExecutions: 0,
    };
    const result = policy.validateAgentForOrganization(agent, 'org-2');
    assert.equal(result.allowed, false);
    assert.throws(() => policy.assertOrganization(agent, 'org-2'), AgentPermissionError);
  });

  it('should allow same-org agent access', () => {
    const policy = new AgentPolicyEngine();
    const agent = {
      id: 'a1', profile: createTestProfile({ id: 'p1' }), status: 'idle' as const,
      organizationId: 'org-1', currentTaskId: null, createdAt: '', lastActiveAt: '',
      load: 0, totalExecutions: 0, failedExecutions: 0,
    };
    const result = policy.validateAgentForOrganization(agent, 'org-1');
    assert.equal(result.allowed, true);
  });
});
