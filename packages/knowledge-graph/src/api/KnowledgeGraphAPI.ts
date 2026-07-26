import type {
  Entity,
  EntityType,
  IIngestionEngine,
  IIndexManager,
  IKnowledgeGraph,
  IMemoryEngine,
  IReasoningEngine,
  ISearchEngine,
  ITelemetryEngine,
  IngestionBatch,
  IngestionResult,
  MemoryRecord,
  NeighborResult,
  PathResult,
  ReasoningQuery,
  ReasoningResult,
  Relationship,
  RelationshipType,
  SearchResult,
  SearchQuery,
} from '../models.js';
import { Ontology } from '../ontology/Ontology.js';
import { KnowledgeGraph } from '../graph/KnowledgeGraph.js';
import { IndexManager } from '../indexing/IndexManager.js';
import { SearchEngine } from '../search/SearchEngine.js';
import { MemoryEngine } from '../memory/MemoryEngine.js';
import { ReasoningEngine } from '../reasoning/ReasoningEngine.js';
import { IngestionEngine } from '../ingestion/IngestionEngine.js';
import { TelemetryEngine } from '../telemetry/TelemetryEngine.js';

let entityCounter = 0;
let relCounter = 0;

export function createEntity(
  type: EntityType,
  properties: Record<string, unknown>,
  organizationId: string,
  options?: {
    id?: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
    ownerId?: string;
    connector?: string;
  },
): Entity {
  const now = new Date().toISOString();
  return {
    id: options?.id ?? `ent-${++entityCounter}`,
    type,
    properties,
    tags: options?.tags ?? [],
    metadata: {
      ...(options?.metadata ?? {}),
      ownerId: options?.ownerId,
      connector: options?.connector,
    },
    createdAt: now,
    updatedAt: now,
    organizationId,
  };
}

export function createRelationship(
  type: RelationshipType,
  sourceId: string,
  targetId: string,
  organizationId: string,
  options?: { id?: string; properties?: Record<string, unknown>; bidirectional?: boolean },
): Relationship {
  return {
    id: options?.id ?? `rel-${++relCounter}`,
    type,
    sourceId,
    targetId,
    properties: options?.properties ?? {},
    bidirectional: options?.bidirectional ?? false,
    createdAt: new Date().toISOString(),
    organizationId,
  };
}

export class KnowledgeGraphAPI {
  public readonly ontology: Ontology;
  public readonly graph: IKnowledgeGraph;
  public readonly index: IIndexManager;
  public readonly searchEngine: ISearchEngine;
  public readonly memory: IMemoryEngine;
  public readonly reasoning: IReasoningEngine;
  public readonly ingestion: IIngestionEngine;
  public readonly telemetry: ITelemetryEngine;

  constructor() {
    this.ontology = new Ontology();
    this.telemetry = new TelemetryEngine();

    const graphImpl = new KnowledgeGraph(this.ontology, this.telemetry);
    this.graph = graphImpl;
    this.index = new IndexManager();
    this.searchEngine = new SearchEngine(this.graph, this.index);
    this.memory = new MemoryEngine();
    this.reasoning = new ReasoningEngine(this.graph, this.ontology, { emit: (e) => this.telemetry.emit(e as import('../models.js').TelemetryEvent) });
    this.ingestion = new IngestionEngine(this.graph, this.index);
  }

  // ── Entity operations ──────────────────────────────────────────────────────────

  createEntity(type: EntityType, properties: Record<string, unknown>, organizationId: string, options?: {
    tags?: string[];
    ownerId?: string;
    connector?: string;
    metadata?: Record<string, unknown>;
  }): Entity {
    const entity = createEntity(type, properties, organizationId, options);
    this.graph.addEntity(entity);
    this.index.indexEntity(entity);
    return entity;
  }

  updateEntity(id: string, updates: Partial<Entity>): Entity | undefined {
    const updated = this.graph.updateEntity(id, updates);
    if (updated) {
      this.index.removeEntity(id);
      this.index.indexEntity(updated);
    }
    return updated;
  }

  getEntity(id: string): Entity | undefined {
    return this.graph.getEntity(id);
  }

  deleteEntity(id: string): boolean {
    this.index.removeEntity(id);
    return this.graph.deleteEntity(id);
  }

  // ── Relationship operations ─────────────────────────────────────────────────────

  createRelationship(
    type: RelationshipType,
    sourceId: string,
    targetId: string,
    organizationId: string,
    options?: { properties?: Record<string, unknown>; bidirectional?: boolean },
  ): Relationship {
    const rel = createRelationship(type, sourceId, targetId, organizationId, options);
    this.graph.addRelationship(rel);
    this.index.indexRelationship(rel);
    return rel;
  }

  getRelationship(id: string): Relationship | undefined {
    return this.graph.getRelationship(id);
  }

  deleteRelationship(id: string): boolean {
    this.index.removeRelationship(id);
    return this.graph.deleteRelationship(id);
  }

  getRelationships(entityId: string): Relationship[] {
    return this.graph.getRelationships(entityId);
  }

  // ── Search operations ───────────────────────────────────────────────────────────

  search(query: SearchQuery): SearchResult[] {
    return this.searchEngine.search(query);
  }

  findById(id: string): Entity | undefined {
    return this.searchEngine.findById(id);
  }

  findByType(type: EntityType, organizationId?: string): Entity[] {
    return this.searchEngine.findByType(type, organizationId);
  }

  findByText(text: string, organizationId?: string, limit?: number): SearchResult[] {
    return this.searchEngine.findByText(text, organizationId, limit);
  }

  findNeighbors(entityId: string): NeighborResult[] {
    return this.searchEngine.findNeighbors(entityId);
  }

  findPath(startId: string, endId: string): PathResult {
    return this.searchEngine.findPath(startId, endId);
  }

  // ── Reasoning operations ──────────────────────────────────────────────────────────

  reason(query: ReasoningQuery): ReasoningResult {
    return this.reasoning.query(query);
  }

  getRelatedDocuments(entityId: string): ReasoningResult {
    return this.reasoning.getRelatedDocuments(entityId);
  }

  getAgentsOnCustomer(customerId: string): ReasoningResult {
    return this.reasoning.getAgentsOnCustomer(customerId);
  }

  getWorkflowsAffectingIncident(incidentId: string): ReasoningResult {
    return this.reasoning.getWorkflowsAffectingIncident(incidentId);
  }

  getMissingInformation(taskId: string): ReasoningResult {
    return this.reasoning.getMissingInformation(taskId);
  }

  getImpactAnalysis(entityId: string): ReasoningResult {
    return this.reasoning.getImpactAnalysis(entityId);
  }

  // ── Memory operations ──────────────────────────────────────────────────────────

  storeMemory(record: Omit<MemoryRecord, 'id' | 'createdAt' | 'lastAccessedAt' | 'accessCount'>): MemoryRecord {
    const stored = this.memory.store(record);
    this.telemetry.emit({
      type: 'memory.updated',
      timestamp: new Date().toISOString(),
      organizationId: record.organizationId,
      metadata: { agentId: record.agentId, memoryType: record.type, key: record.key },
    });
    return stored;
  }

  retrieveMemory(key: string, agentId: string): MemoryRecord | undefined {
    const record = this.memory.retrieve(key, agentId);
    if (record) {
      this.telemetry.emit({
        type: 'memory.retrieved',
        timestamp: new Date().toISOString(),
        organizationId: record.organizationId,
        metadata: { agentId, key, memoryType: record.type },
      });
    }
    return record;
  }

  retrieveContextualMemory(agentId: string, context: Record<string, unknown>, limit?: number): MemoryRecord[] {
    return this.memory.retrieveContextual(agentId, context, limit);
  }

  recordDecision(decision: Parameters<IMemoryEngine['recordDecision']>[0]): ReturnType<IMemoryEngine['recordDecision']> {
    return this.memory.recordDecision(decision);
  }

  getDecisionHistory(agentId: string) {
    return this.memory.getDecisionHistory(agentId);
  }

  summarizeAgent(agentId: string) {
    return this.memory.summarize(agentId);
  }

  forgetMemory(key: string, agentId: string): boolean {
    return this.memory.forget(key, agentId);
  }

  // ── Ingestion operations ──────────────────────────────────────────────────────────

  ingestBatch(batch: IngestionBatch): IngestionResult {
    return this.ingestion.ingestBatch(batch);
  }

  ingestEntity(entity: Entity): boolean {
    return this.ingestion.ingestEntity(entity);
  }

  ingestRelationship(rel: Relationship): boolean {
    return this.ingestion.ingestRelationship(rel);
  }

  // ── Stats ────────────────────────────────────────────────────────────────────────

  countEntities(): number {
    return this.graph.countEntities();
  }

  countRelationships(): number {
    return this.graph.countRelationships();
  }

  getIndexStats() {
    return this.index.getStats();
  }

  getTelemetryEvents() {
    return this.telemetry.getEvents();
  }

  getTelemetryEventsByType(type: Parameters<ITelemetryEngine['getEventsByType']>[0]) {
    return this.telemetry.getEventsByType(type);
  }
}
