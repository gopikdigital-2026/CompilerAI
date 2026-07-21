// ─── Explainability record ──────────────────────────────────────────────────────
// Human-readable record explaining what happened during a pipeline execution.

export interface DecisionSummary {
  decisionId:      string;
  title:           string;
  status:          string;
  accepted:        boolean;
  rationale:       string;
  riskLevel:       string | null;
  confidenceScore: number | null;
}

export interface AlternativeSummary {
  alternativeId: string;
  title:          string;
  score:          number | null;
  accepted:       boolean;
  rejectionReason: string | null;
}

export interface ExplainabilityRecord {
  explainabilityId:    string;
  executionId:         string;
  requestId:           string;
  organizationId:      string;
  summary:             string;
  acceptedDecisions:   DecisionSummary[];
  rejectedDecisions:   DecisionSummary[];
  rationales:          string[];
  risks:               string[];
  uncertainties:       string[];
  alternativesEvaluated: AlternativeSummary[];
  confidenceScore:     number | null;
  outcomeReason:       string;
  strengths:           string[];
  concerns:            string[];
  recommendations:     string[];
  createdAt:           string;   // ISO
}
