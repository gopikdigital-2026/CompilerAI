// ─── Decision status ───────────────────────────────────────────────────────────

export type DecisionStatus =
  | 'READY'
  | 'REQUIRES_APPROVAL'
  | 'NEEDS_DATA'
  | 'NEEDS_CLARIFICATION'
  | 'REPLAN_REQUIRED'
  | 'BLOCKED'
  | 'INVALID';

export const DECISION_STATUSES: readonly DecisionStatus[] = [
  'READY', 'REQUIRES_APPROVAL', 'NEEDS_DATA', 'NEEDS_CLARIFICATION',
  'REPLAN_REQUIRED', 'BLOCKED', 'INVALID',
] as const;
