// ─── Plan status ──────────────────────────────────────────────────────────────

export type PlanStatus =
  | 'DRAFT'
  | 'READY'
  | 'NEEDS_DATA'
  | 'NEEDS_CLARIFICATION'
  | 'REQUIRES_APPROVAL'
  | 'BLOCKED'
  | 'INVALID';

export const PLAN_STATUSES: readonly PlanStatus[] = [
  'DRAFT', 'READY', 'NEEDS_DATA', 'NEEDS_CLARIFICATION',
  'REQUIRES_APPROVAL', 'BLOCKED', 'INVALID',
] as const;
