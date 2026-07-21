// ─── Confidence validation result ──────────────────────────────────────────────
// Output of validating the computed confidence result.

export interface ConfidenceValidationResult {
  valid:    boolean;
  errors:   string[];
  warnings: string[];
}
