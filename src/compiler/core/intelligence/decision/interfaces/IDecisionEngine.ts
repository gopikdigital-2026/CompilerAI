import type { DecisionRequest } from '../models/DecisionRequest';
import type { DecisionResult } from '../models/DecisionResult';

// ─── Decision Engine interface ─────────────────────────────────────────────────
// Orchestrates the decision pipeline:
// ExecutionPlan → DecisionExtractor → AlternativeGenerator → AlternativeEvaluator
// → ConflictDetector → DecisionValidator → DecisionResult.
// Contains no business rules of its own.

export interface DecisionEngineDeps {
  extractor?:  unknown;   // IDecisionExtractor
  generator?:  unknown;   // IAlternativeGenerator
  evaluator?:  unknown;   // IAlternativeEvaluator
  conflictDetector?: unknown; // IConflictDetector
  validator?:  unknown;   // IDecisionValidator
  idGenerator?: () => string;
  clock?:       () => string;
}

export interface IDecisionEngine {
  readonly id: string;
  decide(request: DecisionRequest, deps?: DecisionEngineDeps): Promise<DecisionResult>;
}
