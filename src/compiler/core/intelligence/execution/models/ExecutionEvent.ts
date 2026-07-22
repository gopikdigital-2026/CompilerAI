// ─── Execution event ────────────────────────────────────────────────────────────
// Events emitted by the Execution Engine.

import type { ExecutionState } from './ExecutionState';

export type ExecutionEventType =
  | 'ExecutionStarted'
  | 'StepStarted'
  | 'StepCompleted'
  | 'StepFailed'
  | 'StepRetried'
  | 'StepCancelled'
  | 'StepCompensated'
  | 'ExecutionCompleted'
  | 'ExecutionFailed'
  | 'ExecutionCancelled'
  | 'ExecutionPartial'
  | 'RollbackTriggered';

export interface ExecutionEvent {
  eventId:      string;
  eventType:    ExecutionEventType;
  executionId:  string;
  organizationId: string;
  timestamp:    string;
  summary:      string;
  stepId:       string | null;
  state:        ExecutionState | null;
  metadata:     Record<string, unknown>;
}
