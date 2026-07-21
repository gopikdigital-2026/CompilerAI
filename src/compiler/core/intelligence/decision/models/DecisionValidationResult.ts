// ─── Decision validation result ────────────────────────────────────────────────

import type { DecisionStatus } from './DecisionStatus';

export interface DecisionValidationError {
  code:       string;
  message:    string;
  decisionId?: string;
}

export interface DecisionValidationWarning {
  code:       string;
  message:    string;
  decisionId?: string;
}

export interface DecisionValidationResult {
  isValid:          boolean;
  errors:           DecisionValidationError[];
  warnings:         DecisionValidationWarning[];
  blockers:         string[];
  recommendedStatus: DecisionStatus;
}
