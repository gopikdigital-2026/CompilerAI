// ─── Tool execution plan ────────────────────────────────────────────────────────
// Ordered plan of selected tools — never executed, only described.

import type { ToolSelection } from './ToolSelection';
import type { ToolRiskAssessment } from './ToolRiskAssessment';

export interface ToolPlanStep {
  stepId:      string;
  toolId:      string;
  toolName:    string;
  order:       number;
  selection:   ToolSelection;
  /** Expected capabilities this step will exercise. */
  expectedCapabilities: string[];
  /** Whether this step is a fallback for another step. */
  isFallback:  boolean;
}

export type ToolPlanStatus = 'READY' | 'PARTIAL' | 'BLOCKED' | 'EMPTY';

export interface ToolExecutionPlan {
  planId:           string;
  executionId:      string;
  organizationId:   string;
  status:           ToolPlanStatus;
  steps:            ToolPlanStep[];
  riskAssessment:   ToolRiskAssessment | null;
  totalTools:       number;
  fallbacksUsed:    number;
  warnings:         string[];
  createdAt:        string;
  version:          string;
}
