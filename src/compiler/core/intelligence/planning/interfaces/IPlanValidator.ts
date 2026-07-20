import type { IntentResult } from '../../intent/models/IntentResult';
import type { ExecutionGraph } from '../models/ExecutionGraph';
import type { PlanValidationResult } from '../models/PlanValidationResult';

// ─── Plan Validator interface ───────────────────────────────────────────────────
// Validates the execution graph for structural and semantic coherence.

export interface IPlanValidator {
  readonly id: string;

  validate(graph: ExecutionGraph, intent: IntentResult): PlanValidationResult;
}
