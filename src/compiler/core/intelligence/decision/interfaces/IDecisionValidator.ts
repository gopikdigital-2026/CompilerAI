import type { ExecutionPlan } from '../../planning/models/ExecutionPlan';
import type { DecisionItem } from '../models/DecisionItem';
import type { DecisionValidationResult } from '../models/DecisionValidationResult';

// ─── Decision Validator interface ──────────────────────────────────────────────
// Validates the decision result for structural and semantic coherence.

export interface IDecisionValidator {
  readonly id: string;
  validate(decisions: DecisionItem[], plan: ExecutionPlan): DecisionValidationResult;
}
