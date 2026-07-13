// ─── Missing information descriptor ────────────────────────────────────────────
// A single gap detected by the ContextValidator that must be filled before
// reasoning can proceed safely.

export type InformationGapKind =
  | 'ambiguous_intent'
  | 'missing_objective'
  | 'missing_entity'
  | 'missing_constraint'
  | 'missing_data_source'
  | 'unresolved_organization';

export interface MissingInformation {
  kind:        InformationGapKind;
  /** Human-readable description of what is missing. */
  description: string;
  /** Suggested clarifying question to surface to the user. */
  question:    string;
  /** Severity weighting used to compute the sufficiency penalty. */
  severity:    'low' | 'medium' | 'high' | 'critical';
  /** Source ids that could fill this gap, when applicable. */
  resolvableBy: string[];
}
