import type { IAlternativeEvaluator } from '../interfaces/IAlternativeEvaluator';
import type { DecisionAlternative } from '../models/DecisionAlternative';
import type { AlternativeEvaluation } from '../models/AlternativeEvaluation';
import type { EvaluationPreferences } from '../models/DecisionRequest';
import type { RiskLevel } from '../../planning/models/PlanRisk';
import {
  resolveConfig, evaluateAlternative, rankEvaluations,
} from '../rules/EvaluationRules';

// ─── Alternative Evaluator ─────────────────────────────────────────────────────
// Scores alternatives against criteria deterministically. No randomness.

export class AlternativeEvaluator implements IAlternativeEvaluator {
  readonly id = 'alternative-evaluator-v1';

  evaluate(
    alternatives: DecisionAlternative[],
    preferences:   EvaluationPreferences,
    riskTolerance: RiskLevel,
  ): AlternativeEvaluation[] {
    const config = resolveConfig(preferences);
    const evals = alternatives.map(alt => evaluateAlternative(alt, config, riskTolerance));
    return rankEvaluations(evals);
  }
}
