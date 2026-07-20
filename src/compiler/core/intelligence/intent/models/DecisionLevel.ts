// ─── Decision level ─────────────────────────────────────────────────────────────
// Level of authority required to act on the resolved intent.

export type DecisionLevel =
  | 'OPERATIONAL'
  | 'TACTICAL'
  | 'STRATEGIC'
  | 'EXECUTIVE';

export const DECISION_LEVELS: readonly DecisionLevel[] = [
  'OPERATIONAL', 'TACTICAL', 'STRATEGIC', 'EXECUTIVE',
] as const;
