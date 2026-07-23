import type { OrganizationScopedEntity } from '../types/shared';
import type { NodeType } from './WorkflowModels';

export type MonitorEventLevel = 'info' | 'warn' | 'error' | 'debug';

export type MonitorEventType =
  | 'node_started'
  | 'node_completed'
  | 'node_failed'
  | 'node_skipped'
  | 'checkpoint_saved'
  | 'checkpoint_restored'
  | 'approval_requested'
  | 'approval_granted'
  | 'approval_denied'
  | 'execution_started'
  | 'execution_completed'
  | 'execution_failed'
  | 'execution_paused'
  | 'execution_resumed';

export interface MonitorEvent {
  id: string;
  executionId: string;
  organizationId: string;
  type: MonitorEventType;
  level: MonitorEventLevel;
  nodeId: string | null;
  nodeType: NodeType | null;
  nodeLabel: string | null;
  message: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface ExecutionMonitor extends OrganizationScopedEntity {
  executionId: string;
  workflowId: string;
  workflowVersion: number;
  status: 'running' | 'completed' | 'failed' | 'paused' | 'cancelled';
  activeNodes: string[];
  completedNodes: string[];
  failedNodes: string[];
  pendingApprovals: PendingApproval[];
  checkpoints: CheckpointInfo[];
  startedAt: string;
  completedAt: string | null;
  events: MonitorEvent[];
}

export interface PendingApproval {
  nodeId: string;
  nodeLabel: string;
  requestedAt: string;
  requestedBy: string;
  status: 'pending' | 'approved' | 'denied';
  decidedBy: string | null;
  decidedAt: string | null;
  comment: string | null;
}

export interface CheckpointInfo {
  checkpointId: string;
  nodeId: string;
  sequenceNumber: number;
  timestamp: string;
  intermediateState: Record<string, unknown>;
}
