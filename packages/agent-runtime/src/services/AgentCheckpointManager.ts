import type { AgentCheckpoint, AgentTask } from '../models/AgentModels';

export interface IAgentCheckpointManager {
  save(executionId: string, task: AgentTask, agentId: string, intermediateState: Record<string, unknown>): AgentCheckpoint;
  getLatest(executionId: string, taskId: string): AgentCheckpoint | null;
  getAll(executionId: string): AgentCheckpoint[];
  getAllForTask(executionId: string, taskId: string): AgentCheckpoint[];
  getLatestExecutionCheckpoint(executionId: string): AgentCheckpoint | null;
  clear(): void;
}

export class AgentCheckpointManager implements IAgentCheckpointManager {
  private readonly checkpoints: AgentCheckpoint[] = [];
  private sequenceCounter = 0;

  constructor(
    private readonly idGenerator: () => string,
    private readonly clock: () => string,
  ) {}

  save(
    executionId: string,
    task: AgentTask,
    agentId: string,
    intermediateState: Record<string, unknown>,
  ): AgentCheckpoint {
    const checkpoint: AgentCheckpoint = {
      id: this.idGenerator(),
      executionId,
      taskId: task.id,
      agentId,
      taskStatus: task.status,
      intermediateState,
      timestamp: this.clock(),
      sequenceNumber: this.sequenceCounter++,
    };
    this.checkpoints.push(checkpoint);
    return checkpoint;
  }

  getLatest(executionId: string, taskId: string): AgentCheckpoint | null {
    const taskCheckpoints = this.getAllForTask(executionId, taskId);
    if (taskCheckpoints.length === 0) return null;
    return taskCheckpoints[taskCheckpoints.length - 1]!;
  }

  getAll(executionId: string): AgentCheckpoint[] {
    return this.checkpoints.filter((c) => c.executionId === executionId);
  }

  getAllForTask(executionId: string, taskId: string): AgentCheckpoint[] {
    return this.checkpoints
      .filter((c) => c.executionId === executionId && c.taskId === taskId)
      .sort((a, b) => a.sequenceNumber - b.sequenceNumber);
  }

  getLatestExecutionCheckpoint(executionId: string): AgentCheckpoint | null {
    const execCheckpoints = this.getAll(executionId);
    if (execCheckpoints.length === 0) return null;
    return execCheckpoints.reduce((latest, c) =>
      c.sequenceNumber > latest.sequenceNumber ? c : latest,
    );
  }

  clear(): void {
    this.checkpoints.length = 0;
    this.sequenceCounter = 0;
  }
}
