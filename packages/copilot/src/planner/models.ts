export type NodeType = 'trigger' | 'action' | 'condition' | 'transform' | 'merge' | 'split';
export type EdgeType = 'success' | 'failure' | 'conditional' | 'always';
export type ErrorPolicy = 'fail' | 'continue' | 'retry' | 'skip';

export interface DAGNode {
  id: string;
  type: NodeType;
  label: string;
  connectorId: string | null;
  capabilityName: string | null;
  operation: string | null;
  parameters: Record<string, unknown>;
  errorPolicy: ErrorPolicy;
  timeoutMs: number;
  retries: number;
  dependsOn: string[];
  produces: string[]; // variable names this node outputs
  consumes: string[]; // variable names this node needs
}

export interface DAGEdge {
  id: string;
  from: string;
  to: string;
  type: EdgeType;
  condition: string | null;
  label: string;
}

export interface WorkflowDAG {
  id: string;
  name: string;
  description: string;
  nodes: DAGNode[];
  edges: DAGEdge[];
  executionOrder: string[]; // topologically sorted node ids
  estimatedDurationMs: number;
  requiredConnectors: string[];
  requiredCapabilities: string[];
}
