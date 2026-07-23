import type { Workflow, CreateWorkflowRequest, WorkflowUpdateFields } from '../models/WorkflowDefinition';
import type { IWorkflowRepository } from '../repositories/RepositoryInterfaces';
import { WorkflowNotFoundError } from '../errors/AutomationStudioErrors';

export class WorkflowService {
  constructor(
    private readonly repo: IWorkflowRepository,
    private readonly idGen: () => string,
    private readonly clock: () => string,
  ) {}

  async create(req: CreateWorkflowRequest): Promise<Workflow> {
    const now = this.clock();
    const id = this.idGen();
    const workflow: Workflow = {
      id,
      version: 1,
      createdAt: now,
      updatedAt: now,
      metadata: {},
      organizationId: req.organizationId,
      name: req.name,
      description: req.description,
      category: req.category,
      status: 'draft',
      currentVersion: 1,
      nodes: [],
      connections: [],
      versions: [],
      tags: req.tags ?? [],
      createdBy: req.createdBy,
      lastModifiedBy: req.createdBy,
      publishedAt: null,
      publishedBy: null,
    };
    return this.repo.create(workflow);
  }

  async findById(id: string): Promise<Workflow> {
    const wf = await this.repo.findById(id);
    if (!wf) throw new WorkflowNotFoundError(`Workflow not found: ${id}`);
    return wf;
  }

  async findByOrganization(organizationId: string): Promise<Workflow[]> {
    const result = await this.repo.findByOrganization(organizationId);
    return result.items;
  }

  async findPublished(organizationId: string): Promise<Workflow[]> {
    return this.repo.findPublished(organizationId);
  }

  async update(id: string, updates: WorkflowUpdateFields): Promise<Workflow> {
    const wf = await this.findById(id);
    return this.repo.update({
      ...wf,
      ...updates,
      updatedAt: this.clock(),
    });
  }

  async delete(id: string): Promise<boolean> {
    return this.repo.delete(id);
  }

  async save(id: string, nodes: Workflow['nodes'], connections: Workflow['connections']): Promise<Workflow> {
    const wf = await this.findById(id);
    return this.repo.update({
      ...wf,
      nodes,
      connections,
      updatedAt: this.clock(),
    });
  }
}
