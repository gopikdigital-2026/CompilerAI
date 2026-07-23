import type { OrganizationScopedEntity, Metadata } from '../types/shared';

export type NodeType =
  | 'trigger'
  | 'ai_agent'
  | 'decision'
  | 'human_approval'
  | 'tool'
  | 'condition'
  | 'loop'
  | 'delay'
  | 'notification'
  | 'end';

export type NodeCategory = 'trigger' | 'action' | 'logic' | 'human' | 'terminal';

export type NodeStatus = 'idle' | 'valid' | 'invalid' | 'warning';

export interface NodePort {
  name: string;
  label: string;
  type: 'input' | 'output';
  dataType: string;
  required: boolean;
}

export interface NodePropertyDescriptor {
  name: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'textarea' | 'json';
  required: boolean;
  defaultValue: unknown;
  options?: string[];
  description?: string;
}

export interface NodeDefinition {
  type: NodeType;
  category: NodeCategory;
  label: string;
  icon: string;
  description: string;
  inputs: NodePort[];
  outputs: NodePort[];
  properties: NodePropertyDescriptor[];
  maxInputs: number;
  maxOutputs: number;
  allowMultipleOutputs: boolean;
}

export interface WorkflowNode extends OrganizationScopedEntity {
  type: NodeType;
  label: string;
  workflowId: string;
  positionX: number;
  positionY: number;
  config: Record<string, unknown>;
  status: NodeStatus;
  validationErrors: string[];
}

export interface WorkflowConnection {
  id: string;
  workflowId: string;
  fromNodeId: string;
  toNodeId: string;
  fromPort: string;
  toPort: string;
  label: string | null;
}

export type ConnectionCollection = WorkflowConnection[];

export interface WorkflowNodeMap {
  [nodeId: string]: WorkflowNode;
}

export type { Metadata };
