// ─── IConfidenceCalculator ─────────────────────────────────────────────────────
// Computes the overall confidence score and per-source assessments from
// existing engine results.

import type { ConfidenceRequest } from '../models/ConfidenceRequest';
import type { ConfidenceAssessment } from '../models/ConfidenceAssessment';
import type { ConfidenceFactor } from '../models/ConfidenceFactor';

export interface ConfidenceCalculatorDeps {
  /** Factor weights keyed by FactorKind. Need not sum to 1 — normalized internally. */
  factorWeights: Record<string, number>;
}

export interface IConfidenceCalculator {
  assessContext(request: ConfidenceRequest): ConfidenceAssessment | null;
  assessIntent(request: ConfidenceRequest): ConfidenceAssessment | null;
  assessPlan(request: ConfidenceRequest): ConfidenceAssessment | null;
  assessDecision(request: ConfidenceRequest): ConfidenceAssessment | null;
  /** Aggregate per-source assessments into an overall score 0–100. */
  aggregate(assessments: ConfidenceAssessment[], request: ConfidenceRequest): {
    overallScore: number;
    positiveFactors: ConfidenceFactor[];
    negativeFactors: ConfidenceFactor[];
  };
}
