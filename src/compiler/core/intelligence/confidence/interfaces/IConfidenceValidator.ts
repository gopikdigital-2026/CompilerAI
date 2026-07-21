// ─── IConfidenceValidator ─────────────────────────────────────────────────────
// Validates the computed confidence result for internal consistency.

import type { ConfidenceResult } from '../models/ConfidenceResult';
import type { ConfidenceValidationResult } from '../models/ConfidenceValidationResult';

export interface IConfidenceValidator {
  validate(result: ConfidenceResult): ConfidenceValidationResult;
}
