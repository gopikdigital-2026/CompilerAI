// ─── LearningValidator ──────────────────────────────────────────────────────────
// Validates learning recommendations and records before they are stored or applied.

import type { ILearningValidator } from '../interfaces/ILearningEngine';
import type { LearningRecommendation } from '../models/LearningRecommendation';
import type { LearningRecord } from '../models/LearningRecord';

export class LearningValidator implements ILearningValidator {
  validateRecommendation(rec: LearningRecommendation): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!rec.recommendationId) errors.push('recommendationId is required.');
    if (!rec.organizationId) errors.push('organizationId is required.');
    if (!rec.title) errors.push('title is required.');
    if (!rec.description) errors.push('description is required.');
    // priority is a string enum (LOW|MEDIUM|HIGH|CRITICAL), no numeric check needed
    if (!rec.proposedChange || Object.keys(rec.proposedChange).length === 0) {
      errors.push('proposedChange must not be empty.');
    }
    if (rec.sourcePatterns.length === 0) {
      errors.push('sourcePatterns must contain at least one pattern.');
    }
    if (!rec.rationale) errors.push('rationale is required.');
    if (rec.status !== 'PENDING' && rec.status !== 'APPROVED' && rec.status !== 'REJECTED' && rec.status !== 'APPLIED') {
      errors.push(`Invalid status: ${rec.status}.`);
    }

    return { valid: errors.length === 0, errors };
  }

  validateRecord(record: LearningRecord): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!record.recordId) errors.push('recordId is required.');
    if (!record.organizationId) errors.push('organizationId is required.');
    if (!record.source) errors.push('source is required.');
    if (record.version < 1) errors.push('version must be >= 1.');
    if (!record.createdAt) errors.push('createdAt is required.');

    return { valid: errors.length === 0, errors };
  }
}
