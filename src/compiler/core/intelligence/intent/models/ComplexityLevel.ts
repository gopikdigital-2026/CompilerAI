// ─── Complexity level ───────────────────────────────────────────────────────────
// Estimated complexity of fulfilling the resolved intent.

export type ComplexityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';

export const COMPLEXITY_LEVELS: readonly ComplexityLevel[] = [
  'LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH',
] as const;
