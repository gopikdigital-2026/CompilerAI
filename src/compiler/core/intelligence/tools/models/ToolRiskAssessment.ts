// ─── Tool risk assessment ───────────────────────────────────────────────────────
// Risk evaluation for a set of selected tools.

import type { RiskLevel } from '../../planning/models/PlanRisk';

export type ToolRiskLevel = RiskLevel;

export interface ToolRiskFactor {
  factorId:    string;
  description: string;
  level:       ToolRiskLevel;
  toolIds:     string[];
}

export interface ToolRiskAssessment {
  assessmentId:    string;
  overallRiskLevel: ToolRiskLevel;
  riskFactors:     ToolRiskFactor[];
  incompatibleTools: Array<{ toolA: string; toolB: string; reason: string }>;
  sensitiveDataExposure: boolean;
  requiresHumanApproval: boolean;
  recommendations: string[];
}
