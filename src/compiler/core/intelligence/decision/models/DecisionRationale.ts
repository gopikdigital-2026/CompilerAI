// ─── Decision rationale ────────────────────────────────────────────────────────
// Explains why an alternative was recommended or rejected. Every recommendation
// must be auditable — no opaque results.

export interface DecisionRationale {
  chosenAlternativeId:    string;
  chosenTitle:            string;
  /** Why this alternative was selected. */
  selectionReason:        string;
  /** IDs of alternatives that were rejected and why. */
  rejectedAlternatives:   Array<{ alternativeId: string; reason: string }>;
  /** Risks that remain after selecting this alternative. */
  remainingRisks:          string[];
  /** Assumptions made during evaluation. */
  assumptions:            string[];
  /** Data that is missing for a fully informed decision. */
  missingData:            string[];
  /** Criteria that were used and their relative importance. */
  criteriaSummary:         string;
}
