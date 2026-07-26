import type {
  AgentMetrics,
  ExecutionResult,
  IAnalyticsEngine,
  TaskResult,
  WorkflowAnalytics,
} from '../models.js';

export class AnalyticsEngine implements IAnalyticsEngine {
  private readonly results: ExecutionResult[] = [];

  recordResult(result: ExecutionResult): void {
    this.results.push(result);
  }

  getAgentMetrics(agentId: string): AgentMetrics {
    const taskResults = this.results.flatMap((r) => r.results.filter((t) => t.agentId === agentId));
    return this.computeMetrics(agentId, taskResults);
  }

  getAllAgentMetrics(): AgentMetrics[] {
    const agentIds = new Set(this.results.flatMap((r) => r.results.map((t) => t.agentId)));
    return Array.from(agentIds).map((id) => this.getAgentMetrics(id));
  }

  getWorkflowAnalytics(): WorkflowAnalytics {
    const total = this.results.length;
    const completed = this.results.filter((r) => r.success).length;
    const failed = total - completed;
    const avgCost = total > 0 ? this.results.reduce((s, r) => s + r.totalCost, 0) / total : 0;
    const avgDuration = total > 0 ? this.results.reduce((s, r) => s + r.totalDurationMs, 0) / total : 0;
    const approvalResults = this.results.filter((r) =>
      r.timeline.some((t) => t.type === 'approval_requested'),
    );

    return {
      totalWorkflows: total,
      completedWorkflows: completed,
      failedWorkflows: failed,
      averageCost: avgCost,
      averageDurationMs: avgDuration,
      averageSuccessProbability: 0,
      approvalRate: total > 0 ? approvalResults.length / total : 0,
    };
  }

  clear(): void {
    this.results.length = 0;
  }

  private computeMetrics(agentId: string, taskResults: TaskResult[]): AgentMetrics {
    const completed = taskResults.filter((t) => t.status === 'completed');
    const failed = taskResults.filter((t) => t.status === 'failed');
    const total = taskResults.length;
    const avgConfidence = completed.length > 0
      ? completed.reduce((s, t) => s + t.confidence, 0) / completed.length
      : 0;
    const avgDuration = completed.length > 0
      ? completed.reduce((s, t) => s + t.durationMs, 0) / completed.length
      : 0;
    const totalCost = taskResults.reduce((s, t) => s + t.cost, 0);

    return {
      agentId,
      tasksCompleted: completed.length,
      tasksFailed: failed.length,
      averageConfidence: avgConfidence,
      averageDurationMs: avgDuration,
      totalCost,
      successRate: total > 0 ? completed.length / total : 0,
    };
  }
}
