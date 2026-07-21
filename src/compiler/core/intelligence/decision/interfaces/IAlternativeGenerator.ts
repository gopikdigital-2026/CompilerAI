import type { DecisionItem } from '../models/DecisionItem';
import type { DecisionAlternative } from '../models/DecisionAlternative';
import type { EvaluationPreferences } from '../models/DecisionRequest';
import type { RiskLevel } from '../../planning/models/PlanRisk';

// ─── Alternative Generator interface ──────────────────────────────────────────
// Generates alternatives for a decision using deterministic rules.

export interface IAlternativeGenerator {
  readonly id: string;
  generate(
    decision:    DecisionItem,
    preferences: EvaluationPreferences,
    riskTolerance: RiskLevel,
  ): DecisionAlternative[];
}
