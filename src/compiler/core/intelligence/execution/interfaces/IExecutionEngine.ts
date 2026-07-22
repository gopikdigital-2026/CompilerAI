// ─── Execution interfaces ───────────────────────────────────────────────────────

import type { ToolExecutionPlan } from '../../tools/models/ToolExecutionPlan';
import type { ExecutionRequest } from '../models/ExecutionRequest';
import type { ExecutionResult } from '../models/ExecutionResult';
import type { StepResult } from '../models/StepResult';
import type { ExecutionEvent } from '../models/ExecutionEvent';
import type { ExecutionTraceEntry } from '../models/ExecutionTraceEntry';
import type { CompensationRecord } from '../models/CompensationRecord';
import type { RetryConfig, RetryAttempt } from '../models/RetryConfig';
import type { ExecutionMode } from '../models/ExecutionState';
import type { ITelemetryEngine } from '../../telemetry/interfaces/ITelemetryEngine';
import type { IMemoryEngine } from '../../memory/interfaces/IMemoryEngine';

export interface ExecutionEngineDeps {
  idGenerator:  () => string;
  clock:        () => string;
  telemetry?:   ITelemetryEngine | null;
  memory?:      IMemoryEngine | null;
}

export interface IExecutionPolicyValidator {
  validate(request: ExecutionRequest): { valid: boolean; errors: string[] };
}

export interface IToolExecutor {
  executeStep(
    step: ToolExecutionPlan['steps'][number],
    context: { executionId: string; organizationId: string; idempotencyKey: string; attempt: number },
  ): Promise<StepResult>;
  compensate(step: ToolExecutionPlan['steps'][number], context: { executionId: string }): Promise<CompensationRecord>;
}

export interface IRetryManager {
  executeWithRetry<T>(
    fn: () => Promise<{ success: boolean; result: T; error: string | null }>,
    config: RetryConfig,
    stepId: string,
  ): Promise<{ success: boolean; result: T; error: string | null; attempts: RetryAttempt[] }>;
}

export interface ITimeoutManager {
  withTimeout<T>(promise: Promise<T>, stepId: string, timeoutMs: number): Promise<T>;
  isTimedOut(stepId: string): boolean;
  reset(): void;
}

export interface ICompensationManager {
  compensate(
    steps: ToolExecutionPlan['steps'],
    completedStepIds: Set<string>,
    context: { executionId: string; organizationId: string },
  ): Promise<CompensationRecord[]>;
}

export interface IExecutionResultBuilder {
  build(
    executionId: string,
    plan: ToolExecutionPlan,
    mode: ExecutionMode,
    stepResults: StepResult[],
    compensations: CompensationRecord[],
    startedAt: string,
    warnings: string[],
    errors: string[],
  ): ExecutionResult;
}

export interface IExecutionCoordinator {
  execute(request: ExecutionRequest): Promise<ExecutionResult>;
  cancel(executionId: string): boolean;
  isRunning(executionId: string): boolean;
}

export interface IExecutionEngine {
  readonly id: string;
  execute(request: ExecutionRequest): Promise<ExecutionResult>;
  cancel(executionId: string): boolean;
  getEvents(): ExecutionEvent[];
  getTraces(): ExecutionTraceEntry[];
  isRunning(executionId: string): boolean;
}
