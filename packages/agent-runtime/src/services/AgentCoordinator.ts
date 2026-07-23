import type {
  AgentExecution,
  AgentResult,
} from '../models/AgentModels';
import type { IAgentTaskDispatcher, TaskExecutorFn } from './AgentTaskDispatcher';
import type { IAgentCheckpointManager } from './AgentCheckpointManager';
import type { IAgentRecoveryManager } from './AgentRecoveryManager';
import type { IAgentCommunicationBus } from './AgentCommunicationBus';
import type { IAgentHealthMonitor } from './AgentHealthMonitor';
import type { IAgentRegistry } from './AgentRegistry';
import type { ITelemetryAdapter, IMemoryAdapter, IExecutionAdapter } from '../integrations/IntegrationAdapters';
import { ExecutionNotFoundError } from '../errors/AgentErrors';

export interface IAgentCoordinator {
  execute(
    execution: AgentExecution,
    organizationId: string,
    executor: TaskExecutorFn,
  ): Promise<AgentExecution>;
  cancel(executionId: string): boolean;
  isRunning(executionId: string): boolean;
  resumeFromCheckpoint(executionId: string, organizationId: string, executor: TaskExecutorFn): Promise<AgentExecution>;
}

export class AgentCoordinator implements IAgentCoordinator {
  private readonly runningExecutions = new Set<string>();
  private readonly cancelledExecutions = new Set<string>();

  constructor(
    private readonly dispatcher: IAgentTaskDispatcher,
    private readonly checkpointManager: IAgentCheckpointManager,
    private readonly recoveryManager: IAgentRecoveryManager,
    private readonly commBus: IAgentCommunicationBus,
    private readonly _healthMonitor: IAgentHealthMonitor,
    private readonly _registry: IAgentRegistry,
    private readonly telemetry: ITelemetryAdapter,
    private readonly memory: IMemoryAdapter,
    private readonly executionAdapter: IExecutionAdapter,
    private readonly clock: () => string,
  ) {
    void this._healthMonitor;
    void this._registry;
  }

  async execute(
    execution: AgentExecution,
    organizationId: string,
    executor: TaskExecutorFn,
  ): Promise<AgentExecution> {
    this.runningExecutions.add(execution.id);
    execution.status = 'running';
    execution.startedAt = this.clock();

    this.telemetry.recordEvent('execution_started', { executionId: execution.id, organizationId });
    this.executionAdapter.notifyExecutionStart(execution);

    const graph = execution.taskGraph;
    const completedTaskIds: string[] = [];
    const failedTaskIds: string[] = [];
    const allResults: AgentResult[] = [];

    while (completedTaskIds.length < graph.tasks.length) {
      if (this.cancelledExecutions.has(execution.id)) {
        execution.status = 'cancelled';
        execution.completedAt = this.clock();
        this.runningExecutions.delete(execution.id);
        this.cancelledExecutions.delete(execution.id);
        return execution;
      }

      const readyTasks = this.dispatcher
        .getReadyTasks(graph, completedTaskIds)
        .filter((t) => !completedTaskIds.includes(t.id) && !failedTaskIds.includes(t.id) && t.status === 'pending');

      if (readyTasks.length === 0) {
        const stuck = graph.tasks.filter(
          (t) => !completedTaskIds.includes(t.id) && !failedTaskIds.includes(t.id) && t.status !== 'completed',
        );
        if (stuck.length === 0) break;
        const failedTask = stuck.find((t) => t.status === 'failed');
        if (failedTask) {
          const recoveryResult = this.recoveryManager.recoverAgent(
            failedTask.assignedAgentId ?? '',
            failedTask,
            execution.id,
            organizationId,
          );
          if (recoveryResult.recovered && recoveryResult.agentId) {
            failedTask.assignedAgentId = recoveryResult.agentId;
            failedTask.status = 'pending';
            const checkpoint = recoveryResult.resumedFromCheckpoint;
            if (checkpoint) {
              failedTask.input = { ...failedTask.input, ...checkpoint.intermediateState };
            }
            continue;
          }
          failedTaskIds.push(failedTask.id);
          completedTaskIds.push(failedTask.id);
          this.telemetry.recordEvent('execution_failed', {
            executionId: execution.id,
            failedTaskId: failedTask.id,
          });
          continue;
        }
        break;
      }

      const dispatchResults = await this.dispatcher.dispatchParallel(
        execution.id,
        organizationId,
        readyTasks,
        this.memory.readAll(execution.id),
        executor,
      );

      for (const dr of dispatchResults) {
        if (dr.result && dr.result.success) {
          allResults.push(dr.result);
          completedTaskIds.push(dr.task.id);
          const task = graph.tasks.find((t) => t.id === dr.task.id);
          if (task) {
            this.checkpointManager.save(execution.id, task, dr.agent?.id ?? '', {
              result: dr.result.output,
              completedAt: this.clock(),
            });
          }
        } else if (dr.result && !dr.result.success) {
          allResults.push(dr.result);
          const recoveryResult = this.recoveryManager.recoverAgent(
            dr.agent?.id ?? '',
            dr.task,
            execution.id,
            organizationId,
          );
          if (recoveryResult.recovered && recoveryResult.agentId) {
            dr.task.assignedAgentId = recoveryResult.agentId;
            dr.task.status = 'pending';
            const checkpoint = recoveryResult.resumedFromCheckpoint;
            if (checkpoint) {
              dr.task.input = { ...dr.task.input, ...checkpoint.intermediateState };
            }
          } else {
            failedTaskIds.push(dr.task.id);
            completedTaskIds.push(dr.task.id);
            dr.task.status = 'failed';
          }
        } else {
          failedTaskIds.push(dr.task.id);
          completedTaskIds.push(dr.task.id);
          dr.task.status = 'failed';
        }
      }

      this.commBus.publish({
        executionId: execution.id,
        kind: 'heartbeat',
        fromAgentId: 'coordinator',
        toAgentId: null,
        payload: { completedTasks: completedTaskIds.length, totalTasks: graph.tasks.length },
      });
    }

    const hasFailures = failedTaskIds.length > 0;
    const allSucceeded = allResults.length > 0 && allResults.every((r) => r.success) && !hasFailures;
    execution.status = allSucceeded ? 'completed' : (hasFailures ? 'failed' : 'completed');
    execution.completedAt = this.clock();
    execution.results = allResults;
    execution.checkpoints = this.checkpointManager.getAll(execution.id);

    this.runningExecutions.delete(execution.id);
    this.telemetry.recordEvent('execution_completed', {
      executionId: execution.id,
      success: allSucceeded,
      resultCount: allResults.length,
    });
    this.executionAdapter.notifyExecutionComplete(execution.id, allSucceeded, allResults);

    return execution;
  }

  cancel(executionId: string): boolean {
    if (!this.runningExecutions.has(executionId)) return false;
    this.cancelledExecutions.add(executionId);
    this.commBus.publish({
      executionId,
      kind: 'cancellation',
      fromAgentId: 'coordinator',
      toAgentId: null,
      payload: { reason: 'Execution cancelled by request' },
    });
    return true;
  }

  isRunning(executionId: string): boolean {
    return this.runningExecutions.has(executionId);
  }

  async resumeFromCheckpoint(
    executionId: string,
    organizationId: string,
    executor: TaskExecutorFn,
  ): Promise<AgentExecution> {
    const latestCheckpoint = this.checkpointManager.getLatestExecutionCheckpoint(executionId);
    if (!latestCheckpoint) {
      throw new ExecutionNotFoundError(`No checkpoint found for execution: ${executionId}`);
    }

    const executionState = this.memory.read(executionId, 'execution_state') as AgentExecution | null;
    if (!executionState) {
      throw new ExecutionNotFoundError(`No execution state found for: ${executionId}`);
    }

    executionState.status = 'recovering';
    this.telemetry.recordEvent('execution_resuming', {
      executionId,
      fromCheckpoint: latestCheckpoint.id,
    });

    return this.execute(executionState, organizationId, executor);
  }
}
