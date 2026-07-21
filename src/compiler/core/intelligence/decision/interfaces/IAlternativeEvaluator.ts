import type { DecisionAlternative } from '../models/DecisionAlternative';
import type { AlternativeEvaluation } from '../models/AlternativeEvaluation';
import type { EvaluationPreferences } from '../models/DecisionRequest';
import type { RiskLevel } from '../../planning/models/PlanRisk';

// ─── Alternative Evaluator interface ───────────────────────────────────────────
// Scores alternatives against criteria deterministically.

export interface IAlternativeEvaluator {
  readonly id: string;
  evaluate(
    alternatives: DecisionAlternative[],
    preferences:  EvaluationPreferences,
    riskTolerance: RiskLevel,
  ): AlternativeEvaluation[];
}
