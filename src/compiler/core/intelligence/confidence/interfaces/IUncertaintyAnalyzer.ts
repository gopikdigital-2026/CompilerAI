// ─── IUncertaintyAnalyzer ──────────────────────────────────────────────────────
// Detects uncertainties in the supplied engine results.

import type { ConfidenceRequest } from '../models/ConfidenceRequest';
import type { UncertaintyItem } from '../models/UncertaintyItem';

export interface IUncertaintyAnalyzer {
  analyze(request: ConfidenceRequest): UncertaintyItem[];
}
