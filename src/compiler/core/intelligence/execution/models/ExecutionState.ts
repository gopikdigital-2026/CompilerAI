// ─── Execution state ────────────────────────────────────────────────────────────

export type ExecutionState =
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'PARTIAL';

export const EXECUTION_STATES: readonly ExecutionState[] = [
  'PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED', 'PARTIAL',
] as const;

export type StepState = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'SKIPPED' | 'COMPENSATED';

export const STEP_STATES: readonly StepState[] = [
  'PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED', 'SKIPPED', 'COMPENSATED',
] as const;

export type ExecutionMode = 'SEQUENTIAL' | 'DAG';
