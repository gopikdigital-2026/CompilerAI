// ─── Confidence assessment ─────────────────────────────────────────────────────
// Per-source confidence evaluation.

import type { ConfidenceLevel } from './ConfidenceLevel';
import type { ConfidenceFactor } from './ConfidenceFactor';
import type { UncertaintyItem } from './UncertaintyItem';
import type { EvidenceItem } from './EvidenceItem';

export type AssessedSourceType =
  | 'CONTEXT'
  | 'INTENT'
  | 'PLAN'
  | 'DECISION';

export interface ConfidenceAssessment {
  sourceType:      AssessedSourceType;
  sourceId:        string;
  score:           number;   // 0–100
  level:           ConfidenceLevel;
  factors:         ConfidenceFactor[];
  uncertainties:   UncertaintyItem[];
  evidence:        EvidenceItem[];
  contradictions:  string[];
  assumptions:     string[];
  explanation:     string;
}
