// ─── Execution trace entry ──────────────────────────────────────────────────────
// Per-step trace for full observability of the execution.

import type { StepState } from './ExecutionState';

export interface ExecutionTraceEntry {
  traceId:      string;
  executionId:  string;
  stepId:       string;
  toolId:       string;
  state:        StepState;
  timestamp:    string;
  message:      string;
  attempt:      number;
  metadata:     Record<string, unknown>;
}
