// ─── Step result ────────────────────────────────────────────────────────────────
// Result of executing a single step in the tool execution plan.

import type { StepState } from './ExecutionState';

export interface StepResult {
  stepId:        string;
  toolId:        string;
  toolName:      string;
  state:         StepState;
  startedAt:     string;
  completedAt:   string | null;
  /** Output from the simulated tool — descriptors only, no real side effects. */
  output:        Record<string, unknown> | null;
  error:         string | null;
  attempts:      number;
  /** Whether this step was compensated (rolled back). */
  compensated:   boolean;
  /** Idempotency key to prevent duplicate execution. */
  idempotencyKey: string;
  durationMs:    number;
}
