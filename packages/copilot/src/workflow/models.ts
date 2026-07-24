import type { WorkflowDAG } from '../planner/models.js';
import type { ValidationResult } from '../validator/models.js';

export type WorkflowStepType = 'trigger' | 'action' | 'condition' | 'transform';
export type WorkflowStatus = 'draft' | 'valid' | 'invalid' | 'ready';

export interface WorkflowParameterValue {
  value: string | number | boolean | null;
  type: 'literal' | 'reference' | 'expression';
  ref?: string;
}

export interface WorkflowCondition {
  field: string;
  operator: string;
  value: string | number | boolean | null;
}

export interface WorkflowStep {
  id: string;
  type: WorkflowStepType;
  name: string;
  connectorId: string | null;
  capability: string | null;
  parameters: Record<string, WorkflowParameterValue>;
  conditions: WorkflowCondition[];
  errorPolicy: 'fail' | 'continue' | 'retry' | 'skip';
  timeoutMs: number;
  retries: number;
  dependsOn: string[];
}

export interface GeneratedWorkflow {
  id: string;
  name: string;
  description: string;
  version: string;
  status: WorkflowStatus;
  trigger: WorkflowStep;
  steps: WorkflowStep[];
  dag: WorkflowDAG; // reference to the source DAG
  createdAt: string;
  metadata: {
    sourceInstruction: string;
    parserConfidence: number;
    validationResult: ValidationResult;
    estimatedDurationMs: number;
    requiredConnectors: string[];
  };
}
