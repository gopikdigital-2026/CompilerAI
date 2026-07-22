// ─── Execution request ──────────────────────────────────────────────────────────
// Input to the Execution Engine — wraps an approved ToolExecutionPlan.

import type { ToolExecutionPlan } from '../../tools/models/ToolExecutionPlan';
import type { ExecutionMode } from './ExecutionState';
import type { ToolPolicy } from '../../tools/models/ToolPolicy';

export interface ExecutionRequest {
  /** The approved tool execution plan. */
  plan:          ToolExecutionPlan;
  /** Organization policy governing this execution. */
  policy:        ToolPolicy;
  /** Execution mode — sequential or DAG. */
  mode:          ExecutionMode;
  /** Whether to allow automatic rollback on failure. */
  allowRollback: boolean;
  /** Max retries per step. */
  maxRetries:    number;
  /** Timeout per step in milliseconds. */
  stepTimeoutMs: number;
  /** Whether human approval has been granted for this plan. */
  humanApproved: boolean;
  /** Optional idempotency prefix — each step gets a deterministic key. */
  idempotencyPrefix: string;
}
