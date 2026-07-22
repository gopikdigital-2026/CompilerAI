// ─── Learning policies ──────────────────────────────────────────────────────────
// Business rules for learning: human approval, tenant isolation, versioning.

import type { LearningRecommendation } from '../models/LearningRecommendation';
import type { LearningRecord } from '../models/LearningRecord';
import type { LearningInput } from '../models/LearningInput';
import type { LearningStatus } from '../models/LearningTypes';

/** Policy: recommendations must never be auto-applied — human approval is mandatory. */
export function requiresHumanApproval(rec: LearningRecommendation): boolean {
  return rec.status === 'PENDING';
}

/** Policy: check tenant isolation — org A cannot access org B's records. */
export function checkTenantIsolation(record: LearningRecord, organizationId: string): boolean {
  return record.organizationId === organizationId;
}

/** Policy: a recommendation can only be approved from PENDING status. */
export function canApprove(rec: LearningRecommendation): boolean {
  return rec.status === 'PENDING';
}

/** Policy: a recommendation can only be rejected from PENDING status. */
export function canReject(rec: LearningRecommendation): boolean {
  return rec.status === 'PENDING';
}

/** Policy: validate learning input. */
export function validateLearningInput(input: LearningInput): string[] {
  const errors: string[] = [];
  if (!input.organizationId) errors.push('organizationId is required.');
  if (!input.source) errors.push('source is required.');
  if (!input.triggerId) errors.push('triggerId is required.');
  return errors;
}

/** Policy: compute next version number for a record. */
export function nextVersion(currentVersion: number): number {
  return currentVersion + 1;
}

/** Policy: determine if a status transition is valid. */
export function isValidStatusTransition(from: LearningStatus, to: LearningStatus): boolean {
  const transitions: Record<LearningStatus, LearningStatus[]> = {
    PENDING: ['APPROVED', 'REJECTED'],
    APPROVED: ['APPLIED'],
    REJECTED: [],
    APPLIED: [],
  };
  return transitions[from]?.includes(to) ?? false;
}

/** Policy: detect regression — confidence drops below threshold. */
export function isRegression(
  currentConfidence: number,
  previousConfidence: number,
  threshold = 10,
): boolean {
  return previousConfidence - currentConfidence >= threshold;
}
