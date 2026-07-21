// ─── Decision request ──────────────────────────────────────────────────────────
// Input to the Decision Engine. Does not duplicate ExecutionPlan data —
// references it.

import type { ExecutionPlan } from '../../planning/models/ExecutionPlan';
import type { RiskLevel } from '../../planning/models/PlanRisk';

export type DecisionScope = 'FULL' | 'HIGH_IMPACT_ONLY' | 'APPROVAL_GATES_ONLY';

export interface EvaluationPreferences {
  /** Weight overrides per criterion kind, 0–1. */
  criterionWeights?: Partial<Record<string, number>>;
  /** Minimum viable weighted score, 0–100. */
  minViableScore?:   number;
  /** Penalty per risk level, subtracted from weighted score. */
  riskPenalties?:    Partial<Record<RiskLevel, number>>;
}

export interface DecisionRequest {
  executionPlan:           ExecutionPlan;
  evaluationPreferences:  EvaluationPreferences;
  riskTolerance:          RiskLevel;
  availableConstraints:   string[];
  requestedDecisionScope:  DecisionScope;
  requestedAt:             string;   // ISO
}
