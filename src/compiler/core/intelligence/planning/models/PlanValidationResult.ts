// ─── Plan validation result ────────────────────────────────────────────────────

import type { PlanStatus } from './PlanStatus';

export interface PlanValidationError {
  code:    string;
  message: string;
  nodeId?: string;
  edgeId?: string;
}

export interface PlanValidationWarning {
  code:    string;
  message: string;
  nodeId?: string;
}

export interface PlanValidationResult {
  isValid:          boolean;
  errors:           PlanValidationError[];
  warnings:         PlanValidationWarning[];
  blockers:         string[];
  confidenceScore:  number;   // 0–100
  recommendedStatus: PlanStatus;
}
