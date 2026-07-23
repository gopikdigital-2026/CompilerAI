import type { Workflow, WorkflowCategory } from './WorkflowDefinition';
import type { NodeType } from './WorkflowModels';

export interface TemplateNodeSpec {
  type: NodeType;
  label: string;
  positionX: number;
  positionY: number;
  config: Record<string, unknown>;
}

export interface TemplateConnectionSpec {
  fromLabel: string;
  toLabel: string;
  fromPort: string;
  toPort: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: WorkflowCategory;
  icon: string;
  tags: string[];
  nodes: TemplateNodeSpec[];
  connections: TemplateConnectionSpec[];
}

export function templateToWorkflow(
  template: WorkflowTemplate,
  workflow: Workflow,
  nodeMap: Map<string, string>,
): { nodes: WorkflowTemplate['nodes']; connections: WorkflowTemplate['connections'] } {
  void workflow;
  void nodeMap;
  return { nodes: template.nodes, connections: template.connections };
}
