import type { Workflow } from '../models/WorkflowDefinition';
import type { WorkflowSnapshot, WorkflowVersion } from '../models/WorkflowDefinition';
import type { Publication, PublishRequest, ExportFormat, ExportedWorkflow, ExportedNode, ExportedConnection, ImportRequest } from '../models/PublicationModels';
import type { IPublicationRepository, IWorkflowRepository } from '../repositories/RepositoryInterfaces';
import type { IRuntimeAdapter } from '../integrations/IntegrationAdapters';
import { WorkflowNotFoundError, WorkflowValidationError, PublicationNotFoundError, WorkflowAlreadyPublishedError, WorkflowNotPublishedError, ImportExportError } from '../errors/AutomationStudioErrors';
import { WorkflowValidator } from '../designer/WorkflowValidator';

export class PublishingService {
  constructor(
    private readonly workflowRepo: IWorkflowRepository,
    private readonly publicationRepo: IPublicationRepository,
    private readonly validator: WorkflowValidator,
    private readonly runtimeAdapter: IRuntimeAdapter,
    private readonly idGen: () => string,
    private readonly clock: () => string,
  ) {}

  async publish(req: PublishRequest): Promise<Publication> {
    const workflow = await this.getWorkflow(req.workflowId);

    const existing = await this.publicationRepo.findActiveByWorkflow(req.workflowId);
    if (existing) {
      throw new WorkflowAlreadyPublishedError(`Workflow ${req.workflowId} is already published`);
    }

    const validation = this.validator.validate(workflow);
    if (!validation.valid) {
      throw new WorkflowValidationError('Cannot publish invalid workflow', validation.errors);
    }

    const snapshot = this.captureSnapshot(workflow);
    const newVersion = workflow.currentVersion + 1;
    const now = this.clock();

    const versionEntry: WorkflowVersion = {
      version: newVersion,
      status: 'published',
      publishedAt: now,
      publishedBy: req.publishedBy,
      changelog: req.changelog,
      snapshot,
    };

    const updatedWorkflow: Workflow = {
      ...workflow,
      status: 'published',
      currentVersion: newVersion,
      versions: [...workflow.versions, versionEntry],
      publishedAt: now,
      publishedBy: req.publishedBy,
      lastModifiedBy: req.publishedBy,
      updatedAt: now,
    };
    await this.workflowRepo.update(updatedWorkflow);

    let deploymentId: string | null = null;
    if (this.runtimeAdapter.isAvailable()) {
      deploymentId = await this.runtimeAdapter.deploy(workflow.id, newVersion, snapshot);
    }

    const publication: Publication = {
      id: this.idGen(),
      version: 1,
      createdAt: now,
      updatedAt: now,
      metadata: {},
      organizationId: req.organizationId,
      workflowId: req.workflowId,
      workflowVersion: newVersion,
      status: 'active',
      publishedBy: req.publishedBy,
      unpublishedBy: null,
      publishedAt: now,
      unpublishedAt: null,
      snapshot,
      runtimeDeploymentId: deploymentId,
    };

    return this.publicationRepo.create(publication);
  }

  async unpublish(workflowId: string, unpublishedBy: string): Promise<Publication> {
    const pub = await this.publicationRepo.findActiveByWorkflow(workflowId);
    if (!pub) {
      throw new WorkflowNotPublishedError(`Workflow ${workflowId} is not published`);
    }

    const now = this.clock();
    if (pub.runtimeDeploymentId && this.runtimeAdapter.isAvailable()) {
      await this.runtimeAdapter.undeploy(pub.runtimeDeploymentId);
    }

    const updated: Publication = {
      ...pub,
      status: 'inactive',
      unpublishedBy,
      unpublishedAt: now,
      updatedAt: now,
    };
    const result = await this.publicationRepo.update(updated);

    const workflow = await this.getWorkflow(workflowId);
    await this.workflowRepo.update({
      ...workflow,
      status: 'unpublished',
      lastModifiedBy: unpublishedBy,
      updatedAt: now,
    });

    return result;
  }

  async clone(workflowId: string, newName: string, clonedBy: string): Promise<Workflow> {
    const workflow = await this.getWorkflow(workflowId);
    const now = this.clock();
    const cloneId = this.idGen();

    const cloned: Workflow = {
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
      lastModifiedBy: clonedBy,
      metadata: {},
    };

    return this.workflowRepo.create(cloned);
  }

  async export(workflowId: string): Promise<ExportFormat> {
    const workflow = await this.getWorkflow(workflowId);

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

  async import(req: ImportRequest): Promise<Workflow> {
    const data = req.data;
    if (!data || data.format !== 'json' || !data.workflow) {
      throw new ImportExportError('Invalid import format');
    }

    const wf = data.workflow;
    if (!wf.nodes || wf.nodes.length === 0) {
      throw new ImportExportError('Imported workflow has no nodes');
    }

    const now = this.clock();
    const id = this.idGen();
    const trigger = wf.nodes.find((n) => n.type === 'trigger');

    const nodes = wf.nodes.map((n, i) => ({
      id: `${id}_node_${i}`,
      version: 1,
      createdAt: now,
      updatedAt: now,
      metadata: {},
      organizationId: req.organizationId,
      type: n.type as Workflow['nodes'][number]['type'],
      label: n.label,
      workflowId: id,
      positionX: n.positionX,
      positionY: n.positionY,
      config: n.config,
      status: 'idle' as const,
      validationErrors: [],
    }));

    const labelToId = new Map(nodes.map((n) => [n.label, n.id]));
    const connections = wf.connections.map((c, i) => ({
      id: `${id}_conn_${i}`,
      workflowId: id,
      fromNodeId: labelToId.get(c.fromLabel) ?? c.fromLabel,
      toNodeId: labelToId.get(c.toLabel) ?? c.toLabel,
      fromPort: c.fromPort,
      toPort: c.toPort,
      label: null,
    }));

    const workflow: Workflow = {
      id,
      version: 1,
      createdAt: now,
      updatedAt: now,
      metadata: {},
      organizationId: req.organizationId,
      name: req.nameOverride ?? wf.name,
      description: wf.description,
      category: (wf.category as Workflow['category']) ?? 'custom',
      status: 'draft',
      currentVersion: 1,
      nodes,
      connections,
      versions: [],
      tags: wf.tags ?? [],
      createdBy: req.createdBy,
      lastModifiedBy: req.createdBy,
      publishedAt: null,
      publishedBy: null,
    };

    void trigger;
    return this.workflowRepo.create(workflow);
  }

  async getPublications(workflowId: string): Promise<Publication[]> {
    return this.publicationRepo.findByWorkflow(workflowId);
  }

  async getActivePublication(workflowId: string): Promise<Publication | null> {
    return this.publicationRepo.findActiveByWorkflow(workflowId);
  }

  async rollback(workflowId: string, targetVersion: number, rolledBy: string): Promise<Workflow> {
    const workflow = await this.getWorkflow(workflowId);
    const versionEntry = workflow.versions.find((v) => v.version === targetVersion);
    if (!versionEntry) {
      throw new PublicationNotFoundError(`Version ${targetVersion} not found for workflow ${workflowId}`);
    }

    const now = this.clock();
    const rolled: Workflow = {
      ...workflow,
      nodes: versionEntry.snapshot.nodes,
      connections: versionEntry.snapshot.connections,
      status: 'draft',
      lastModifiedBy: rolledBy,
      updatedAt: now,
      metadata: { ...workflow.metadata, rolledBackFrom: workflow.currentVersion, rolledBackTo: targetVersion },
    };

    return this.workflowRepo.update(rolled);
  }

  private captureSnapshot(workflow: Workflow): WorkflowSnapshot {
    return {
      nodes: workflow.nodes.map((n) => ({ ...n })),
      connections: workflow.connections.map((c) => ({ ...c })),
      version: workflow.currentVersion,
      capturedAt: this.clock(),
    };
  }

  private async getWorkflow(id: string): Promise<Workflow> {
    const wf = await this.workflowRepo.findById(id);
    if (!wf) throw new WorkflowNotFoundError(`Workflow not found: ${id}`);
    return wf;
  }
}
