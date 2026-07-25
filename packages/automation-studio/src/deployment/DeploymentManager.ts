import type { Workflow } from '../models/WorkflowDefinition.js';
import type { ExportFormat, ExportedNode, ExportedConnection, ExportedWorkflow } from '../models/PublicationModels.js';
import { WorkflowValidator } from '../designer/WorkflowValidator.js';
import type { IRuntimeAdapter } from '../integrations/IntegrationAdapters.js';
import { WorkflowValidationError } from '../errors/AutomationStudioErrors.js';

export type DeploymentStatus = 'draft' | 'published' | 'active' | 'inactive' | 'archived';

export interface DeploymentInfo {
  workflowId: string;
  workflowName: string;
  status: DeploymentStatus;
  version: number;
  publishedAt: string | null;
  publishedBy: string | null;
  deploymentId: string | null;
  activeExecutions: number;
}

export interface DeploymentResult {
  success: boolean;
  deploymentId: string | null;
  version: number;
  message: string;
  validationErrors: string[];
}

function mapStatus(status: Workflow['status']): DeploymentStatus {
  switch (status) {
    case 'published':
      return 'active';
    case 'unpublished':
      return 'inactive';
    case 'archived':
      return 'archived';
    case 'validated':
      return 'draft';
    case 'draft':
    default:
      return 'draft';
  }
}

export class DeploymentManager {
  constructor(
    private readonly validator: WorkflowValidator,
    private readonly runtimeAdapter: IRuntimeAdapter,
    private readonly idGen: () => string,
    private readonly clock: () => string,
  ) {}

  async publish(
    workflow: Workflow,
    _publishedBy: string,
    _changelog: string = '',
  ): Promise<DeploymentResult> {
    const validation = this.validator.validate(workflow);
    if (!validation.valid) {
      return {
        success: false,
        deploymentId: null,
        version: workflow.currentVersion,
        message: 'Validation failed',
        validationErrors: validation.errors,
      };
    }

    const now = this.clock();
    const newVersion = workflow.currentVersion + 1;
    const snapshot = {
      nodes: workflow.nodes.map((n) => ({ ...n })),
      connections: workflow.connections.map((c) => ({ ...c })),
      version: workflow.currentVersion,
      capturedAt: now,
    };

    let deploymentId: string | null = null;
    if (this.runtimeAdapter.isAvailable()) {
      deploymentId = await this.runtimeAdapter.deploy(workflow.id, newVersion, snapshot);
    }

    return {
      success: true,
      deploymentId,
      version: newVersion,
      message: `Workflow published as version ${newVersion}`,
      validationErrors: [],
    };
  }

  async deactivate(
    workflow: Workflow,
    _deactivatedBy: string,
  ): Promise<DeploymentResult> {
    if (workflow.status !== 'published') {
      return {
        success: false,
        deploymentId: null,
        version: workflow.currentVersion,
        message: 'Workflow is not published',
        validationErrors: ['Cannot deactivate a workflow that is not published'],
      };
    }
    return {
      success: true,
      deploymentId: null,
      version: workflow.currentVersion,
      message: 'Workflow deactivated',
      validationErrors: [],
    };
  }

  async activate(
    workflow: Workflow,
    _activatedBy: string,
  ): Promise<DeploymentResult> {
    if (workflow.status !== 'published' && workflow.status !== 'unpublished') {
      return {
        success: false,
        deploymentId: null,
        version: workflow.currentVersion,
        message: 'Workflow must be published or previously published to activate',
        validationErrors: ['Invalid status for activation'],
      };
    }
    let deploymentId: string | null = null;
    if (this.runtimeAdapter.isAvailable()) {
      deploymentId = await this.runtimeAdapter.deploy(workflow.id, workflow.currentVersion, {
        nodes: workflow.nodes,
        connections: workflow.connections,
      });
    }
    return {
      success: true,
      deploymentId,
      version: workflow.currentVersion,
      message: 'Workflow activated',
      validationErrors: [],
    };
  }

  async archive(
    workflow: Workflow,
    _archivedBy: string,
  ): Promise<DeploymentResult> {
    if (workflow.status === 'archived') {
      return {
        success: false,
        deploymentId: null,
        version: workflow.currentVersion,
        message: 'Workflow is already archived',
        validationErrors: [],
      };
    }
    return {
      success: true,
      deploymentId: null,
      version: workflow.currentVersion,
      message: 'Workflow archived',
      validationErrors: [],
    };
  }

  async duplicate(
    workflow: Workflow,
    newName: string,
    duplicatedBy: string,
  ): Promise<Workflow> {
    const now = this.clock();
    const cloneId = this.idGen();
    return {
      ...workflow,
      id: cloneId,
      name: newName,
      status: 'draft',
      currentVersion: 1,
      versions: [],
      publishedAt: null,
      publishedBy: null,
      createdAt: now,
      updatedAt: now,
      lastModifiedBy: duplicatedBy,
      metadata: {},
    };
  }

  exportWorkflow(workflow: Workflow): ExportFormat {
    const nodes: ExportedNode[] = workflow.nodes.map((n) => ({
      type: n.type,
      label: n.label,
      positionX: n.positionX,
      positionY: n.positionY,
      config: n.config,
    }));

    const labelMap = new Map(workflow.nodes.map((n) => [n.id, n.label]));
    const connections: ExportedConnection[] = workflow.connections.map((c) => ({
      fromLabel: labelMap.get(c.fromNodeId) ?? c.fromNodeId,
      toLabel: labelMap.get(c.toNodeId) ?? c.toNodeId,
      fromPort: c.fromPort,
      toPort: c.toPort,
    }));

    const exportedWorkflow: ExportedWorkflow = {
      name: workflow.name,
      description: workflow.description,
      category: workflow.category,
      tags: workflow.tags,
      nodes,
      connections,
    };

    return {
      format: 'json',
      version: '1.0.0',
      exportedAt: this.clock(),
      workflow: exportedWorkflow,
    };
  }

  async importWorkflow(
    data: ExportFormat,
    organizationId: string,
    createdBy: string,
  ): Promise<Workflow> {
    if (data.format !== 'json' || !data.workflow) {
      throw new WorkflowValidationError('Invalid import format', ['format must be json']);
    }
    const wf = data.workflow;
    if (!wf.nodes || wf.nodes.length === 0) {
      throw new WorkflowValidationError('Invalid import', ['Imported workflow has no nodes']);
    }

    const now = this.clock();
    const id = this.idGen();

    const nodes = wf.nodes.map((n, i) => ({
      id: `${id}_node_${i}`,
      version: 1,
      createdAt: now,
      updatedAt: now,
      metadata: {},
      organizationId,
      type: n.type as Workflow['nodes'][number]['type'],
      label: n.label,
      workflowId: id,
      positionX: n.positionX,
      positionY: n.positionY,
      config: n.config,
      status: 'idle' as const,
      validationErrors: [] as string[],
    }));

    const labelToId = new Map(nodes.map((n) => [n.label, n.id]));
    const connections = wf.connections.map((c, i) => ({
      id: `${id}_conn_${i}`,
      workflowId: id,
      fromNodeId: labelToId.get(c.fromLabel) ?? c.fromLabel,
      toNodeId: labelToId.get(c.toLabel) ?? c.toLabel,
      fromPort: c.fromPort,
      toPort: c.toPort,
      label: null as string | null,
    }));

    return {
      id,
      version: 1,
      createdAt: now,
      updatedAt: now,
      metadata: {},
      organizationId,
      name: wf.name,
      description: wf.description,
      category: (wf.category as Workflow['category']) ?? 'custom',
      status: 'draft',
      currentVersion: 1,
      nodes,
      connections,
      versions: [],
      tags: wf.tags ?? [],
      createdBy,
      lastModifiedBy: createdBy,
      publishedAt: null,
      publishedBy: null,
    };
  }

  getDeploymentInfo(workflow: Workflow): DeploymentInfo {
    return {
      workflowId: workflow.id,
      workflowName: workflow.name,
      status: mapStatus(workflow.status),
      version: workflow.currentVersion,
      publishedAt: workflow.publishedAt,
      publishedBy: workflow.publishedBy,
      deploymentId: null,
      activeExecutions: 0,
    };
  }
}
