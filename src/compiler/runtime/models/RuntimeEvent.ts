// ─── Runtime events ─────────────────────────────────────────────────────────────
// All events are compatible with the Telemetry engine's event shape.

export type RuntimeEventType =
  | 'RuntimeStarted'
  | 'RuntimeCompleted'
  | 'RuntimeFailed'
  | 'RuntimePaused'
  | 'RuntimeResumed'
  | 'RuntimeCancelled'
  | 'WorkflowStarted'
  | 'WorkflowCompleted'
  | 'WorkflowNodeStarted'
  | 'WorkflowNodeCompleted'
  | 'WorkflowNodeFailed'
  | 'CheckpointCreated'
  | 'ApprovalRequested'
  | 'ApprovalReceived'
  | 'HumanTaskCreated';

export const RUNTIME_EVENT_TYPES: readonly RuntimeEventType[] = [
  'RuntimeStarted', 'RuntimeCompleted', 'RuntimeFailed',
  'RuntimePaused', 'RuntimeResumed', 'RuntimeCancelled',
  'WorkflowStarted', 'WorkflowCompleted',
  'WorkflowNodeStarted', 'WorkflowNodeCompleted', 'WorkflowNodeFailed',
  'CheckpointCreated', 'ApprovalRequested', 'ApprovalReceived', 'HumanTaskCreated',
] as const;

export interface RuntimeEvent {
  eventId:        string;
  eventType:      RuntimeEventType;
  executionId:    string;
  organizationId: string;
  timestamp:      string;
  summary:        string;
  nodeId:         string | null;
  checkpointId:   string | null;
  approvalId:     string | null;
  metadata:       Record<string, unknown>;
}
