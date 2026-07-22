// ─── ExecutionCoordinator ──────────────────────────────────────────────────────
// Coordinates execution of a ToolExecutionPlan — sequential or DAG mode.

import type { IExecutionCoordinator } from '../interfaces/IExecutionEngine';
import type { ExecutionRequest } from '../models/ExecutionRequest';
import type { ExecutionResult } from '../models/ExecutionResult';
import type { StepResult } from '../models/StepResult';
import type { CompensationRecord } from '../models/CompensationRecord';
import type { ExecutionTraceEntry } from '../models/ExecutionTraceEntry';
import type { ToolExecutionPlan } from '../../tools/models/ToolExecutionPlan';
import type { ToolExecutor } from './ToolExecutor';
import type { CompensationManager } from './CompensationManager';
import type { ExecutionResultBuilder } from './ExecutionResultBuilder';
import type { ExecutionPolicyValidator } from './ExecutionPolicyValidator';
import type { ExecutionEvent } from '../models/ExecutionEvent';
import type { ExecutionMode } from '../models/ExecutionState';
import { PlanNotApprovedError } from '../errors/ExecutionErrors';
import { shouldTriggerRollback } from '../policies/ExecutionPolicies';

export class ExecutionCoordinator implements IExecutionCoordinator {
  private readonly executor: ToolExecutor;
  private readonly compensationManager: CompensationManager;
  private readonly resultBuilder: ExecutionResultBuilder;
  private readonly policyValidator: ExecutionPolicyValidator;
  private readonly idGenerator: () => string;
  private readonly clock: () => string;
  private readonly runningExecutions = new Map<string, { cancelRequested: boolean }>();
  private readonly events: ExecutionEvent[] = [];
  private readonly traces: ExecutionTraceEntry[] = [];

  constructor(
    executor: ToolExecutor,
    compensationManager: CompensationManager,
    resultBuilder: ExecutionResultBuilder,
    policyValidator: ExecutionPolicyValidator,
    idGenerator: () => string,
    clock: () => string,
  ) {
    this.executor = executor;
    this.compensationManager = compensationManager;
    this.resultBuilder = resultBuilder;
    this.policyValidator = policyValidator;
    this.idGenerator = idGenerator;
    this.clock = clock;
  }

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    // Validate policy
    const validation = this.policyValidator.validate(request);
    if (!validation.valid) {
      throw new PlanNotApprovedError(request.plan.planId);
    }

    const executionId = this.idGenerator();
    const startedAt = this.clock();
    const mode: ExecutionMode = request.mode;
    const warnings: string[] = [...request.plan.warnings];
    const errors: string[] = [];
    const stepResults: StepResult[] = [];
    const completedStepIds = new Set<string>();

    this.runningExecutions.set(executionId, { cancelRequested: false });
    this.emitEvent('ExecutionStarted', executionId, request.plan.organizationId, `Execution started for plan ${request.plan.planId}.`, null);

    // Execute steps
    if (mode === 'DAG') {
      await this.executeDag(request.plan, request, executionId, stepResults, completedStepIds, warnings, errors);
    } else {
      await this.executeSequential(request.plan, request, executionId, stepResults, completedStepIds, warnings, errors);
    }

    // Check for cancellation
    const cancelRequested = this.runningExecutions.get(executionId)?.cancelRequested ?? false;

    // Handle remaining steps if cancelled
    if (cancelRequested) {
      for (const step of request.plan.steps) {
        if (!completedStepIds.has(step.stepId) && !stepResults.some(sr => sr.stepId === step.stepId)) {
          stepResults.push({
            stepId: step.stepId, toolId: step.toolId, toolName: step.toolName,
            state: 'CANCELLED', startedAt: this.clock(), completedAt: this.clock(),
            output: null, error: 'Execution cancelled.', attempts: 0, compensated: false,
            idempotencyKey: '', durationMs: 0,
          });
        }
      }
      this.emitEvent('ExecutionCancelled', executionId, request.plan.organizationId, 'Execution cancelled by request.', null);
    }

    // Trigger compensation if needed
    let compensations: CompensationRecord[] = [];
    const failedSteps = stepResults.filter(s => s.state === 'FAILED').length;
    const completedSteps = stepResults.filter(s => s.state === 'COMPLETED').length;

    if (!cancelRequested && shouldTriggerRollback(completedSteps, failedSteps, request.allowRollback)) {
      this.emitEvent('RollbackTriggered', executionId, request.plan.organizationId, `Rollback triggered: ${failedSteps} failed, ${completedSteps} completed.`, null);
      compensations = await this.compensationManager.compensate(
        request.plan.steps,
        completedStepIds,
        { executionId, organizationId: request.plan.organizationId },
      );
      for (const comp of compensations) {
        this.emitEvent('StepCompensated', executionId, request.plan.organizationId, `Compensated step ${comp.stepId}.`, comp.stepId);
      }
    }

    this.runningExecutions.delete(executionId);

    const finalState = cancelRequested ? 'CANCELLED' : undefined;
    const result = this.resultBuilder.build(
      executionId, request.plan, mode, stepResults, compensations, startedAt, warnings, errors,
    );

    if (finalState === 'CANCELLED') {
      return { ...result, state: 'CANCELLED' };
    }

    if (result.state === 'COMPLETED') {
      this.emitEvent('ExecutionCompleted', executionId, request.plan.organizationId, `Execution completed: ${result.completedSteps} steps.`, null);
    } else if (result.state === 'PARTIAL') {
      this.emitEvent('ExecutionPartial', executionId, request.plan.organizationId, `Execution partial: ${result.completedSteps} completed, ${result.failedSteps} failed.`, null);
    } else if (result.state === 'FAILED') {
      this.emitEvent('ExecutionFailed', executionId, request.plan.organizationId, `Execution failed: ${result.failedSteps} failed.`, null);
    }

    return result;
  }

  cancel(executionId: string): boolean {
    const exec = this.runningExecutions.get(executionId);
    if (exec) {
      exec.cancelRequested = true;
      return true;
    }
    return false;
  }

  isRunning(executionId: string): boolean {
    return this.runningExecutions.has(executionId);
  }

  getEvents(): ExecutionEvent[] {
    return [...this.events];
  }

  getTraces(): ExecutionTraceEntry[] {
    return [...this.traces];
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  private async executeSequential(
    plan: ToolExecutionPlan,
    request: ExecutionRequest,
    executionId: string,
    stepResults: StepResult[],
    completedStepIds: Set<string>,
    _warnings: string[],
    errors: string[],
  ): Promise<void> {
    for (const step of plan.steps) {
      if (this.runningExecutions.get(executionId)?.cancelRequested) break;

      this.emitEvent('StepStarted', executionId, plan.organizationId, `Step ${step.order}: ${step.toolName}.`, step.stepId);
      this.addTrace(executionId, step.stepId, step.toolId, 'RUNNING', `Step started: ${step.toolName}.`);

      const result = await this.executor.executeWithRetryAndTimeout(
        step,
        { executionId, organizationId: plan.organizationId, prefix: request.idempotencyPrefix },
        { maxRetries: request.maxRetries, baseDelayMs: 10, exponential: true },
        request.stepTimeoutMs,
      );

      stepResults.push(result);

      if (result.state === 'COMPLETED') {
        completedStepIds.add(step.stepId);
        this.emitEvent('StepCompleted', executionId, plan.organizationId, `Step ${step.toolName} completed.`, step.stepId);
        this.addTrace(executionId, step.stepId, step.toolId, 'COMPLETED', `Step completed: ${step.toolName}.`);
      } else {
        errors.push(result.error ?? `Step ${step.stepId} failed.`);
        this.emitEvent('StepFailed', executionId, plan.organizationId, `Step ${step.toolName} failed: ${result.error}`, step.stepId);
        this.addTrace(executionId, step.stepId, step.toolId, 'FAILED', `Step failed: ${result.error}`);
        // Stop on first failure in sequential mode
        break;
      }
    }
  }

  private async executeDag(
    plan: ToolExecutionPlan,
    request: ExecutionRequest,
    executionId: string,
    stepResults: StepResult[],
    completedStepIds: Set<string>,
    _warnings: string[],
    errors: string[],
  ): Promise<void> {
    // For DAG mode, execute all steps in parallel (simulated — no real dependencies in the plan)
    // In production, this would respect the execution graph dependencies
    const steps = plan.steps;

    // Group steps by their order field — steps with same order run in parallel
    const orderGroups = new Map<number, typeof steps>();
    for (const step of steps) {
      if (!orderGroups.has(step.order)) orderGroups.set(step.order, []);
      orderGroups.get(step.order)!.push(step);
    }

    const sortedOrders = Array.from(orderGroups.keys()).sort((a, b) => a - b);

    for (const order of sortedOrders) {
      if (this.runningExecutions.get(executionId)?.cancelRequested) break;

      const group = orderGroups.get(order)!;
      const promises = group.map(async step => {
        if (this.runningExecutions.get(executionId)?.cancelRequested) {
          return {
            stepId: step.stepId, toolId: step.toolId, toolName: step.toolName,
            state: 'CANCELLED' as const, startedAt: this.clock(), completedAt: this.clock(),
            output: null, error: 'Execution cancelled.', attempts: 0, compensated: false,
            idempotencyKey: '', durationMs: 0,
          } as StepResult;
        }

        this.emitEvent('StepStarted', executionId, plan.organizationId, `Step ${step.order}: ${step.toolName}.`, step.stepId);
        this.addTrace(executionId, step.stepId, step.toolId, 'RUNNING', `Step started: ${step.toolName}.`);

        const result = await this.executor.executeWithRetryAndTimeout(
          step,
          { executionId, organizationId: plan.organizationId, prefix: request.idempotencyPrefix },
          { maxRetries: request.maxRetries, baseDelayMs: 10, exponential: true },
          request.stepTimeoutMs,
        );

        if (result.state === 'COMPLETED') {
          completedStepIds.add(step.stepId);
          this.emitEvent('StepCompleted', executionId, plan.organizationId, `Step ${step.toolName} completed.`, step.stepId);
          this.addTrace(executionId, step.stepId, step.toolId, 'COMPLETED', `Step completed: ${step.toolName}.`);
        } else {
          errors.push(result.error ?? `Step ${step.stepId} failed.`);
          this.emitEvent('StepFailed', executionId, plan.organizationId, `Step ${step.toolName} failed: ${result.error}`, step.stepId);
          this.addTrace(executionId, step.stepId, step.toolId, 'FAILED', `Step failed: ${result.error}`);
        }

        return result;
      });

      const results = await Promise.all(promises);
      stepResults.push(...results);
    }
  }

  private emitEvent(
    eventType: ExecutionEvent['eventType'],
    executionId: string,
    organizationId: string,
    summary: string,
    stepId: string | null,
  ): void {
    this.events.push({
      eventId: this.idGenerator(),
      eventType,
      executionId,
      organizationId,
      timestamp: this.clock(),
      summary,
      stepId,
      state: null,
      metadata: {},
    });
  }

  private addTrace(
    executionId: string,
    stepId: string,
    toolId: string,
    state: ExecutionTraceEntry['state'],
    message: string,
  ): void {
    this.traces.push({
      traceId: this.idGenerator(),
      executionId,
      stepId,
      toolId,
      state,
      timestamp: this.clock(),
      message,
      attempt: 0,
      metadata: {},
    });
  }
}
