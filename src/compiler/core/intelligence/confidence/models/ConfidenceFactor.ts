// ─── Confidence factor ──────────────────────────────────────────────────────────
// A single contributor to the overall confidence score.

export type FactorDirection = 'POSITIVE' | 'NEGATIVE';

export type FactorKind =
  | 'CONTEXT_COMPLETENESS'
  | 'INTENT_CLARITY'
  | 'INTENT_PLAN_COHERENCE'
  | 'GRAPH_VALIDITY'
  | 'DATA_QUALITY'
  | 'ASSUMPTION_COUNT'
  | 'CONFLICT_SEVERITY'
  | 'UNRESOLVED_RISKS'
  | 'ALTERNATIVE_GAP'
  | 'EVIDENCE_SUFFICIENCY'
  | 'RESTRICTED_DATA'
  | 'EXTERNAL_DEPENDENCY'
  | 'REVERSIBILITY'
  | 'PENDING_APPROVAL'
  | 'CROSS_ENGINE_CONSISTENCY';

export interface ConfidenceFactor {
  factorId:      string;
  kind:          FactorKind;
  direction:     FactorDirection;
  /** Contribution weight after normalization, 0–1. */
  weight:        number;
  /** Raw score for this factor, 0–100. */
  score:         number;
  /** Weighted contribution to the overall score. */
  contribution:  number;
  description:   string;
  /** Source ids that informed this factor. */
  evidenceRefs:  string[];
}
