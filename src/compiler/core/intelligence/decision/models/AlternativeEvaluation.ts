// ─── Alternative evaluation ────────────────────────────────────────────────────
// The scored result of evaluating a DecisionAlternative against criteria.

import type { DecisionCriterion } from './DecisionCriterion';

export interface AlternativeEvaluation {
  alternativeId:    string;
  /** Weighted aggregate score 0–100. */
  weightedScore:    number;
  criteria:         DecisionCriterion[];
  /** Deterministic rank (1 = best). */
  rank:             number;
  /** Whether the alternative is viable (passes minimum thresholds). */
  viable:           boolean;
  /** Human-readable summary, safe to surface. */
  summary:          string;
}
