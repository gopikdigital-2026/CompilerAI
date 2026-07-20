// ─── Impact level ───────────────────────────────────────────────────────────────
// Potential business impact of acting on the resolved intent.

export type ImpactLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export const IMPACT_LEVELS: readonly ImpactLevel[] = [
  'LOW', 'MEDIUM', 'HIGH', 'CRITICAL',
] as const;
