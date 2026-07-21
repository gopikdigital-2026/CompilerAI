// ─── Confidence level ──────────────────────────────────────────────────────────
// Discrete band derived from the overall confidence score (0–100).

export type ConfidenceLevel = 'VERY_LOW' | 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';

export const CONFIDENCE_LEVELS: readonly ConfidenceLevel[] = [
  'VERY_LOW', 'LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH',
] as const;
