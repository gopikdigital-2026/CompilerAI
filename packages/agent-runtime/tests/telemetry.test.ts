import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { AgentRuntime, type ITelemetryAdapter, type IExecutionAdapter } from '../src/index.ts';
import type { AgentExecution, AgentResult, AgentCheckpoint, AgentHealthStatus } from '../src/index.ts';
import { makeIdGenerator, makeClock, createTestProfile, createSuccessExecutor, createFailingExecutor, createTaskInput } from './helpers.ts';

class TestTelemetryAdapter implements ITelemetryAdapter {
  events: Array<{ type: string; payload: Record<string, unknown> }> = [];
  stages: Array<{ execId: string; stage: string; agentId?: string; status: string; duration?: number; error?: string }> = [];
  metrics: Array<{ agentId: string; metric: string; value: number }> = [];

  recordEvent(eventType: string, payload: Record<string, unknown>): void {
    this.events.push({ type: eventType, payload });
  }
  recordStageStart(executionId: string, stageName: string, agentId?: string): void {
    this.stages.push({ execId: executionId, stage: stageName, agentId, status: 'start' });
  }
  recordStageComplete(executionId: string, stageName: string, durationMs: number): void {
    this.stages.push({ execId: executionId, stage: stageName, status: 'complete', duration: durationMs });
  }
  recordStageFailure(executionId: string, stageName: string, error: string): void {
    this.stages.push({ execId: executionId, stage: stageName, status: 'failure', error });
  }
  recordAgentMetric(agentId: string, metricName: string, value: number): void {
    this.metrics.push({ agentId, metric: metricName, value });
  }
  flush(): void {}
}

class TestExecutionAdapter implements IExecutionAdapter {
  starts: AgentExecution[] = [];
  completions: Array<{ execId: string; success: boolean; results: AgentResult[] }> = [];
  dispatches: Array<{ taskId: string; agentId: string; execId: string }> = [];
  checkpoints: AgentCheckpoint[] = [];
  healthUpdates: AgentHealthStatus[] = [];

  notifyExecutionStart(execution: AgentExecution): void { this.starts.push(execution); }
  notifyExecutionComplete(executionId: string, success: boolean, results: AgentResult[]): void {
    this.completions.push({ execId: executionId, success, results });
  }
  notifyTaskDispatched(taskId: string, agentId: string, executionId: string): void {
    this.dispatches.push({ taskId, agentId, execId: executionId });
  }
  notifyTaskComplete(_taskId: string, _agentId: string, _result: AgentResult): void {}
  notifyCheckpointSaved(checkpoint: AgentCheckpoint): void { this.checkpoints.push(checkpoint); }
  notifyAgentHealth(health: AgentHealthStatus): void { this.healthUpdates.push(health); }
}

describe('Telemetry integration', () => {
  let runtime: AgentRuntime;
  let telemetry: TestTelemetryAdapter;

  beforeEach(() => {
    telemetry = new TestTelemetryAdapter();
    runtime = new AgentRuntime({
      idGenerator: makeIdGenerator(),
      clock: makeClock(),
      telemetry,
    });
  });

  it('should record execution started event', async () => {
    runtime.registerAgent(createTestProfile({ id: 'agent-a', capabilities: ['test-capability'] }), 'org-1');
    const execution = runtime.createExecution({
      organizationId: 'org-1', triggeredBy: 'test',
      tasks: [{ ...createTaskInput({ title: 'T' }) }], edges: [],
    });
    await runtime.run(execution, createSuccessExecutor());
    assert.ok(telemetry.events.some((e) => e.type === 'execution_started'));
    assert.ok(telemetry.events.some((e) => e.type === 'execution_completed'));
  });

  it('should record stage start and completion', async () => {
    runtime.registerAgent(createTestProfile({ id: 'agent-a', capabilities: ['test-capability'] }), 'org-1');
    const execution = runtime.createExecution({
      organizationId: 'org-1', triggeredBy: 'test',
      tasks: [{ ...createTaskInput({ title: 'MyTask' }) }], edges: [],
    });
    await runtime.run(execution, createSuccessExecutor());
    assert.ok(telemetry.stages.some((s) => s.stage === 'MyTask' && s.status === 'start'));
    assert.ok(telemetry.stages.some((s) => s.stage === 'MyTask' && s.status === 'complete'));
  });

  it('should record stage failure on task failure', async () => {
    runtime.registerAgent(createTestProfile({ id: 'agent-a', capabilities: ['test-capability'] }), 'org-1');
    const execution = runtime.createExecution({
      organizationId: 'org-1', triggeredBy: 'test',
      tasks: [{ ...createTaskInput({ title: 'BadTask' }) }], edges: [],
    });
    await runtime.run(execution, createFailingExecutor());
    assert.ok(telemetry.stages.some((s) => s.stage === 'BadTask' && s.status === 'failure'));
  });

  it('should record execution failed event', async () => {
    runtime.registerAgent(createTestProfile({ id: 'agent-a', capabilities: ['test-capability'] }), 'org-1');
    const execution = runtime.createExecution({
      organizationId: 'org-1', triggeredBy: 'test',
      tasks: [{ ...createTaskInput({ title: 'T' }) }], edges: [],
    });
    await runtime.run(execution, createFailingExecutor());
    assert.ok(telemetry.events.some((e) => e.type === 'execution_failed' || e.type === 'execution_completed'));
  });
});

describe('Execution adapter integration', () => {
  let runtime: AgentRuntime;
  let execAdapter: TestExecutionAdapter;

  beforeEach(() => {
    execAdapter = new TestExecutionAdapter();
    runtime = new AgentRuntime({
      idGenerator: makeIdGenerator(),
      clock: makeClock(),
      execution: execAdapter,
    });
  });

  it('should notify execution start and completion', async () => {
    runtime.registerAgent(createTestProfile({ id: 'agent-a', capabilities: ['test-capability'] }), 'org-1');
    const execution = runtime.createExecution({
      organizationId: 'org-1', triggeredBy: 'test',
      tasks: [{ ...createTaskInput({ title: 'T' }) }], edges: [],
    });
    await runtime.run(execution, createSuccessExecutor());
    assert.equal(execAdapter.starts.length, 1);
    assert.equal(execAdapter.completions.length, 1);
    assert.ok(execAdapter.completions[0]!.success);
  });

  it('should notify task dispatch', async () => {
    runtime.registerAgent(createTestProfile({ id: 'agent-a', capabilities: ['test-capability'] }), 'org-1');
    const execution = runtime.createExecution({
      organizationId: 'org-1', triggeredBy: 'test',
      tasks: [{ ...createTaskInput({ title: 'T' }) }], edges: [],
    });
    await runtime.run(execution, createSuccessExecutor());
    assert.ok(execAdapter.dispatches.length > 0);
  });
});
