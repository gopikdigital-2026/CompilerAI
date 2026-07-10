// ─── Node types ───────────────────────────────────────────────────────────────

export type NodeType =
  | 'agent' | 'condition' | 'api' | 'database' | 'email'
  | 'webhook' | 'loop' | 'wait' | 'document' | 'ai'
  | 'notification' | 'variables' | 'function' | 'subworkflow';

export type NodeState =
  | 'pending' | 'configured' | 'warning' | 'error' | 'running' | 'completed';

// ─── Port ─────────────────────────────────────────────────────────────────────

export interface Port {
  id:    string;
  label: string;
  type:  'input' | 'output';
}

// ─── Node ─────────────────────────────────────────────────────────────────────

export interface NodeComment {
  id:        string;
  text:      string;
  author:    string;
  createdAt: string;
}

export interface WorkflowNode {
  id:          string;
  type:        NodeType;
  label:       string;
  description: string;
  x:           number;
  y:           number;
  state:       NodeState;
  config:      Record<string, string | number | boolean>;
  inputs:      Port[];
  outputs:     Port[];
  comments:    NodeComment[];
  groupId?:    string;
  // Computed properties for display
  model?:         string;
  estimatedCostUsd?: number;
  estimatedTimeS?:   number;
}

// ─── Edge ─────────────────────────────────────────────────────────────────────

export interface WorkflowEdge {
  id:           string;
  sourceNodeId: string;
  sourcePortId: string;
  targetNodeId: string;
  targetPortId: string;
  label?:       string;
}

// ─── Validation ───────────────────────────────────────────────────────────────

export type ValidationSeverity = 'error' | 'warning';

export interface ValidationIssue {
  id:       string;
  severity: ValidationSeverity;
  nodeId?:  string;
  message:  string;
  category: 'connection' | 'config' | 'loop' | 'variable' | 'dependency';
}

// ─── Version history ──────────────────────────────────────────────────────────

export interface WorkflowVersion {
  id:        string;
  version:   string;
  label:     string;
  nodes:     WorkflowNode[];
  edges:     WorkflowEdge[];
  createdAt: string;
  author:    string;
}

// ─── Optimization ─────────────────────────────────────────────────────────────

export type OptimizationType = 'merge' | 'remove' | 'cost' | 'time' | 'reuse';

export interface OptimizationSuggestion {
  id:            string;
  type:          OptimizationType;
  title:         string;
  description:   string;
  savingPercent: number;
  affectedNodes: string[];
  effort:        'low' | 'medium' | 'high';
}

// ─── Full design ──────────────────────────────────────────────────────────────

export interface WorkflowDesign {
  id:          string;
  name:        string;
  description: string;
  nodes:       WorkflowNode[];
  edges:       WorkflowEdge[];
  versions:    WorkflowVersion[];
  createdAt:   string;
  updatedAt:   string;
}

// ─── Canvas view state ────────────────────────────────────────────────────────

export interface CanvasTransform {
  panX:  number;
  panY:  number;
  zoom:  number;
}

// ─── Palette item ─────────────────────────────────────────────────────────────

export interface PaletteItem {
  type:        NodeType;
  label:       string;
  description: string;
  category:    'trigger' | 'action' | 'control' | 'data' | 'ai' | 'util';
}
