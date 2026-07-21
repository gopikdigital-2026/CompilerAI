// ─── Decision item ──────────────────────────────────────────────────────────────
// A single decision extracted from the ExecutionPlan.

import type { DecisionType } from './DecisionType';
import type { DecisionStatus } from './DecisionStatus';
import type { DecisionAlternative } from './DecisionAlternative';
import type { DecisionCriterion } from './DecisionCriterion';
import type { DecisionConflict } from './DecisionConflict';
import type { DecisionRationale } from './DecisionRationale';
import type { RiskLevel } from '../../planning/models/PlanRisk';

export interface DecisionItem {
  decisionId:               string;
  title:                     string;
  description:               string;
  decisionType:              DecisionType;
  /** Plan node ids this decision was extracted from. */
  sourceNodeIds:            string[];
  objective:                 string;
  criteria:                  DecisionCriterion[];
  alternatives:              DecisionAlternative[];
  recommendedAlternativeId: string;
  rationale:                 DecisionRationale;
  confidenceScore:           number;   // 0–100
  riskLevel:                 RiskLevel;
  conflicts:                 DecisionConflict[];
  assumptions:               string[];
  requiresHumanApproval:    boolean;
  approvalReason?:           string;
  reversible:                boolean;
  status:                    DecisionStatus;
}
