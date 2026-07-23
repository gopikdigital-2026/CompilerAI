import type { AgentTask, AgentCheckpoint, AgentResult } from '../models/AgentModels';
import type { IAgentCheckpointManager } from './AgentCheckpointManager';
import type { IAgentHealthMonitor } from './AgentHealthMonitor';
import type { IAgentLifecycleManager } from './AgentLifecycleManager';
import type { IAgentRegistry } from './AgentRegistry';

export interface RecoveryResult {
  recovered: boolean;
  agentId: string | null;
  error: string | null;
  resumedFromCheckpoint: AgentCheckpoint | null;
}

export interface IAgentRecoveryManager {
  recoverAgent(
    failedAgentId: string,
    task: AgentTask,
    executionId: string,
    organizationId: string,
  ): RecoveryResult;
  compensate(
    executionId: string,
    completedTaskIds: string[],
    results: AgentResult[],
  ): AgentResult[];
  resetAttempts(taskId?: string): void;
}

const MAX_RECOVERY_ATTEMPTS = 2;

export class AgentRecoveryManager implements IAgentRecoveryManager {
  private readonly recoveryAttempts = new Map<string, number>();

  constructor(
    private readonly registry: IAgentRegistry,
    private readonly checkpointManager: IAgentCheckpointManager,
    private readonly healthMonitor: IAgentHealthMonitor,
    private readonly lifecycleManager: IAgentLifecycleManager,
    private readonly clock: () => string,
  ) {}

  recoverAgent(
    failedAgentId: string,
    task: AgentTask,
    executionId: string,
    organizationId: string,
  ): RecoveryResult {
    const attempts = this.recoveryAttempts.get(task.id) ?? 0;
    if (attempts >= MAX_RECOVERY_ATTEMPTS) {
      return {
        recovered: false,
        agentId: null,
        error: `Max recovery attempts (${MAX_RECOVERY_ATTEMPTS}) reached for task ${task.id}`,
        resumedFromCheckpoint: null,
      };
    }
    this.recoveryAttempts.set(task.id, attempts + 1);

    this.healthMonitor.markDead(failedAgentId);
    const failedAgent = this.registry.get(failedAgentId);
    if (failedAgent) {
      this.registry.update(this.lifecycleManager.completeTask(failedAgent, false));
    }

    const checkpoint = this.checkpointManager.getLatest(executionId, task.id);

    const candidates = this.registry.getByOrganization(organizationId).filter(
      (a) =>
        a.id !== failedAgentId &&
        a.status === 'idle' &&
        a.profile.capabilities.some((c) => task.requiredCapabilities.includes(c)),
    );

    if (candidates.length === 0) {
      return {
        recovered: false,
        agentId: null,
        error: `No healthy replacement agent available for task ${task.id}`,
        resumedFromCheckpoint: checkpoint,
      };
    }

    const replacement = candidates[0]!;
    this.registry.update(this.lifecycleManager.assignTask(replacement, task.id));
    this.healthMonitor.recordHeartbeat(replacement.id);

    return {
      recovered: true,
      agentId: replacement.id,
      error: null,
      resumedFromCheckpoint: checkpoint,
    };
  }

  compensate(
    _executionId: string,
    completedTaskIds: string[],
    results: AgentResult[],
  ): AgentResult[] {
    const compensationResults: AgentResult[] = [];
    for (const taskId of completedTaskIds) {
      const originalResult = results.find((r) => r.taskId === taskId);
      if (!originalResult) continue;

      compensationResults.push({
        ...originalResult,
        taskId: `${taskId}_compensation`,
        output: { compensated: true, originalTaskId: taskId },
        error: null,
        success: true,
        startedAt: this.clock(),
        completedAt: this.clock(),
        durationMs: 0,
        cost: 0,
      });
    }
    return compensationResults;
  }

  resetAttempts(taskId?: string): void {
    if (taskId) {
      this.recoveryAttempts.delete(taskId);
    } else {
      this.recoveryAttempts.clear();
    }
  }
}

export { MAX_RECOVERY_ATTEMPTS };
