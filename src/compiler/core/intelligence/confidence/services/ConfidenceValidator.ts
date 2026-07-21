// ─── Confidence validator ──────────────────────────────────────────────────────
// Validates the computed ConfidenceResult for internal consistency.

import type { ConfidenceResult } from '../models/ConfidenceResult';
import type { ConfidenceValidationResult } from '../models/ConfidenceValidationResult';
import type { IConfidenceValidator } from '../interfaces/IConfidenceValidator';

export class ConfidenceValidator implements IConfidenceValidator {
  validate(result: ConfidenceResult): ConfidenceValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (result.overallScore < 0 || result.overallScore > 100) {
      errors.push('Overall score must be between 0 and 100.');
    }
    if (result.confidenceResultId.length === 0) {
      errors.push('Confidence result id is empty.');
    }
    if (result.requestId.length === 0) {
      errors.push('Request id is empty.');
    }
    if (result.assessments.length === 0) {
      warnings.push('No assessments were produced.');
    }
    for (const a of result.assessments) {
      if (a.score < 0 || a.score > 100) {
        errors.push(`Assessment for ${a.sourceType}:${a.sourceId} has score out of range.`);
      }
      for (const f of a.factors) {
        if (f.score < 0 || f.score > 100) {
          errors.push(`Factor ${f.kind} in ${a.sourceType}:${a.sourceId} has score out of range.`);
        }
        if (f.weight < 0) {
          errors.push(`Factor ${f.kind} in ${a.sourceType}:${a.sourceId} has negative weight.`);
        }
      }
    }
    if (result.blocked && result.status !== 'BLOCKED') {
      errors.push('Result is blocked but status is not BLOCKED.');
    }
    if (result.requiresHumanReview && result.status === 'ACCEPTABLE') {
      warnings.push('Result requires human review but status is ACCEPTABLE.');
    }
    if (result.requiresMoreData && result.status === 'ACCEPTABLE') {
      warnings.push('Result requires more data but status is ACCEPTABLE.');
    }
    if (result.requiresClarification && result.status === 'ACCEPTABLE') {
      warnings.push('Result requires clarification but status is ACCEPTABLE.');
    }
    return { valid: errors.length === 0, errors, warnings };
  }
}
