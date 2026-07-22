// ─── Runtime status and node types ──────────────────────────────────────────────

export type RuntimeStatus =
  | 'CREATED'
  | 'VALIDATING'
  | 'RUNNING'
  | 'WAITING_FOR_APPROVAL'
  | 'PAUSED'
  | 'RESUMING'
  | 'COMPLETED'
  | 'PARTIAL'
  | 'BLOCKED'
  | 'CANCELLED'
  | 'FAILED';

export const RUNTIME_STATUSES: readonly RuntimeStatus[] = [
  'CREATED', 'VALIDATING', 'RUNNING', 'WAITING_FOR_APPROVAL',
  'PAUSED', 'RESUMING', 'COMPLETED', 'PARTIAL', 'BLOCKED', 'CANCELLED', 'FAILED',
] as const;

export type WorkflowNodeType =
  | 'INTELLIGENCE'
  | 'MEMORY_READ'
  | 'MEMORY_WRITE'
  | 'TOOL_SELECTION'
  | 'TOOL_EXECUTION'
  | 'HUMAN_APPROVAL'
  | 'CONDITION'
  | 'PARALLEL'
  | 'JOIN'
  | 'LEARNING'
  | 'FINALIZATION';

export const WORKFLOW_NODE_TYPES: readonly WorkflowNodeType[] = [
  'INTELLIGENCE', 'MEMORY_READ', 'MEMORY_WRITE', 'TOOL_SELECTION',
  'TOOL_EXECUTION', 'HUMAN_APPROVAL', 'CONDITION', 'PARALLEL',
  'JOIN', 'LEARNING', 'FINALIZATION',
] as const;

export type NodeExecutionState = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED' | 'CANCELLED' | 'WAITING_FOR_APPROVAL';

export const NODE_EXECUTION_STATES: readonly NodeExecutionState[] = [
  'PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'SKIPPED', 'CANCELLED', 'WAITING_FOR_APPROVAL',
] as const;
