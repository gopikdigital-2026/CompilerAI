import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';
import { ExecutionEngine } from '../src/execution/ExecutionEngine.js';
import { IntelligentPlanner } from '../src/planner/IntelligentPlanner.js';
import { AgentRegistry } from '../src/registry/AgentRegistry.js';
import { CommunicationBus } from '../src/communication/CommunicationBus.js';
import { SharedMemory } from '../src/memory/SharedMemory.js';
import { ApprovalEngine } from '../src/approvals/ApprovalEngine.js';
import { TelemetryEngine } from '../src/telemetry/TelemetryEngine.js';
import { MockAgentExecutor } from '../src/agents/MockAgentExecutor.js';
import { createAllAgents } from '../src/agents/AgentDefinitions.js';
import { createDefaultPolicies } from '../src/orchestrator/MultiAgentOrchestrator.js';
import type { IAgentExecutor, ISharedMemory, PlannedTask, TaskResult } from '../src/models.js';

describe('ExecutionEngine', () => {
  let execution: ExecutionEngine;
  let registry: AgentRegistry;
  let memory: SharedMemory;
  let bus: CommunicationBus;
  let telemetry: TelemetryEngine;
  let approvals: ApprovalEngine;
  let executor: IAgentExecutor;
  let policies: ReturnType<typeof createDefaultPolicies>;

  beforeEach(() => {
    execution = new ExecutionEngine();
    registry = new AgentRegistry();
    for (const a of createAllAgents()) registry.register(a);
    memory = new SharedMemory();
    bus = new CommunicationBus();
    telemetry = new TelemetryEngine();
    approvals = new ApprovalEngine();
    executor = new MockAgentExecutor();
    policies = createDefaultPolicies();
  });

  test('executes a simple workflow to completion', async () => {
    const plan = new IntelligentPlanner().generate('Handle customer support inquiries', 'org-1', registry);
    const result = await execution.execute(plan, executor, memory, bus, telemetry, policies, approvals);
    assert.equal(result.state, 'completed');
    assert.equal(result.success, true);
    assert.ok(result.results.length > 0);
  });

  test('executes a workflow with parallel tasks', async () => {
    const plan = new IntelligentPlanner().generate('Manage all critical incidents received today', 'org-1', registry);
    const result = await execution.execute(plan, executor, memory, bus, telemetry, policies, approvals);
    assert.equal(result.state, 'completed');
    const parallelEvents = telemetry.getEventsByType('workflow.parallelized');
    assert.ok(parallelEvents.length > 0 || plan.tasks.length === 1);
  });

  test('records timeline entries', async () => {
    const plan = new IntelligentPlanner().generate('Research market trends', 'org-1', registry);
    const result = await execution.execute(plan, executor, memory, bus, telemetry, policies, approvals);
    assert.ok(result.timeline.length > 0);
    assert.ok(result.timeline.some((t) => t.type === 'workflow_started'));
    assert.ok(result.timeline.some((t) => t.type === 'workflow_completed'));
  });

  test('emits telemetry events', async () => {
    const plan = new IntelligentPlanner().generate('Generate a report document', 'org-1', registry);
    await execution.execute(plan, executor, memory, bus, telemetry, policies, approvals);
    assert.ok(telemetry.getEventsByType('agent.started').length > 0);
    assert.ok(telemetry.getEventsByType('agent.completed').length > 0);
  });

  test('emits approval events for tasks requiring approval', async () => {
    const plan = new IntelligentPlanner().generate('Process the payment for the latest invoice', 'org-1', registry);
    await execution.execute(plan, executor, memory, bus, telemetry, policies, approvals);
    assert.ok(telemetry.getEventsByType('approval.requested').length > 0);
    assert.ok(telemetry.getEventsByType('approval.completed').length > 0);
  });

  test('stores results in shared memory', async () => {
    const plan = new IntelligentPlanner().generate('Handle customer support inquiries', 'org-1', registry);
    await execution.execute(plan, executor, memory, bus, telemetry, policies, approvals);
    const results = memory.list('result');
    assert.ok(results.length > 0);
  });

  test('records decisions in decision history', async () => {
    const plan = new IntelligentPlanner().generate('Research the competitive landscape', 'org-1', registry);
    await execution.execute(plan, executor, memory, bus, telemetry, policies, approvals);
    const history = memory.getDecisionHistory();
    assert.ok(history.length > 0);
    assert.ok(history.every((h) => h.decision.reasoning.length > 0));
    assert.ok(history.every((h) => h.decision.alternatives.length > 0));
  });

  test('cancels a running workflow', async () => {
    const plan = new IntelligentPlanner().generate('Deploy the new version to production', 'org-1', registry);
    const executePromise = execution.execute(plan, executor, memory, bus, telemetry, policies, approvals);
    execution.cancel(plan.id);
    await executePromise;
    assert.equal(execution.getStatus(plan.id), 'cancelled');
  });

  test('getTimeline returns workflow timeline', async () => {
    const plan = new IntelligentPlanner().generate('Research market trends', 'org-1', registry);
    await execution.execute(plan, executor, memory, bus, telemetry, policies, approvals);
    const timeline = execution.getTimeline(plan.id);
    assert.ok(timeline.length > 0);
  });

  test('getCheckpoint returns checkpoint state', async () => {
    const plan = new IntelligentPlanner().generate('Research market trends', 'org-1', registry);
    await execution.execute(plan, executor, memory, bus, telemetry, policies, approvals);
    const checkpoint = execution.getCheckpoint(plan.id);
    assert.ok(checkpoint);
    assert.equal(checkpoint!.workflowId, plan.id);
  });

  test('handles agent failure and recovery', async () => {
    let callCount = 0;
    const failingExecutor: IAgentExecutor = {
      async execute(agentId: string, task: PlannedTask, _mem: ISharedMemory): Promise<TaskResult> {
        callCount++;
        if (callCount === 1) {
          throw new Error('Simulated failure');
        }
        const result: TaskResult = {
          taskId: task.id, agentId, status: 'completed', output: 'recovered',
          confidence: 0.85, reasoning: 'Recovered after retry', alternatives: [],
          startedAt: new Date().toISOString(), completedAt: new Date().toISOString(),
          cost: task.estimatedCost, durationMs: 10, retries: 1,
        };
        return result;
      },
    };
    const plan = new IntelligentPlanner().generate('Generate a report document', 'org-1', registry);
    const result = await execution.execute(plan, failingExecutor, memory, bus, telemetry, policies, approvals);
    assert.ok(result.results.some((r) => r.retries > 0));
  });

  test('respects maxConcurrency limit', async () => {
    policies.maxConcurrency = 1;
    const plan = new IntelligentPlanner().generate('Manage all critical incidents received today', 'org-1', registry);
    const result = await execution.execute(plan, executor, memory, bus, telemetry, policies, approvals);
    assert.equal(result.state, 'completed');
  });

  test('communication bus receives messages during execution', async () => {
    const plan = new IntelligentPlanner().generate('Research market trends', 'org-1', registry);
    await execution.execute(plan, executor, memory, bus, telemetry, policies, approvals);
    const messages = bus.getMessages();
    assert.ok(messages.length > 0);
    assert.ok(messages.some((m) => m.type === 'request'));
    assert.ok(messages.some((m) => m.type === 'response'));
  });

  test('total cost is sum of task costs', async () => {
    const plan = new IntelligentPlanner().generate('Handle customer support inquiries', 'org-1', registry);
    const result = await execution.execute(plan, executor, memory, bus, telemetry, policies, approvals);
    const expectedCost = result.results.reduce((sum, r) => sum + r.cost, 0);
    assert.equal(result.totalCost, expectedCost);
  });
});
