import type { OrganizationScopedEntity } from '../types/shared';
import type { NodeType } from './WorkflowModels';

export type SimulationStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export type SimulatedNodeStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface SimulationNodeResult {
  nodeId: string;
  nodeLabel: string;
  nodeType: NodeType;
  status: SimulatedNodeStatus;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number;
  output: Record<string, unknown>;
  decisions: string[];
  toolsUsed: string[];
  cost: number;
  confidenceScore: number;
  error: string | null;
}

export interface SimulationDecision {
  nodeId: string;
  nodeLabel: string;
  branch: string;
  reason: string;
  timestamp: string;
}

export interface SimulationToolUsage {
  nodeId: string;
  toolName: string;
  toolVersion: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  durationMs: number;
}

export interface SimulationPath {
  nodeIds: string[];
  edges: Array<{ from: string; to: string }>;
}

export interface SimulationResult {
  status: SimulationStatus;
  nodeResults: SimulationNodeResult[];
  path: SimulationPath;
  decisions: SimulationDecision[];
  toolsUsed: SimulationToolUsage[];
  totalDurationMs: number;
  estimatedCost: number;
  averageConfidence: number;
  error: string | null;
}

export interface Simulation extends OrganizationScopedEntity {
  workflowId: string;
  workflowVersion: number;
  status: SimulationStatus;
  triggeredBy: string;
  result: SimulationResult | null;
  startedAt: string;
  completedAt: string | null;
}

export interface SimulationRequest {
  organizationId: string;
  workflowId: string;
  triggeredBy: string;
  input?: Record<string, unknown>;
  maxSteps?: number;
}
