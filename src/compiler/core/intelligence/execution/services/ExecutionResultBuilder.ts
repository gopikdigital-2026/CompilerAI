// ─── ExecutionResultBuilder ─────────────────────────────────────────────────────
// Builds the final ExecutionResult from step results and compensations.

import type { IExecutionResultBuilder } from '../interfaces/IExecutionEngine';
import type { ExecutionResult } from '../models/ExecutionResult';
import type { StepResult } from '../models/StepResult';
import type { CompensationRecord } from '../models/CompensationRecord';
import type { ToolExecutionPlan } from '../../tools/models/ToolExecutionPlan';
import type { ExecutionMode } from '../models/ExecutionState';
import { deriveExecutionState, shouldTriggerRollback } from '../policies/ExecutionPolicies';

const VERSION = '1.0.0';

export class ExecutionResultBuilder implements IExecutionResultBuilder {
  private readonly clock: () => string;

  constructor(clock: () => string) {
    this.clock = clock;
  }

  build(
    executionId: string,
    plan: ToolExecutionPlan,
    mode: ExecutionMode,
    stepResults: StepResult[],
    compensations: CompensationRecord[],
    startedAt: string,
    warnings: string[],
    errors: string[],
  ): ExecutionResult {
    const completedSteps = stepResults.filter(s => s.state === 'COMPLETED').length;
    const failedSteps = stepResults.filter(s => s.state === 'FAILED').length;
    const cancelledSteps = stepResults.filter(s => s.state === 'CANCELLED').length;
    const compensatedSteps = compensations.filter(c => c.success).length;
    const rollbackTriggered = shouldTriggerRollback(completedSteps, failedSteps, compensations.length > 0);

    const state = deriveExecutionState(
      stepResults.length,
      completedSteps,
      failedSteps,
      cancelledSteps,
    );

    const totalDurationMs = Date.now() - new Date(startedAt).getTime();

    return {
      executionId,
      planId: plan.planId,
      organizationId: plan.organizationId,
      state,
      mode,
      stepResults,
      completedSteps,
      failedSteps,
      compensatedSteps,
      rollbackTriggered,
      startedAt,
      completedAt: this.clock(),
      totalDurationMs,
      warnings,
      errors,
      version: VERSION,
    };
  }
}
