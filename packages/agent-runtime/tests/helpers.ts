import type { AgentProfile, AgentResult, AgentTask, Agent, TaskExecutorFn } from '../src/index.ts';

let idCounter = 0;
export function makeIdGenerator() {
  return () => `id_${++idCounter}`;
}

export function makeClock() {
  let tick = 0;
  return () => `2026-01-01T00:00:${String(tick++).padStart(2, '0')}Z`;
}

export function createTestProfile(overrides: Partial<AgentProfile> = {}): AgentProfile {
  return {
    id: 'test-agent',
    name: 'Test Agent',
    version: '1.0.0',
    description: 'A test agent for unit testing',
    capabilities: ['test-capability'],
    estimatedCost: 10,
    priority: 'normal',
    compatibleTools: [],
    requiredPermissions: ['read:memory'],
    maxDurationMs: 10_000,
    confidenceLevel: 0.8,
    runtimeCompatible: ['compiler-runtime'],
    ...overrides,
  };
}

export function createResearchProfile(): AgentProfile {
  return createTestProfile({
    id: 'research-agent',
    name: 'ResearchAgent',
    capabilities: ['research'],
    priority: 'high',
  });
}

export function createPlanningProfile(): AgentProfile {
  return createTestProfile({
    id: 'planning-agent',
    name: 'PlanningAgent',
    capabilities: ['planning'],
    priority: 'critical',
    requiredPermissions: ['read:memory', 'write:memory'],
  });
}

export function createExecutionProfile(): AgentProfile {
  return createTestProfile({
    id: 'execution-agent',
    name: 'ExecutionAgent',
    capabilities: ['execution'],
    priority: 'critical',
    requiredPermissions: ['read:memory', 'write:memory', 'read:executions'],
    maxDurationMs: 60_000,
  });
}

export function createSuccessExecutor(): TaskExecutorFn {
  return async (agent: Agent, task: AgentTask): Promise<AgentResult> => {
    return {
      taskId: task.id,
      agentId: agent.id,
      success: true,
      output: { result: `completed by ${agent.profile.name}`, input: task.input },
      error: null,
      durationMs: 100,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      cost: agent.profile.estimatedCost,
      confidenceScore: agent.profile.confidenceLevel,
    };
  };
}

export function createFailingExecutor(): TaskExecutorFn {
  return async (_agent: Agent, task: AgentTask): Promise<AgentResult> => {
    return {
      taskId: task.id,
      agentId: _agent.id,
      success: false,
      output: {},
      error: 'Simulated task failure',
      durationMs: 50,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      cost: 0,
      confidenceScore: 0,
    };
  };
}

export function createThrowingExecutor(): TaskExecutorFn {
  return async (_agent: Agent, _task: AgentTask): Promise<AgentResult> => {
    throw new Error('Agent crashed during execution');
  };
}

export function createSlowExecutor(delayMs: number): TaskExecutorFn {
  return async (agent: Agent, task: AgentTask): Promise<AgentResult> => {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return {
      taskId: task.id,
      agentId: agent.id,
      success: true,
      output: { result: 'slow completion' },
      error: null,
      durationMs: delayMs,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      cost: agent.profile.estimatedCost,
      confidenceScore: agent.profile.confidenceLevel,
    };
  };
}

export function createTaskInput(overrides: Partial<AgentTask> = {}): Partial<AgentTask> {
  return {
    title: 'Test Task',
    description: 'A test task',
    requiredCapabilities: ['test-capability'],
    requiredPermissions: ['read:memory'],
    priority: 'normal',
    criticality: 'normal',
    input: { query: 'test' },
    dependencies: [],
    maxDurationMs: 10_000,
    timeoutMs: 10_000,
    ...overrides,
  };
}
