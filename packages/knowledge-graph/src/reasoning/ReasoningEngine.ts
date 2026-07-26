import type {
  Entity,
  IKnowledgeGraph,
  IReasoningEngine,
  KnowledgeGap,
  ReasoningQuery,
  ReasoningResult,
  Relationship,
} from '../models.js';
import type { Ontology } from '../ontology/Ontology.js';

export class ReasoningEngine implements IReasoningEngine {
  private readonly graph: IKnowledgeGraph;
  private readonly ontology: Ontology;
  private readonly telemetry?: { emit: (e: { type: string; timestamp: string; metadata: Record<string, unknown> }) => void };

  constructor(
    graph: IKnowledgeGraph,
    ontology: Ontology,
    telemetry?: { emit: (e: { type: string; timestamp: string; metadata: Record<string, unknown> }) => void },
  ) {
    this.graph = graph;
    this.ontology = ontology;
    this.telemetry = telemetry;
  }

  query(q: ReasoningQuery): ReasoningResult {
    this.emitTelemetry('graph.reasoning.executed', { queryType: q.type, entityId: q.entityId });

    switch (q.type) {
      case 'related_documents':
        return this.getRelatedDocuments(q.entityId);
      case 'agents_on_customer':
        return this.getAgentsOnCustomer(q.entityId);
      case 'workflows_affecting_incident':
        return this.getWorkflowsAffectingIncident(q.entityId);
      case 'missing_information':
        return this.getMissingInformation(q.entityId);
      case 'entity_dependencies':
        return this.getEntityDependencies(q.entityId);
      case 'entity_timeline':
        return this.getEntityTimeline(q.entityId);
      case 'impact_analysis':
        return this.getImpactAnalysis(q.entityId);
      case 'knowledge_gaps':
        return this.getKnowledgeGaps(q.entityId);
      default:
        return this.emptyResult(q);
    }
  }

  getRelatedDocuments(entityId: string): ReasoningResult {
    const entity = this.graph.getEntity(entityId);
    if (!entity) return this.emptyResult({ type: 'related_documents', entityId, organizationId: '' });

    const visited = new Set<string>();
    const resultEntities: Entity[] = [];
    const resultRels: Relationship[] = [];

    const traverse = (id: string, depth: number) => {
      if (depth > 3 || visited.has(id)) return;
      visited.add(id);
      const neighbors = this.graph.getNeighbors(id);
      for (const neighbor of neighbors) {
        if (neighbor.entity.type === 'document' || neighbor.entity.type === 'file' || neighbor.entity.type === 'email') {
          if (!resultEntities.some((e) => e.id === neighbor.entity.id)) {
            resultEntities.push(neighbor.entity);
            resultRels.push(neighbor.relationship);
          }
        }
        if (depth < 3) traverse(neighbor.entity.id, depth + 1);
      }
    };
    traverse(entityId, 0);

    const gaps = this.identifyGaps(entity, resultEntities);
    return {
      query: { type: 'related_documents', entityId, organizationId: entity.organizationId },
      answer: `Found ${resultEntities.length} related documents for entity '${entity.properties.name ?? entityId}'.`,
      entities: resultEntities,
      relationships: resultRels,
      confidence: resultEntities.length > 0 ? 0.85 : 0.3,
      gaps,
    };
  }

  getAgentsOnCustomer(customerId: string): ReasoningResult {
    const customer = this.graph.getEntity(customerId);
    if (!customer) return this.emptyResult({ type: 'agents_on_customer', entityId: customerId, organizationId: '' });

    const resultEntities: Entity[] = [];
    const resultRels: Relationship[] = [];

    const neighbors = this.graph.getNeighbors(customerId);
    for (const neighbor of neighbors) {
      if (neighbor.entity.type === 'agent' || neighbor.entity.type === 'user' || neighbor.entity.type === 'employee') {
        resultEntities.push(neighbor.entity);
        resultRels.push(neighbor.relationship);
      }
      // Second hop: tasks assigned to agents related to this customer
      if (neighbor.entity.type === 'task' || neighbor.entity.type === 'project') {
        const subNeighbors = this.graph.getNeighbors(neighbor.entity.id);
        for (const sub of subNeighbors) {
          if (sub.entity.type === 'agent' && !resultEntities.some((e) => e.id === sub.entity.id)) {
            resultEntities.push(sub.entity);
            resultRels.push(sub.relationship);
          }
        }
      }
    }

    return {
      query: { type: 'agents_on_customer', entityId: customerId, organizationId: customer.organizationId },
      answer: `${resultEntities.length} agents/users have worked on customer '${customer.properties.name ?? customerId}'.`,
      entities: resultEntities,
      relationships: resultRels,
      confidence: resultEntities.length > 0 ? 0.88 : 0.2,
      gaps: [],
    };
  }

  getWorkflowsAffectingIncident(incidentId: string): ReasoningResult {
    const incident = this.graph.getEntity(incidentId);
    if (!incident) return this.emptyResult({ type: 'workflows_affecting_incident', entityId: incidentId, organizationId: '' });

    const resultEntities: Entity[] = [];
    const resultRels: Relationship[] = [];

    const visited = new Set<string>();
    const traverse = (id: string, depth: number) => {
      if (depth > 4 || visited.has(id)) return;
      visited.add(id);
      const neighbors = this.graph.getNeighbors(id);
      for (const neighbor of neighbors) {
        if (neighbor.entity.type === 'workflow') {
          if (!resultEntities.some((e) => e.id === neighbor.entity.id)) {
            resultEntities.push(neighbor.entity);
            resultRels.push(neighbor.relationship);
          }
        }
        if (depth < 4) traverse(neighbor.entity.id, depth + 1);
      }
    };
    traverse(incidentId, 0);

    return {
      query: { type: 'workflows_affecting_incident', entityId: incidentId, organizationId: incident.organizationId },
      answer: `${resultEntities.length} workflows affect incident '${incident.properties.title ?? incidentId}'.`,
      entities: resultEntities,
      relationships: resultRels,
      confidence: resultEntities.length > 0 ? 0.82 : 0.25,
      gaps: [],
    };
  }

  getMissingInformation(taskId: string): ReasoningResult {
    const task = this.graph.getEntity(taskId);
    if (!task) return this.emptyResult({ type: 'missing_information', entityId: taskId, organizationId: '' });

    const gaps: KnowledgeGap[] = [];
    const neighbors = this.graph.getNeighbors(taskId);

    const hasAssignee = neighbors.some((n) => n.relationship.type === 'assigned_to');
    if (!hasAssignee) {
      gaps.push({
        description: `Task '${task.properties.title ?? taskId}' has no assigned agent or user`,
        missingEntityType: 'agent',
        relatedEntityId: taskId,
      });
    }

    const hasProject = neighbors.some((n) => n.entity.type === 'project' || n.relationship.type === 'belongs_to');
    if (!hasProject) {
      gaps.push({
        description: `Task is not linked to any project`,
        missingEntityType: 'project',
        relatedEntityId: taskId,
      });
    }

    const hasDependencies = neighbors.some((n) => n.relationship.type === 'depends_on');
    if (!hasDependencies && task.properties.status !== 'completed') {
      gaps.push({
        description: `Task has no defined dependencies — consider if it truly has none`,
        relatedEntityId: taskId,
      });
    }

    const requiredProps = this.ontology.getEntityDef(task.type)?.requiredProperties ?? [];
    for (const prop of requiredProps) {
      if (task.properties[prop] === undefined) {
        gaps.push({
          description: `Required property '${prop}' is missing from task`,
          relatedEntityId: taskId,
        });
      }
    }

    return {
      query: { type: 'missing_information', entityId: taskId, organizationId: task.organizationId },
      answer: gaps.length === 0
        ? `No missing information detected for task '${task.properties.title ?? taskId}'.`
        : `${gaps.length} information gaps found for task '${task.properties.title ?? taskId}'.`,
      entities: [],
      relationships: [],
      confidence: gaps.length === 0 ? 0.90 : 0.75,
      gaps,
    };
  }

  getEntityDependencies(entityId: string): ReasoningResult {
    const entity = this.graph.getEntity(entityId);
    if (!entity) return this.emptyResult({ type: 'entity_dependencies', entityId, organizationId: '' });

    const resultEntities: Entity[] = [];
    const resultRels: Relationship[] = [];

    const rels = this.graph.getRelationships(entityId);
    for (const rel of rels) {
      if (rel.type === 'depends_on') {
        const depId = rel.sourceId === entityId ? rel.targetId : rel.sourceId;
        const depEntity = this.graph.getEntity(depId);
        if (depEntity) {
          resultEntities.push(depEntity);
          resultRels.push(rel);
        }
      }
    }

    return {
      query: { type: 'entity_dependencies', entityId, organizationId: entity.organizationId },
      answer: `Entity '${entity.properties.name ?? entityId}' has ${resultEntities.length} dependencies.`,
      entities: resultEntities,
      relationships: resultRels,
      confidence: 0.92,
      gaps: [],
    };
  }

  getEntityTimeline(entityId: string): ReasoningResult {
    const entity = this.graph.getEntity(entityId);
    if (!entity) return this.emptyResult({ type: 'entity_timeline', entityId, organizationId: '' });

    const resultEntities: Entity[] = [entity];
    const resultRels: Relationship[] = [];

    const rels = this.graph.getRelationships(entityId);
    for (const rel of rels) {
      const otherId = rel.sourceId === entityId ? rel.targetId : rel.sourceId;
      const other = this.graph.getEntity(otherId);
      if (other) {
        resultEntities.push(other);
        resultRels.push(rel);
      }
    }

    // Sort by creation date
    resultEntities.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return {
      query: { type: 'entity_timeline', entityId, organizationId: entity.organizationId },
      answer: `Timeline for '${entity.properties.name ?? entityId}': ${resultEntities.length} events from ${resultEntities[0]?.createdAt} to ${resultEntities[resultEntities.length - 1]?.createdAt}.`,
      entities: resultEntities,
      relationships: resultRels,
      confidence: 0.85,
      gaps: [],
    };
  }

  getImpactAnalysis(entityId: string): ReasoningResult {
    const entity = this.graph.getEntity(entityId);
    if (!entity) return this.emptyResult({ type: 'impact_analysis', entityId, organizationId: '' });

    const visited = new Set<string>();
    const resultEntities: Entity[] = [];
    const resultRels: Relationship[] = [];

    const traverse = (id: string, depth: number) => {
      if (depth > 5 || visited.has(id)) return;
      visited.add(id);
      const neighbors = this.graph.getNeighbors(id);
      for (const neighbor of neighbors) {
        if (!resultEntities.some((e) => e.id === neighbor.entity.id)) {
          resultEntities.push(neighbor.entity);
          resultRels.push(neighbor.relationship);
        }
        if (depth < 5) traverse(neighbor.entity.id, depth + 1);
      }
    };
    traverse(entityId, 0);

    return {
      query: { type: 'impact_analysis', entityId, organizationId: entity.organizationId },
      answer: `Impact analysis: '${entity.properties.name ?? entityId}' affects ${resultEntities.length} entities across the graph.`,
      entities: resultEntities,
      relationships: resultRels,
      confidence: resultEntities.length > 0 ? 0.80 : 0.5,
      gaps: [],
    };
  }

  getKnowledgeGaps(entityId: string): ReasoningResult {
    const entity = this.graph.getEntity(entityId);
    if (!entity) return this.emptyResult({ type: 'knowledge_gaps', entityId, organizationId: '' });

    const gaps: KnowledgeGap[] = [];
    const neighbors = this.graph.getNeighbors(entityId);
    const relTypes = new Set(neighbors.map((n) => n.relationship.type));

    const expectedRels = this.ontology.getEntityDef(entity.type)?.allowedRelationships ?? [];
    for (const expected of expectedRels) {
      if (!relTypes.has(expected)) {
        gaps.push({
          description: `Entity has no '${expected}' relationship, which is expected for type '${entity.type}'`,
          relatedEntityId: entityId,
        });
      }
    }

    return {
      query: { type: 'knowledge_gaps', entityId, organizationId: entity.organizationId },
      answer: gaps.length === 0
        ? `No knowledge gaps detected for '${entity.properties.name ?? entityId}'.`
        : `${gaps.length} knowledge gaps detected for '${entity.properties.name ?? entityId}'.`,
      entities: [],
      relationships: [],
      confidence: 0.78,
      gaps,
    };
  }

  private identifyGaps(entity: Entity, related: Entity[]): KnowledgeGap[] {
    const gaps: KnowledgeGap[] = [];
    if (related.length === 0) {
      gaps.push({
        description: `No documents found related to '${entity.properties.name ?? entity.id}'`,
        relatedEntityId: entity.id,
      });
    }
    return gaps;
  }

  private emptyResult(q: ReasoningQuery): ReasoningResult {
    return {
      query: q,
      answer: 'Entity not found.',
      entities: [],
      relationships: [],
      confidence: 0,
      gaps: [],
    };
  }

  private emitTelemetry(type: string, metadata: Record<string, unknown>): void {
    if (this.telemetry) {
      this.telemetry.emit({ type, timestamp: new Date().toISOString(), metadata });
    }
  }
}
