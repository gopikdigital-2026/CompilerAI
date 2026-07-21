// ─── Decision conflict ──────────────────────────────────────────────────────────

import type { RiskLevel } from '../../planning/models/PlanRisk';

export type ConflictType =
  | 'CONTRADICTORY_OBJECTIVES'
  | 'INCOMPATIBLE_ALTERNATIVES'
  | 'MUTUALLY_EXCLUSIVE_CONSTRAINTS'
  | 'CONTRADICTORY_RECOMMENDATIONS'
  | 'COST_VS_RISK'
  | 'URGENCY_VS_APPROVAL'
  | 'AUTOMATION_VS_RESTRICTED_DATA'
  | 'HIGH_IMPACT_VS_LOW_CONFIDENCE';

export interface DecisionConflict {
  conflictId:          string;
  type:                ConflictType;
  description:         string;
  involvedDecisionIds: string[];
  severity:            RiskLevel;
  resolvable:          boolean;
  suggestedResolution: string;
}
