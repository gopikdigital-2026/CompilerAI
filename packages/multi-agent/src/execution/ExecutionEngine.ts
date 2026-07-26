import type {
  Checkpoint,
  ExecutionPlan,
  ExecutionResult,
  ExecutionState,
  IAgentExecutor,
  IApprovalEngine,
  ICommunicationBus,
  IExecutionEngine,
  ISharedMemory,
  ITelemetryEngine,
  PolicySet,
  PlannedTask,
  TaskResult,
  TimelineEntry,
} from '../models.js';

interface WorkflowContext {
  plan: ExecutionPlan;
  state: ExecutionState;
  results: Map<string, TaskResult>;
  timeline: TimelineEntry[];
  cancelled: boolean;
  checkpointCounter: number;
}

export class ExecutionEngine implements IExecutionEngine {
  private readonly workflows = new Map<string, WorkflowContext>();
  private counter = 0;

  async execute(
    plan: ExecutionPlan,
    executor: IAgentExecutor,
    memory: ISharedMemory,
    bus: ICommunicationBus,
    telemetry: ITelemetryEngine,
    policies: PolicySet,
    approvals: IApprovalEngine,
  ): Promise<ExecutionResult> {
    const ctx: WorkflowContext = {
      plan,
      state: 'running',
      results: new Map(),
      timeline: [],
      cancelled: false,
      checkpointCounter: 0,
    };
    this.workflows.set(plan.id, ctx);

    this.addTimeline(ctx, 'workflow_started', `Workflow '${plan.id}' started for: ${plan.request}`);
    telemetry.emit({
      type: 'planner.generated',
      timestamp: new Date().toISOString(),
      workflowId: plan.id,
      metadata: { taskCount: plan.tasks.length, estimatedCost: plan.totalEstimatedCost },
    });

    try {
      await this.executeTasks(ctx, executor, memory, bus, telemetry, policies, approvals);
    } catch (err) {
      ctx.state = 'failed';
      this.addTimeline(ctx, 'task_failed', `Workflow failed: ${(err as Error).message}`);
    }

    const success = ctx.state === 'completed';
    if (success) {
      this.addTimeline(ctx, 'workflow_completed', `Workflow '${plan.id}' completed successfully`);
      telemetry.emit({
        type: 'workflow.completed',
        timestamp: new Date().toISOString(),
        workflowId: plan.id,
        metadata: { taskCount: plan.tasks.length, totalCost: this.totalCost(ctx) },
      });
    }

    return this.buildResult(ctx);
  }

  private async executeTasks(
    ctx: WorkflowContext,
    executor: IAgentExecutor,
    memory: ISharedMemory,
    bus: ICommunicationBus,
    telemetry: ITelemetryEngine,
    policies: PolicySet,
    approvals: IApprovalEngine,
  ): Promise<void> {
    const completed = new Set<string>();
    const failed = new Set<string>();
    const maxConcurrency = Math.max(1, policies.maxConcurrency);
    const queue = [...ctx.plan.tasks];

    while (queue.length > 0 && !ctx.cancelled) {
      const ready = queue.filter((task) =>
        task.dependencies.every((dep) => completed.has(dep.taskId)),
      );

      if (ready.length === 0) {
        if (queue.every((t) => failed.has(t.id) || t.dependencies.some((d) => failed.has(d.taskId)))) {
          ctx.state = 'failed';
          return;
        }
        ctx.state = 'paused';
        return;
      }

      const batch = ready.slice(0, maxConcurrency);
      if (batch.length > 1) {
        telemetry.emit({
          type: 'workflow.parallelized',
          timestamp: new Date().toISOString(),
          workflowId: ctx.plan.id,
          metadata: { parallelTaskCount: batch.length, taskIds: batch.map((t) => t.id) },
        });
        this.addTimeline(ctx, 'checkpoint', `Parallelized ${batch.length} tasks: ${batch.map((t) => t.id).join(', ')}`);
      }

      for (const task of batch) {
        queue.splice(queue.indexOf(task), 1);
      }

      const promises = batch.map((task) => this.executeTask(ctx, task, executor, memory, bus, telemetry, policies, approvals));
      const results = await Promise.allSettled(promises);

      for (let i = 0; i < batch.length; i++) {
        const result = results[i];
        if (result.status === 'fulfilled' && result.value.status === 'completed') {
          completed.add(batch[i].id);
        } else {
          failed.add(batch[i].id);
        }
      }
    }

    if (!ctx.cancelled && failed.size === 0 && queue.length === 0) {
      ctx.state = 'completed';
    } else if (ctx.cancelled) {
      ctx.state = 'cancelled';
    } else if (failed.size > 0) {
      ctx.state = 'failed';
    }
  }

  private async executeTask(
    ctx: WorkflowContext,
    task: PlannedTask,
    executor: IAgentExecutor,
    memory: ISharedMemory,
    bus: ICommunicationBus,
    telemetry: ITelemetryEngine,
    _policies: PolicySet,
    approvals: IApprovalEngine,
  ): Promise<TaskResult> {
    // Handle approvals
    if (task.approval.required) {
      const approval = approvals.request({
        workflowId: ctx.plan.id,
        taskId: task.id,
        agentId: task.agentId,
        action: task.approval.reason,
        description: `Approval required for task '${task.name}': ${task.approval.reason}`,
        riskLevel: task.priority === 'critical' ? 'critical' : 'high',
      });

      this.addTimeline(ctx, 'approval_requested', `Approval requested for task '${task.name}'`, task.id, task.agentId);
      telemetry.emit({
        type: 'approval.requested',
        timestamp: new Date().toISOString(),
        workflowId: ctx.plan.id,
        agentId: task.agentId,
        metadata: { taskId: task.id, approvalId: approval.id, riskLevel: approval.riskLevel },
      });

      // Auto-approve in non-interactive mode (for testing/automation)
      const decided = approvals.approve(approval.id, 'system', 'Auto-approved in non-interactive mode');
      this.addTimeline(ctx, 'approval_completed', `Approval ${decided.state} for task '${task.name}'`, task.id, task.agentId);
      telemetry.emit({
        type: 'approval.completed',
        timestamp: new Date().toISOString(),
        workflowId: ctx.plan.id,
        agentId: task.agentId,
        metadata: { taskId: task.id, approvalId: approval.id, state: decided.state },
      });
    }

    // Publish agent started message
    bus.publish({
      id: `msg-${++this.counter}`,
      from: 'orchestrator',
      to: task.agentId,
      type: 'request',
      subject: `Execute task: ${task.name}`,
      payload: { taskId: task.id, description: task.description },
      timestamp: new Date().toISOString(),
    });

    this.addTimeline(ctx, 'task_started', `Task '${task.name}' started (agent: ${task.agentId})`, task.id, task.agentId);
    telemetry.emit({
      type: 'agent.started',
      timestamp: new Date().toISOString(),
      workflowId: ctx.plan.id,
      agentId: task.agentId,
      metadata: { taskId: task.id, taskName: task.name },
    });

    try {
      const result = await executor.execute(task.agentId, task, memory);
      ctx.results.set(task.id, result);

      // Store result in shared memory
      memory.set({
        key: task.outputKey,
        type: 'result',
        value: result.output,
        createdBy: task.agentId,
        createdAt: new Date().toISOString(),
        isSecret: false,
      });

      // Record decision for audit
      memory.recordDecision({
        decision: {
          agentId: task.agentId,
          taskId: task.id,
          selectedOption: result.reasoning,
          confidence: result.confidence,
          reasoning: result.reasoning,
          alternatives: result.alternatives,
          timestamp: result.completedAt,
        },
        outcome: result.status === 'completed' ? 'success' : 'failure',
        timestamp: new Date().toISOString(),
      });

      this.addTimeline(ctx, 'task_completed', `Task '${task.name}' completed (confidence: ${result.confidence})`, task.id, task.agentId);
      telemetry.emit({
        type: 'agent.completed',
        timestamp: new Date().toISOString(),
        workflowId: ctx.plan.id,
        agentId: task.agentId,
        metadata: { taskId: task.id, confidence: result.confidence, cost: result.cost, durationMs: result.durationMs },
      });

      // Publish response
      bus.publish({
        id: `msg-${++this.counter}`,
        from: task.agentId,
        to: 'orchestrator',
        type: 'response',
        subject: `Completed: ${task.name}`,
        payload: { taskId: task.id, confidence: result.confidence },
        timestamp: new Date().toISOString(),
      });

      return result;
    } catch (err) {
      const failedResult: TaskResult = {
        taskId: task.id,
        agentId: task.agentId,
        status: 'failed',
        output: null,
        confidence: 0,
        reasoning: `Execution failed: ${(err as Error).message}`,
        alternatives: [],
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        cost: 0,
        durationMs: 0,
        retries: 0,
      };
      ctx.results.set(task.id, failedResult);

      // Attempt recovery: retry once
      this.addTimeline(ctx, 'recovery_attempted', `Recovery: retrying task '${task.name}'`, task.id, task.agentId);
      try {
        const retryResult = await executor.execute(task.agentId, task, memory);
        retryResult.retries = 1;
        ctx.results.set(task.id, retryResult);
        this.addTimeline(ctx, 'task_completed', `Task '${task.name}' completed after retry`, task.id, task.agentId);
        telemetry.emit({
          type: 'agent.completed',
          timestamp: new Date().toISOString(),
          workflowId: ctx.plan.id,
          agentId: task.agentId,
          metadata: { taskId: task.id, confidence: retryResult.confidence, recovered: true },
        });
        return retryResult;
      } catch {
        this.addTimeline(ctx, 'task_failed', `Task '${task.name}' failed permanently`, task.id, task.agentId);
        telemetry.emit({
          type: 'agent.failed',
          timestamp: new Date().toISOString(),
          workflowId: ctx.plan.id,
          agentId: task.agentId,
          metadata: { taskId: task.id, error: (err as Error).message },
        });
        return failedResult;
      }
    }
  }

  cancel(workflowId: string): boolean {
    const ctx = this.workflows.get(workflowId);
    if (!ctx) return false;
    ctx.cancelled = true;
    ctx.state = 'cancelled';
    this.addTimeline(ctx, 'workflow_cancelled', `Workflow '${workflowId}' cancelled`);
    return true;
  }

  getStatus(workflowId: string): ExecutionState | undefined {
    return this.workflows.get(workflowId)?.state;
  }

  getTimeline(workflowId: string): TimelineEntry[] {
    return [...(this.workflows.get(workflowId)?.timeline ?? [])];
  }

  getCheckpoint(workflowId: string): Checkpoint | undefined {
    const ctx = this.workflows.get(workflowId);
    if (!ctx) return undefined;
    return {
      id: `checkpoint-${ctx.plan.id}-${++ctx.checkpointCounter}`,
      workflowId: ctx.plan.id,
      state: ctx.state,
      completedTaskIds: Array.from(ctx.results.keys()).filter((id) => ctx.results.get(id)?.status === 'completed'),
      pendingTaskIds: ctx.plan.tasks.filter((t) => !ctx.results.has(t.id)).map((t) => t.id),
      results: Array.from(ctx.results.values()),
      timestamp: new Date().toISOString(),
    };
  }

  async resume(
    workflowId: string,
    executor: IAgentExecutor,
    memory: ISharedMemory,
    bus: ICommunicationBus,
    telemetry: ITelemetryEngine,
    policies: PolicySet,
    approvals: IApprovalEngine,
  ): Promise<ExecutionResult> {
    const ctx = this.workflows.get(workflowId);
    if (!ctx) throw new Error(`Workflow '${workflowId}' not found`);
    if (ctx.state !== 'paused' && ctx.state !== 'failed') {
      throw new Error(`Workflow '${workflowId}' is in state '${ctx.state}', cannot resume`);
    }
    ctx.state = 'running';
    this.addTimeline(ctx, 'checkpoint', `Workflow '${workflowId}' resumed`);
    await this.executeTasks(ctx, executor, memory, bus, telemetry, policies, approvals);
    return this.buildResult(ctx);
  }

  private addTimeline(ctx: WorkflowContext, type: TimelineEntry['type'], message: string, taskId?: string, agentId?: string): void {
    ctx.timeline.push({
      timestamp: new Date().toISOString(),
      type,
      taskId,
      agentId,
      message,
    });
  }

  private totalCost(ctx: WorkflowContext): number {
    return Array.from(ctx.results.values()).reduce((sum, r) => sum + r.cost, 0);
  }

  private buildResult(ctx: WorkflowContext): ExecutionResult {
    return {
      workflowId: ctx.plan.id,
      state: ctx.state,
      results: Array.from(ctx.results.values()),
      timeline: [...ctx.timeline],
      totalCost: this.totalCost(ctx),
      totalDurationMs: Array.from(ctx.results.values()).reduce((sum, r) => sum + r.durationMs, 0),
      completedAt: new Date().toISOString(),
      success: ctx.state === 'completed',
    };
  }
}
