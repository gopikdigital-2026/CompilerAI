export type SimulationStepStatus = 'skipped' | 'success' | 'failure' | 'conditional_skip';

export interface SimulationStep {
  nodeId: string;
  nodeLabel: string;
  status: SimulationStepStatus;
  estimatedDurationMs: number;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  errors: string[];
  warnings: string[];
  skippedReason: string | null;
}

export interface SimulationResult {
  dryRun: true;
  workflowId: string;
  workflowName: string;
  success: boolean;
  steps: SimulationStep[];
  totalEstimatedDurationMs: number;
  preflightErrors: string[];
  preflightWarnings: string[];
  executionPath: string[];   // ordered list of node ids that would execute
  skippedNodes: string[];    // nodes that would be skipped
  requiredPermissions: string[];
  missingConnectors: string[];
}
