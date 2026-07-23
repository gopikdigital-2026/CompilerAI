import type { Agent, AgentTask, AgentResult, TaskStatus, AgentTaskGraph } from '../models/AgentModels';
import type { IAgentRegistry } from './AgentRegistry';
import type { IScheduler } from './AgentScheduler';
import type { IAgentHealthMonitor } from './AgentHealthMonitor';
import type { IAgentLifecycleManager } from './AgentLifecycleManager';
import type { IAgentCommunicationBus } from './AgentCommunicationBus';
import type { IAgentPolicyEngine } from './AgentPolicyEngine';
import type { ITelemetryAdapter, IMemoryAdapter, IExecutionAdapter } from '../integrations/IntegrationAdapters';

export type TaskExecutorFn = (
  agent: Agent,
  task: AgentTask,
  context: Record<string, unknown>,
) => Promise<AgentResult>;

export interface IDispatchResult {
  task: AgentTask;
  agent: Agent | null;
  result: AgentResult | null;
  error: string | null;
  recovered: boolean;
}

export interface IAgentTaskDispatcher {
  dispatch(
    executionId: string,
    organizationId: string,
    task: AgentTask,
    context: Record<string, unknown>,
    executor: TaskExecutorFn,
  ): Promise<IDispatchResult>;
  dispatchParallel(
    executionId: string,
    organizationId: string,
    tasks: AgentTask[],
    context: Record<string, unknown>,
    executor: TaskExecutorFn,
  ): Promise<IDispatchResult[]>;
  getReadyTasks(graph: AgentTaskGraph, completedTaskIds: string[]): AgentTask[];
}

export class AgentTaskDispatcher implements IAgentTaskDispatcher {
  constructor(
    private readonly registry: IAgentRegistry,
    private readonly scheduler: IScheduler,
    private readonly healthMonitor: IAgentHealthMonitor,
    private readonly lifecycleManager: IAgentLifecycleManager,
    private readonly commBus: IAgentCommunicationBus,
    private readonly policyEngine: IAgentPolicyEngine,
    private readonly telemetry: ITelemetryAdapter,
    private readonly memory: IMemoryAdapter,
    private readonly executionAdapter: IExecutionAdapter,
    private readonly clock: () => string,
  ) {}

  async dispatch(
    executionId: string,
    organizationId: string,
    task: AgentTask,
    context: Record<string, unknown>,
    executor: TaskExecutorFn,
  ): Promise<IDispatchResult> {
    this.commBus.publish({
      executionId,
      kind: 'task_request',
      fromAgentId: 'coordinator',
      toAgentId: null,
      payload: { taskId: task.id, title: task.title, requiredCapabilities: task.requiredCapabilities },
    });

    const candidates = this.registry.getByOrganization(organizationId).filter(
      (a) => a.status === 'idle',
    );

    let selectedAgent: Agent | null = null;
    try {
      selectedAgent = this.scheduler.selectAgent(task, candidates);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Scheduling failed';
      return { task, agent: null, result: null, error: msg, recovered: false };
    }

    if (!selectedAgent) {
      return { task, agent: null, result: null, error: 'No eligible agent available', recovered: false };
    }

    this.policyEngine.assertAgentForTask(selectedAgent, task);
    this.policyEngine.assertOrganization(selectedAgent, organizationId);
    this.healthMonitor.assertHealthy(selectedAgent.id);

    const assigned = this.lifecycleManager.assignTask(selectedAgent, task.id);
    this.registry.update(assigned);
    this.healthMonitor.incrementActiveTasks(assigned.id);

    task.assignedAgentId = assigned.id;
    task.status = 'dispatched';
    task.dispatchedAt = this.clock();

    this.telemetry.recordEvent('task_dispatched', { taskId: task.id, agentId: assigned.id, executionId });
    this.executionAdapter.notifyTaskDispatched(task.id, assigned.id, executionId);
    this.commBus.publish({
      executionId,
      kind: 'task_request',
      fromAgentId: 'coordinator',
      toAgentId: assigned.id,
      payload: { taskId: task.id, title: task.title },
    });

    try {
      task.status = 'in_progress';
      task.startedAt = this.clock();
      const runningAgent = this.lifecycleManager.resume(assigned);
      this.registry.update(runningAgent);

      this.telemetry.recordStageStart(executionId, task.title, assigned.id);

      const result = await this.executeWithTimeout(executor, runningAgent, task, context, executionId);

      const completed = this.lifecycleManager.completeTask(runningAgent, result.success);
      this.registry.update(completed);
      this.healthMonitor.recordSuccess(completed.id);
      this.healthMonitor.decrementActiveTasks(completed.id);

      task.status = result.success ? 'completed' : 'failed';
      task.completedAt = this.clock();

      if (result.success) {
        this.telemetry.recordStageComplete(executionId, task.title, result.durationMs);
      } else {
        this.telemetry.recordStageFailure(executionId, task.title, result.error ?? 'Task failed');
      }
      this.memory.write(executionId, `task_${task.id}_result`, result);
      this.executionAdapter.notifyTaskComplete(task.id, assigned.id, result);

      this.commBus.publish({
        executionId,
        kind: 'task_response',
        fromAgentId: assigned.id,
        toAgentId: 'coordinator',
        payload: { taskId: task.id, success: result.success },
      });

      return { task, agent: completed, result, error: result.error, recovered: false };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown execution error';
      const failed = this.lifecycleManager.completeTask(assigned, false);
      this.registry.update(failed);
      this.healthMonitor.recordFailure(assigned.id, errorMsg);
      this.healthMonitor.decrementActiveTasks(assigned.id);

      task.status = 'failed';
      task.completedAt = this.clock();

      this.telemetry.recordStageFailure(executionId, task.title, errorMsg);
      this.commBus.publish({
        executionId,
        kind: 'error',
        fromAgentId: assigned.id,
        toAgentId: 'coordinator',
        payload: { taskId: task.id, error: errorMsg },
      });

      return { task, agent: failed, result: null, error: errorMsg, recovered: false };
    }
  }

  async dispatchParallel(
    executionId: string,
    organizationId: string,
    tasks: AgentTask[],
    context: Record<string, unknown>,
    executor: TaskExecutorFn,
  ): Promise<IDispatchResult[]> {
    const promises = tasks.map((task) =>
      this.dispatch(executionId, organizationId, task, context, executor),
    );
    return Promise.all(promises);
  }

  getReadyTasks(graph: AgentTaskGraph, completedTaskIds: string[]): AgentTask[] {
    return graph.tasks.filter((task) => {
      if (task.status === 'completed' || task.status === 'cancelled') return false;
      return task.dependencies.every((dep) => completedTaskIds.includes(dep));
    });
  }

  private async executeWithTimeout(
    executor: TaskExecutorFn,
    agent: Agent,
    task: AgentTask,
    context: Record<string, unknown>,
    executionId: string,
  ): Promise<AgentResult> {
    const timeoutMs = task.timeoutMs > 0 ? task.timeoutMs : agent.profile.maxDurationMs;

    return new Promise<AgentResult>((resolve, reject) => {
      const timer = setTimeout(() => {
        task.status = 'timed_out' as TaskStatus;
        this.commBus.publish({
          executionId,
          kind: 'error',
          fromAgentId: agent.id,
          toAgentId: 'coordinator',
          payload: { taskId: task.id, error: `Task timed out after ${timeoutMs}ms` },
        });
        reject(new Error(`Task ${task.id} timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      executor(agent, task, context)
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }
}
