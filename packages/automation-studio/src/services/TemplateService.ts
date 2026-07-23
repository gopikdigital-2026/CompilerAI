import type { TemplateLibrary } from './TemplateLibrary';
import type { WorkflowTemplate } from '../models/TemplateModels';
import type { Workflow, WorkflowCategory } from '../models/WorkflowDefinition';
import type { IWorkflowRepository } from '../repositories/RepositoryInterfaces';
import { TemplateNotFoundError } from '../errors/AutomationStudioErrors';

export class TemplateService {
  constructor(
    private readonly library: TemplateLibrary,
    private readonly workflowRepo: IWorkflowRepository,
    private readonly idGen: () => string,
    private readonly clock: () => string,
  ) {}

  async createFromTemplate(
    templateId: string,
    organizationId: string,
    createdBy: string,
    nameOverride?: string,
  ): Promise<Workflow> {
    const template = this.library.getById(templateId);
    if (!template) throw new TemplateNotFoundError(`Template not found: ${templateId}`);

    const now = this.clock();
    const wfId = this.idGen();

    const labelToId = new Map<string, string>();
    const nodes = template.nodes.map((spec, i) => {
      const nodeId = `${wfId}_node_${i}`;
      labelToId.set(spec.label, nodeId);
      return {
        id: nodeId,
        version: 1,
        createdAt: now,
        updatedAt: now,
        metadata: {},
        organizationId,
        type: spec.type,
        label: spec.label,
        workflowId: wfId,
        positionX: spec.positionX,
        positionY: spec.positionY,
        config: spec.config,
        status: 'idle' as const,
        validationErrors: [],
      };
    });

    const connections = template.connections.map((spec, i) => ({
      id: `${wfId}_conn_${i}`,
      workflowId: wfId,
      fromNodeId: labelToId.get(spec.fromLabel) ?? spec.fromLabel,
      toNodeId: labelToId.get(spec.toLabel) ?? spec.toLabel,
      fromPort: spec.fromPort,
      toPort: spec.toPort,
      label: null,
    }));

    const workflow: Workflow = {
      id: wfId,
      version: 1,
      createdAt: now,
      updatedAt: now,
      metadata: {},
      organizationId,
      name: nameOverride ?? template.name,
      description: template.description,
      category: template.category as WorkflowCategory,
      status: 'draft',
      currentVersion: 1,
      nodes,
      connections,
      versions: [],
      tags: template.tags,
      createdBy,
      lastModifiedBy: createdBy,
      publishedAt: null,
      publishedBy: null,
    };

    return this.workflowRepo.create(workflow);
  }

  getTemplates(): WorkflowTemplate[] {
    return this.library.getAll();
  }

  getTemplate(id: string): WorkflowTemplate {
    return this.library.getById(id);
  }

  searchTemplates(query: string): WorkflowTemplate[] {
    return this.library.search(query);
  }
}
