import type { WorkflowNode, WorkflowConnection, NodeType } from '../models/WorkflowModels';
import type { Workflow } from '../models/WorkflowDefinition';
import type { IWorkflowRepository } from '../repositories/RepositoryInterfaces';
import { NodeRegistry } from './NodeRegistry';
import { WorkflowValidator } from './WorkflowValidator';
import { WorkflowNotFoundError } from '../errors/AutomationStudioErrors';

export interface AddNodeRequest {
  workflowId: string;
  type: NodeType;
  label?: string;
  positionX: number;
  positionY: number;
  config?: Record<string, unknown>;
}

export interface AddConnectionRequest {
  workflowId: string;
  fromNodeId: string;
  toNodeId: string;
  fromPort: string;
  toPort: string;
  label?: string;
}

export class WorkflowBuilder {
  constructor(
    private readonly repo: IWorkflowRepository,
    private readonly nodeRegistry: NodeRegistry,
    private readonly validator: WorkflowValidator,
    private readonly idGen: () => string,
    private readonly clock: () => string,
  ) {}

  async addNode(req: AddNodeRequest): Promise<WorkflowNode> {
    const workflow = await this.getWorkflow(req.workflowId);
    const def = this.nodeRegistry.getDefinition(req.type);
    const now = this.clock();
    const id = this.idGen();
    const config = req.config ?? this.nodeRegistry.getDefaultConfig(req.type);

    const node: WorkflowNode = {
      id,
      version: 1,
      createdAt: now,
      updatedAt: now,
      metadata: {},
      organizationId: workflow.organizationId,
      type: req.type,
      label: req.label ?? def.label,
      workflowId: req.workflowId,
      positionX: req.positionX,
      positionY: req.positionY,
      config,
      status: 'idle',
      validationErrors: [],
    };

    const nodes = [...workflow.nodes, node];
    await this.repo.update({ ...workflow, nodes, lastModifiedBy: '', updatedAt: now });
    return node;
  }

  async removeNode(workflowId: string, nodeId: string): Promise<void> {
    const workflow = await this.getWorkflow(workflowId);
    const nodes = workflow.nodes.filter((n) => n.id !== nodeId);
    const connections = workflow.connections.filter(
      (c) => c.fromNodeId !== nodeId && c.toNodeId !== nodeId,
    );
    await this.repo.update({ ...workflow, nodes, connections, updatedAt: this.clock() });
  }

  async updateNode(
    workflowId: string,
    nodeId: string,
    updates: Partial<Pick<WorkflowNode, 'label' | 'config' | 'positionX' | 'positionY'>>,
  ): Promise<WorkflowNode> {
    const workflow = await this.getWorkflow(workflowId);
    const node = workflow.nodes.find((n) => n.id === nodeId);
    if (!node) throw new WorkflowNotFoundError(`Node not found: ${nodeId}`);

    const updated: WorkflowNode = {
      ...node,
      ...updates,
      updatedAt: this.clock(),
      version: node.version + 1,
    };

    const nodeValidation = this.validator.validateNode(updated, workflow.connections);
    updated.status = nodeValidation.valid ? 'valid' : 'invalid';
    updated.validationErrors = nodeValidation.errors;

    const nodes = workflow.nodes.map((n) => (n.id === nodeId ? updated : n));
    await this.repo.update({ ...workflow, nodes, updatedAt: this.clock() });
    return updated;
  }

  async moveNode(workflowId: string, nodeId: string, positionX: number, positionY: number): Promise<WorkflowNode> {
    return this.updateNode(workflowId, nodeId, { positionX, positionY });
  }

  async addConnection(req: AddConnectionRequest): Promise<WorkflowConnection> {
    const workflow = await this.getWorkflow(req.workflowId);
    const id = this.idGen();
    const connection: WorkflowConnection = {
      id,
      workflowId: req.workflowId,
      fromNodeId: req.fromNodeId,
      toNodeId: req.toNodeId,
      fromPort: req.fromPort,
      toPort: req.toPort,
      label: req.label ?? null,
    };
    const connections = [...workflow.connections, connection];
    await this.repo.update({ ...workflow, connections, updatedAt: this.clock() });
    return connection;
  }

  async removeConnection(workflowId: string, connectionId: string): Promise<void> {
    const workflow = await this.getWorkflow(workflowId);
    const connections = workflow.connections.filter((c) => c.id !== connectionId);
    await this.repo.update({ ...workflow, connections, updatedAt: this.clock() });
  }

  async getNodes(workflowId: string): Promise<WorkflowNode[]> {
    const workflow = await this.getWorkflow(workflowId);
    return workflow.nodes;
  }

  async getConnections(workflowId: string): Promise<WorkflowConnection[]> {
    const workflow = await this.getWorkflow(workflowId);
    return workflow.connections;
  }

  private async getWorkflow(workflowId: string): Promise<Workflow> {
    const wf = await this.repo.findById(workflowId);
    if (!wf) throw new WorkflowNotFoundError(`Workflow not found: ${workflowId}`);
    return wf;
  }
}
