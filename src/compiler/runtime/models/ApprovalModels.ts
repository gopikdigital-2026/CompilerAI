// ─── Approval models ────────────────────────────────────────────────────────────

export type ApprovalDecisionType = 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED' | 'EXPIRED';

export const APPROVAL_DECISIONS: readonly ApprovalDecisionType[] = [
  'APPROVED', 'REJECTED', 'CHANGES_REQUESTED', 'EXPIRED',
] as const;

export type ApprovalReason =
  | 'RISK_THRESHOLD_EXCEEDED'
  | 'INSUFFICIENT_CONFIDENCE'
  | 'ORGANIZATION_POLICY'
  | 'TOOL_REQUIRES_AUTHORIZATION'
  | 'IRREVERSIBLE_ACTION'
  | 'EXTERNAL_EFFECTS';

export interface ApprovalRequest {
  approvalId:       string;
  executionId:      string;
  organizationId:   string;
  nodeId:           string;
  nodeLabel:        string;
  reason:           ApprovalReason;
  description:      string;
  /** Risk level that triggered the approval. */
  riskLevel:        string;
  /** Confidence score at the time of the request. */
  confidenceScore:  number;
  status:           ApprovalDecisionType | 'PENDING';
  decision:         ApprovalDecision | null;
  createdAt:        string;
  expiresAt:        string | null;
}

export interface ApprovalDecision {
  decisionId:    string;
  approvalId:    string;
  decision:      ApprovalDecisionType;
  reviewedBy:    string;
  comment:       string;
  decidedAt:     string;
  /** Changes requested, if decision is CHANGES_REQUESTED. */
  requestedChanges: string[];
}
