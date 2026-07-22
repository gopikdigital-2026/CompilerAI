// ─── Execution result ───────────────────────────────────────────────────────────
// Final result of executing a full ToolExecutionPlan.

import type { ExecutionState, ExecutionMode } from './ExecutionState';
import type { StepResult } from './StepResult';

export interface ExecutionResult {
  executionId:    string;
  planId:         string;
  organizationId: string;
  state:          ExecutionState;
  mode:           ExecutionMode;
  stepResults:    StepResult[];
  /** Steps that completed successfully. */
  completedSteps: number;
  /** Steps that failed. */
  failedSteps:    number;
  /** Steps that were compensated. */
  compensatedSteps: number;
  /** Whether rollback/compensation was triggered. */
  rollbackTriggered: boolean;
  startedAt:      string;
  completedAt:    string | null;
  totalDurationMs: number;
  warnings:       string[];
  errors:         string[];
  version:        string;
}
