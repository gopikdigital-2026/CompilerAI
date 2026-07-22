// ─── Runtime execution ──────────────────────────────────────────────────────────
// Tracks the state of a single runtime execution.

import type { RuntimeStatus } from './RuntimeModels';
import type { WorkflowExecution } from './WorkflowModels';
import type { RuntimeCheckpoint } from './CheckpointModels';

export interface RuntimeExecution {
  executionId:         string;
  requestId:           string;
  organizationId:      string;
  idempotencyKey:      string;
  status:              RuntimeStatus;
  workflowExecution:   WorkflowExecution | null;
  checkpoints:         RuntimeCheckpoint[];
  /** Step results from completed nodes. */
  nodeResults:         Record<string, unknown>;
  /** Whether rollback was triggered. */
  rollbackTriggered:   boolean;
  startedAt:           string;
  completedAt:         string | null;
  /** Human-readable error message, if failed. */
  errorMessage:        string | null;
  /** Warnings accumulated during execution. */
  warnings:            string[];
  version:             string;
}
