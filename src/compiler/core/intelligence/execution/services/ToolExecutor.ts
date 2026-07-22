// ─── ToolExecutor ───────────────────────────────────────────────────────────────
// Executes individual tool steps with idempotency, retry, and timeout support.

import type { IToolExecutor } from '../interfaces/IExecutionEngine';
import type { IRetryManager } from '../interfaces/IExecutionEngine';
import type { ITimeoutManager } from '../interfaces/IExecutionEngine';
import type { ToolExecutionPlan } from '../../tools/models/ToolExecutionPlan';
import type { StepResult } from '../models/StepResult';
import type { CompensationRecord } from '../models/CompensationRecord';
import type { RetryConfig } from '../models/RetryConfig';
import { computeIdempotencyKey } from '../policies/ExecutionPolicies';
import { IdempotencyViolationError } from '../errors/ExecutionErrors';

export class ToolExecutor implements IToolExecutor {
  private readonly adapter: IToolExecutor;
  private readonly retryManager: IRetryManager;
  private readonly timeoutManager: ITimeoutManager;
  private readonly clock: () => string;
  private readonly executedKeys = new Set<string>();
  private attemptCounter = 0;

  constructor(
    adapter: IToolExecutor,
    retryManager: IRetryManager,
    timeoutManager: ITimeoutManager,
    _idGenerator: () => string,
    clock: () => string,
  ) {
    this.adapter = adapter;
    this.retryManager = retryManager;
    this.timeoutManager = timeoutManager;
    this.clock = clock;
  }

  async executeStep(
    step: ToolExecutionPlan['steps'][number],
    context: { executionId: string; organizationId: string; idempotencyKey: string; attempt: number },
  ): Promise<StepResult> {
    if (this.executedKeys.has(context.idempotencyKey)) {
      throw new IdempotencyViolationError(step.stepId);
    }

    const result = await this.adapter.executeStep(step, context);

    if (result.state === 'COMPLETED') {
      this.executedKeys.add(context.idempotencyKey);
    }

    return result;
  }

  async executeWithRetryAndTimeout(
    step: ToolExecutionPlan['steps'][number],
    context: { executionId: string; organizationId: string; prefix: string },
    retryConfig: RetryConfig,
    timeoutMs: number,
  ): Promise<StepResult> {
    const idempotencyKey = computeIdempotencyKey(context.prefix, context.executionId, step.stepId);
    this.attemptCounter = 0;

    const outcome = await this.retryManager.executeWithRetry(
      async () => {
        this.attemptCounter++;
        const attempt = this.attemptCounter;
        try {
          const result = await this.timeoutManager.withTimeout(
            this.executeStep(step, {
              executionId: context.executionId,
              organizationId: context.organizationId,
              idempotencyKey,
              attempt,
            }),
            step.stepId,
            timeoutMs,
          );
          return { success: result.state === 'COMPLETED', result, error: result.error };
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          const failedResult: StepResult = {
            stepId: step.stepId,
            toolId: step.toolId,
            toolName: step.toolName,
            state: 'FAILED',
            startedAt: this.clock(),
            completedAt: this.clock(),
            output: null,
            error: errorMsg,
            attempts: attempt,
            compensated: false,
            idempotencyKey,
            durationMs: 0,
          };
          return { success: false, result: failedResult, error: errorMsg };
        }
      },
      retryConfig,
      step.stepId,
    );

    return outcome.result;
  }

  async compensate(step: ToolExecutionPlan['steps'][number], context: { executionId: string }): Promise<CompensationRecord> {
    return this.adapter.compensate(step, context);
  }

  resetIdempotency(): void {
    this.executedKeys.clear();
  }
}
