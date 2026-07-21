// ─── Confidence result ─────────────────────────────────────────────────────────
// Final artifact produced by the Confidence Engine.

import type { ConfidenceLevel } from './ConfidenceLevel';
import type { ConfidenceStatus } from './ConfidenceStatus';
import type { ConfidenceAssessment } from './ConfidenceAssessment';
import type { ConfidenceFactor } from './ConfidenceFactor';
import type { UncertaintyItem } from './UncertaintyItem';
import type { EvidenceItem } from './EvidenceItem';

export interface ConfidenceResult {
  confidenceResultId:    string;
  requestId:             string;
  organizationId:       string;
  overallScore:         number;   // 0–100
  level:                ConfidenceLevel;
  status:               ConfidenceStatus;
  assessments:          ConfidenceAssessment[];
  positiveFactors:      ConfidenceFactor[];
  negativeFactors:      ConfidenceFactor[];
  uncertainties:        UncertaintyItem[];
  evidence:             EvidenceItem[];
  missingEvidence:      string[];
  contradictions:       string[];
  assumptions:          string[];
  requiresMoreData:     boolean;
  requiresClarification: boolean;
  requiresHumanReview:  boolean;
  blocked:              boolean;
  recommendedActions:   string[];
  explanation:          string;
  createdAt:            string;   // ISO
  version:              string;
}
