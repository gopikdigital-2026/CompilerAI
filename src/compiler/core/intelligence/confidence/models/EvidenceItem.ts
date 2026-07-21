// ─── Evidence item ────────────────────────────────────────────────────────────
// A piece of evidence backing a confidence assessment. Never invented — only
// derived from references already present in the source results.

export type EvidenceKind =
  | 'CONTEXT_SOURCE'
  | 'INTENT_REASON'
  | 'PLAN_NODE'
  | 'PLAN_RISK'
  | 'DECISION_ALTERNATIVE'
  | 'DECISION_CRITERION'
  | 'APPROVAL_REQUIREMENT'
  | 'ASSUMPTION';

export interface EvidenceItem {
  evidenceId:   string;
  kind:         EvidenceKind;
  /** Source id this evidence comes from. */
  sourceId:     string;
  /** Human-readable description, safe to surface. */
  description:  string;
  /** Relevance to the assessment, 0–100. */
  relevance:    number;
  /** Reliability of the source, 0–100. */
  reliability:  number;
  /** Freshness / recency score, 0–100. */
  freshness:    number;
  /** Consistency with other evidence, 0–100. */
  consistency:  number;
  /** Coverage of the assessed scope, 0–100. */
  coverage:     number;
  /** Traceability to upstream artifact, 0–100. */
  traceability: number;
  /** Aggregate quality score, 0–100. */
  qualityScore: number;
}
