// ─── OutcomeEvaluator ───────────────────────────────────────────────────────────
// Evaluates execution outcomes to extract learnings.

import type { IOutcomeEvaluator } from '../interfaces/ILearningEngine';
import type { OutcomeEvaluation } from '../models/OutcomeEvaluation';

export class OutcomeEvaluator implements IOutcomeEvaluator {
  private readonly idGenerator: () => string;
  private readonly clock: () => string;

  constructor(idGenerator: () => string, clock: () => string) {
    this.idGenerator = idGenerator;
    this.clock = clock;
  }

  evaluate(input: {
    executionId: string;
    organizationId: string;
    success: boolean;
    stepsSucceeded: number;
    stepsFailed: number;
    rollbackTriggered: boolean;
    durationMs: number;
  }): OutcomeEvaluation {
    const total = input.stepsSucceeded + input.stepsFailed;
    const completionRatio = total > 0 ? input.stepsSucceeded / total : 0;
    const learnings: string[] = [];

    if (input.success) {
      learnings.push('Execution completed successfully — all steps passed.');
    } else if (input.stepsSucceeded > 0 && input.stepsFailed > 0) {
      learnings.push(`Partial failure: ${input.stepsSucceeded} succeeded, ${input.stepsFailed} failed.`);
      learnings.push('Consider reviewing step dependencies and retry policies.');
    } else if (input.stepsFailed > 0 && input.stepsSucceeded === 0) {
      learnings.push('Complete failure — all steps failed.');
      learnings.push('Investigate root cause before retrying.');
    }

    if (input.rollbackTriggered) {
      learnings.push('Rollback was triggered — compensation executed for completed steps.');
    }

    if (input.durationMs > 10000) {
      learnings.push('Execution was slow — consider optimizing step timeouts.');
    }

    return {
      evaluationId: this.idGenerator(),
      organizationId: input.organizationId,
      executionId: input.executionId,
      success: input.success,
      completionRatio,
      stepsSucceeded: input.stepsSucceeded,
      stepsFailed: input.stepsFailed,
      rollbackTriggered: input.rollbackTriggered,
      durationMs: input.durationMs,
      learnings,
      timestamp: this.clock(),
    };
  }
}
