// ─── Decision result ────────────────────────────────────────────────────────────
// The final artifact produced by the Decision Engine.

import type { DecisionStatus } from './DecisionStatus';
import type { DecisionItem } from './DecisionItem';
import type { DecisionAlternative } from './DecisionAlternative';
import type { DecisionConflict } from './DecisionConflict';
import type { PlanRisk, RiskLevel } from '../../planning/models/PlanRisk';
import type { HumanApprovalRequirement } from '../../planning/models/HumanApprovalRequirement';

export interface SelectedStrategy {
  decisionId:        string;
  alternativeId:     string;
  title:             string;
  rationale:         string;
}

export interface DecisionResult {
  decisionResultId:            string;
  planId:                      string;
  requestId:                   string;
  organizationId:              string;
  intentId:                     string;
  status:                      DecisionStatus;
  decisions:                   DecisionItem[];
  selectedStrategy:            SelectedStrategy | null;
  rejectedAlternatives:        DecisionAlternative[];
  unresolvedConflicts:         DecisionConflict[];
  assumptions:                 string[];
  risks:                       PlanRisk[];
  humanApprovalRequirements:  HumanApprovalRequirement[];
  requiresReplanning:          boolean;
  replanningReasons:           string[];
  requiresMoreData:            boolean;
  missingData:                 string[];
  requiresClarification:       boolean;
  clarificationQuestions:      string[];
  overallConfidenceScore:      number;   // 0–100
  overallRiskLevel:            RiskLevel;
  rationaleSummary:            string;
  createdAt:                   string;   // ISO
  version:                     string;
}
