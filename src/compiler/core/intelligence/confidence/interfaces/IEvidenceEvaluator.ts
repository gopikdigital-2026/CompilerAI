// ─── IEvidenceEvaluator ────────────────────────────────────────────────────────
// Collects and scores evidence from existing engine results. Never invents
// evidence — only derives items from references already present.

import type { ConfidenceRequest } from '../models/ConfidenceRequest';
import type { EvidenceItem } from '../models/EvidenceItem';

export interface IEvidenceEvaluator {
  collect(request: ConfidenceRequest): EvidenceItem[];
  /** Returns descriptions of missing critical evidence. */
  missingEvidence(request: ConfidenceRequest): string[];
}
