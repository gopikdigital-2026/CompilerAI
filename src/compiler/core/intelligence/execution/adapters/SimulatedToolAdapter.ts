// ─── SimulatedToolAdapter ───────────────────────────────────────────────────────
// Simulated tool adapter — no real APIs, deterministic outcomes.
// Configurable per-tool behavior for testing different scenarios.

import type { ToolExecutionPlan } from '../../tools/models/ToolExecutionPlan';
import type { StepResult } from '../models/StepResult';
import type { CompensationRecord } from '../models/CompensationRecord';
import type { IToolExecutor } from '../interfaces/IExecutionEngine';
import type { StepState } from '../models/ExecutionState';

export interface SimulatedToolConfig {
  /** Tools that should fail on every attempt. */
  alwaysFailToolIds: string[];
  /** Tools that should fail on first N attempts then succeed. */
  failThenSucceed: Map<string, number>;
  /** Tools that should timeout. */
  timeoutToolIds: string[];
  /** Simulated delay per step in ms (real delay, but small). */
  stepDelayMs: number;
  /** Whether compensation should succeed. */
  compensationSucceeds: boolean;
}

const DEFAULT_CONFIG: SimulatedToolConfig = {
  alwaysFailToolIds: [],
  failThenSucceed: new Map(),
  timeoutToolIds: [],
  stepDelayMs: 0,
  compensationSucceeds: true,
};

export class SimulatedToolAdapter implements IToolExecutor {
  private readonly config: SimulatedToolConfig;
  private readonly idGenerator: () => string;
  private readonly clock: () => string;
  private readonly attemptCounts = new Map<string, number>();

  constructor(
    idGenerator: () => string,
    clock: () => string,
    config?: Partial<SimulatedToolConfig>,
  ) {
    this.idGenerator = idGenerator;
    this.clock = clock;
    this.config = { ...DEFAULT_CONFIG, ...config, failThenSucceed: config?.failThenSucceed ?? new Map() };
  }

  async executeStep(
    step: ToolExecutionPlan['steps'][number],
    context: { executionId: string; organizationId: string; idempotencyKey: string; attempt: number },
  ): Promise<StepResult> {
    const startedAt = this.clock();
    const startMs = Date.now();
    const stepKey = `${context.executionId}:${step.stepId}`;
    const attempts = (this.attemptCounts.get(stepKey) ?? 0) + 1;
    this.attemptCounts.set(stepKey, attempts);

    // Simulate delay
    if (this.config.stepDelayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, this.config.stepDelayMs));
    }

    // Check if this tool should timeout
    if (this.config.timeoutToolIds.includes(step.toolId)) {
      // Simulate timeout by returning a FAILED state — the TimeoutManager handles actual timeout
      return this.makeFailed(step, context.attempt, startedAt, startMs, `Simulated timeout for ${step.toolId}`);
    }

    // Check if this tool always fails
    if (this.config.alwaysFailToolIds.includes(step.toolId)) {
      return this.makeFailed(step, context.attempt, startedAt, startMs, `Tool ${step.toolId} always fails (simulated).`);
    }

    // Check fail-then-succeed pattern
    const failCount = this.config.failThenSucceed.get(step.toolId);
    if (failCount !== undefined && attempts <= failCount) {
      return this.makeFailed(step, context.attempt, startedAt, startMs, `Tool ${step.toolId} fails on attempt ${attempts} (simulated).`);
    }

    // Success
    return {
      stepId: step.stepId,
      toolId: step.toolId,
      toolName: step.toolName,
      state: 'COMPLETED' as StepState,
      startedAt,
      completedAt: this.clock(),
      output: { simulated: true, capabilities: step.expectedCapabilities, attempt: context.attempt },
      error: null,
      attempts: context.attempt,
      compensated: false,
      idempotencyKey: context.idempotencyKey,
      durationMs: Date.now() - startMs,
    };
  }

  async compensate(
    step: ToolExecutionPlan['steps'][number],
    context: { executionId: string },
  ): Promise<CompensationRecord> {
    const timestamp = this.clock();
    if (!this.config.compensationSucceeds) {
      return {
        compensationId: this.idGenerator(),
        executionId: context.executionId,
        stepId: step.stepId,
        toolId: step.toolId,
        reason: 'Compensation failed (simulated).',
        success: false,
        timestamp,
        actions: [],
      };
    }
    return {
      compensationId: this.idGenerator(),
      executionId: context.executionId,
      stepId: step.stepId,
      toolId: step.toolId,
      reason: 'Rollback triggered by partial failure.',
      success: true,
      timestamp,
      actions: [`Reverted side effects of ${step.toolName}`, `Released resources for ${step.toolId}`],
    };
  }

  private makeFailed(
    step: ToolExecutionPlan['steps'][number],
    attempt: number,
    startedAt: string,
    startMs: number,
    error: string,
  ): StepResult {
    return {
      stepId: step.stepId,
      toolId: step.toolId,
      toolName: step.toolName,
      state: 'FAILED' as StepState,
      startedAt,
      completedAt: this.clock(),
      output: null,
      error,
      attempts: attempt,
      compensated: false,
      idempotencyKey: '',
      durationMs: Date.now() - startMs,
    };
  }
}
