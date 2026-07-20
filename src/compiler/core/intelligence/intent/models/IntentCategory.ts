// ─── Intent category ───────────────────────────────────────────────────────────
// Rich, enterprise-oriented intent taxonomy produced by the Intent Engine.
// Extensible: add new categories here and update the classification rules.

export type IntentCategory =
  | 'ANALYZE'
  | 'DECIDE'
  | 'PLAN'
  | 'OPTIMIZE'
  | 'PREDICT'
  | 'EXPLAIN'
  | 'CREATE'
  | 'EXECUTE'
  | 'MONITOR'
  | 'INVESTIGATE'
  | 'COMPARE'
  | 'RECOMMEND'
  | 'UNKNOWN';

export const INTENT_CATEGORIES: readonly IntentCategory[] = [
  'ANALYZE', 'DECIDE', 'PLAN', 'OPTIMIZE', 'PREDICT', 'EXPLAIN',
  'CREATE', 'EXECUTE', 'MONITOR', 'INVESTIGATE', 'COMPARE', 'RECOMMEND',
  'UNKNOWN',
] as const;
