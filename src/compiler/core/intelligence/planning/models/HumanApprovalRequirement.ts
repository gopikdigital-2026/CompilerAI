// ─── Human approval requirement ────────────────────────────────────────────────

export type ApprovalReason =
  | 'WORKFORCE_REDUCTION'
  | 'FINANCIAL_MOVEMENT'
  | 'CONTRACT_SIGNING'
  | 'LEGAL_OR_REGULATORY_CHANGE'
  | 'RESTRICTED_DATA_ACCESS'
  | 'SENSITIVE_PUBLIC_COMMUNICATION'
  | 'INFORMATION_DELETION'
  | 'IRREVERSIBLE_ACTION'
  | 'HIGH_IMPACT_LOW_CONFIDENCE'
  | 'HIGH_IMPACT_EXTERNAL_EXECUTION';

export interface HumanApprovalRequirement {
  /** Node id that requires approval. */
  nodeId:    string;
  reason:    ApprovalReason;
  /** Human-readable justification, safe to surface. */
  rationale: string;
}
