// ─── Workflow models ────────────────────────────────────────────────────────────

import type { WorkflowNodeType, NodeExecutionState, RuntimeStatus } from './RuntimeModels';

export interface WorkflowNode {
  nodeId:       string;
  type:         WorkflowNodeType;
  label:        string;
  /** Order in sequential execution (1-based). */
  order:        number;
  /** Node-specific configuration. */
  config:       Record<string, unknown>;
  /** Node types that must complete before this node can run. */
  dependsOn:    string[];
  /** Condition expression for CONDITION nodes — evaluated to determine branch. */
  condition:    string | null;
  /** Branches for CONDITION/PARALLEL nodes. */
  branches:     WorkflowBranch[];
  /** Whether this node requires human approval. */
  requiresApproval: boolean;
  /** Maximum retries for this node. */
  maxRetries:   number;
  /** Timeout in ms for this node. */
  timeoutMs:    number;
}

export interface WorkflowBranch {
  branchId:   string;
  condition:  string;
  targetNodeIds: string[];
}

export interface WorkflowEdge {
  edgeId:     string;
  sourceNodeId: string;
  targetNodeId: string;
  /** Condition that must be true for this edge to be traversed. */
  condition:  string | null;
}

export interface WorkflowDefinition {
  workflowId:       string;
  organizationId:   string;
  name:             string;
  description:      string;
  nodes:            WorkflowNode[];
  edges:            WorkflowEdge[];
  /** Whether the workflow is a DAG or sequential. */
  mode:             'SEQUENTIAL' | 'DAG';
  version:          string;
  createdAt:        string;
  /** Checksum/hash to detect incompatible changes during resume. */
  contentHash:      string;
}

export interface WorkflowStepExecution {
  stepId:        string;
  nodeId:        string;
  nodeType:      WorkflowNodeType;
  state:         NodeExecutionState;
  startedAt:     string | null;
  completedAt:   string | null;
  output:        Record<string, unknown> | null;
  error:         string | null;
  attempts:      number;
  /** Whether this step was compensated. */
  compensated:   boolean;
}

export interface WorkflowExecution {
  workflowExecutionId: string;
  workflowId:          string;
  organizationId:      string;
  runtimeExecutionId:  string;
  status:              RuntimeStatus;
  steps:               WorkflowStepExecution[];
  /** IDs of completed steps — used to avoid re-execution on resume. */
  completedStepIds:    string[];
  /** IDs of failed steps. */
  failedStepIds:       string[];
  /** Current step index (for sequential mode). */
  currentStepIndex:    number;
  startedAt:           string;
  completedAt:         string | null;
}
