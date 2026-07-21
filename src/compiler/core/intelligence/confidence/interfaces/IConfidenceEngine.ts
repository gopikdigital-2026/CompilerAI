// ─── IConfidenceEngine ─────────────────────────────────────────────────────────
// Top-level orchestrator that produces a ConfidenceResult from existing
// engine artifacts.

import type { ConfidenceRequest } from '../models/ConfidenceRequest';
import type { ConfidenceResult } from '../models/ConfidenceResult';

export interface ConfidenceEngineDeps {
  idGenerator:  () => string;
  clock:        () => string;
  factorWeights: Record<string, number>;
}

export interface IConfidenceEngine {
  evaluate(request: ConfidenceRequest): ConfidenceResult;
}
