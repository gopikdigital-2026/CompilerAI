// ─── Checkpoint and resume models ───────────────────────────────────────────────


export interface RuntimeCheckpoint {
  checkpointId:     string;
  executionId:      string;
  organizationId:   string;
  /** Which stage or node this checkpoint was taken after. */
  stage:            string;
  /** Workflow content hash at the time of checkpoint. */
  contentHash:      string;
  /** Serialized state snapshot. */
  state:            Record<string, unknown>;
  /** Completed node IDs at this checkpoint. */
  completedNodeIds: string[];
  timestamp:        string;
}

export interface ResumeToken {
  tokenId:        string;
  executionId:    string;
  organizationId: string;
  checkpointId:   string;
  /** Content hash the token was issued for — must match on resume. */
  contentHash:    string;
  createdAt:      string;
  expiresAt:      string | null;
  /** Whether the token has been used. */
  consumed:       boolean;
}

export interface HumanTask {
  taskId:        string;
  executionId:   string;
  organizationId: string;
  nodeId:        string;
  approvalId:    string | null;
  taskType:      'APPROVAL' | 'REVIEW' | 'FEEDBACK' | 'CLARIFICATION';
  description:   string;
  status:        'PENDING' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED';
  assignedTo:    string | null;
  createdAt:     string;
  completedAt:   string | null;
}

export type { RuntimeStatus } from './RuntimeModels';
