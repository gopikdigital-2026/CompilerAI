// ─── Confidence status ─────────────────────────────────────────────────────────
// Outcome of the confidence assessment for the supplied results.

export type ConfidenceStatus =
  | 'ACCEPTABLE'
  | 'NEEDS_DATA'
  | 'NEEDS_CLARIFICATION'
  | 'HUMAN_REVIEW_REQUIRED'
  | 'BLOCKED'
  | 'INVALID';

export const CONFIDENCE_STATUSES: readonly ConfidenceStatus[] = [
  'ACCEPTABLE', 'NEEDS_DATA', 'NEEDS_CLARIFICATION',
  'HUMAN_REVIEW_REQUIRED', 'BLOCKED', 'INVALID',
] as const;
