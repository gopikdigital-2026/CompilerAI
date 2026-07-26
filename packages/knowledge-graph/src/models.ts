// ---------------------------------------------------------------------------
// Core domain models for the Enterprise Knowledge Graph
// ---------------------------------------------------------------------------

// ── Entity types ─────────────────────────────────────────────────────────────

export type EntityType =
  | 'company'
  | 'user'
  | 'customer'
  | 'supplier'
  | 'employee'
  | 'project'
  | 'document'
  | 'email'
  | 'meeting'
  | 'ticket'
  | 'incident'
  | 'repository'
  | 'file'
  | 'workflow'
  | 'agent'
  | 'task'
  | 'objective';

// ── Relationship types ───────────────────────────────────────────────────────

export type RelationshipType =
  | 'belongs_to'
  | 'created_by'
  | 'assigned_to'
  | 'depends_on'
  | 'related_to'
  | 'responds_to'
  | 'contains'
  | 'references'
  | 'participates_in'
  | 'uses'
  | 'generates'
  | 'executes'
  | 'derives_from';

// ── Entity ────────────────────────────────────────────────────────────────────

export interface Entity {
  id: string;
  type: EntityType;
  properties: Record<string, unknown>;
  tags: string[];
  metadata: EntityMetadata;
  createdAt: string;
  updatedAt: string;
  organizationId: string;
}

export interface EntityMetadata {
  source?: string;
  connector?: string;
  ownerId?: string;
  confidence?: number;
  [key: string]: unknown;
}

// ── Relationship ──────────────────────────────────────────────────────────────

export interface Relationship {
  id: string;
  type: RelationshipType;
  sourceId: string;
  targetId: string;
  properties: Record<string, unknown>;
  bidirectional: boolean;
  createdAt: string;
  organizationId: string;
}

// ── Memory ────────────────────────────────────────────────────────────────────

export type MemoryType = 'short_term' | 'long_term' | 'shared_context' | 'decision_history';

export interface MemoryRecord {
  id: string;
  type: MemoryType;
  agentId: string;
  key: string;
  content: unknown;
  context: Record<string, unknown>;
  importance: number;
  createdAt: string;
  lastAccessedAt: string;
  accessCount: number;
  expiresAt?: string;
  organizationId: string;
}

export interface DecisionRecord {
  id: string;
  agentId: string;
  taskId: string;
  decision: string;
  reasoning: string;
  alternatives: string[];
  confidence: number;
  outcome: 'success' | 'failure' | 'pending';
  relatedEntityIds: string[];
  createdAt: string;
  organizationId: string;
}

export interface MemorySummary {
  id: string;
  agentId: string;
  summary: string;
  entityIds: string[];
  createdAt: string;
  organizationId: string;
}

// ── Search ────────────────────────────────────────────────────────────────────

export interface SearchQuery {
  type?: EntityType;
  tags?: string[];
  properties?: Record<string, unknown>;
  text?: string;
  organizationId?: string;
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  entity: Entity;
  score: number;
  matchedFields: string[];
}

export interface PathResult {
  startId: string;
  endId: string;
  path: string[];
  relationships: Relationship[];
  found: boolean;
}

export interface NeighborResult {
  entity: Entity;
  relationship: Relationship;
  direction: 'outgoing' | 'incoming';
}

// ── Reasoning ──────────────────────────────────────────────────────────────────

export type ReasoningQueryType =
  | 'related_documents'
  | 'agents_on_customer'
  | 'workflows_affecting_incident'
  | 'missing_information'
  | 'entity_dependencies'
  | 'entity_timeline'
  | 'impact_analysis'
  | 'knowledge_gaps';

export interface ReasoningQuery {
  type: ReasoningQueryType;
  entityId: string;
  organizationId: string;
  parameters?: Record<string, unknown>;
}

export interface ReasoningResult {
  query: ReasoningQuery;
  answer: string;
  entities: Entity[];
  relationships: Relationship[];
  confidence: number;
  gaps: KnowledgeGap[];
}

export interface KnowledgeGap {
  description: string;
  missingEntityType?: EntityType;
  relatedEntityId?: string;
}

// ── Telemetry ──────────────────────────────────────────────────────────────────

export type TelemetryEventType =
  | 'entity.created'
  | 'entity.updated'
  | 'relationship.created'
  | 'relationship.deleted'
  | 'graph.query.executed'
  | 'graph.reasoning.executed'
  | 'memory.updated'
  | 'memory.retrieved';

export interface TelemetryEvent {
  type: TelemetryEventType;
  timestamp: string;
  organizationId?: string;
  metadata: Record<string, unknown>;
}

export interface ITelemetrySink {
  emit(event: TelemetryEvent): void;
  getEvents(): TelemetryEvent[];
  getEventsByType(type: TelemetryEventType): TelemetryEvent[];
  clear(): void;
}

// ── Indexing ───────────────────────────────────────────────────────────────────

export type IndexType =
  | 'entity_type'
  | 'tags'
  | 'dates'
  | 'connector'
  | 'owner'
  | 'organization'
  | 'text';

export interface IndexStats {
  type: IndexType;
  size: number;
  lastUpdated: string;
}

// ── Ingestion ───────────────────────────────────────────────────────────────────

export interface IngestionBatch {
  entities: Entity[];
  relationships: Relationship[];
  organizationId: string;
}

export interface IngestionResult {
  entitiesAdded: number;
  entitiesUpdated: number;
  relationshipsAdded: number;
  relationshipsUpdated: number;
  errors: string[];
  durationMs: number;
}

// ── Public interfaces (port-and-adapter) ───────────────────────────────────────

export interface IKnowledgeGraph {
  addEntity(entity: Entity): Entity;
  updateEntity(id: string, updates: Partial<Entity>): Entity | undefined;
  getEntity(id: string): Entity | undefined;
  deleteEntity(id: string): boolean;
  addRelationship(rel: Relationship): Relationship;
  getRelationship(id: string): Relationship | undefined;
  deleteRelationship(id: string): boolean;
  getRelationships(entityId: string): Relationship[];
  getNeighbors(entityId: string): NeighborResult[];
  findPath(startId: string, endId: string): PathResult;
  query(query: SearchQuery): SearchResult[];
  countEntities(): number;
  countRelationships(): number;
}

export interface IMemoryEngine {
  store(record: Omit<MemoryRecord, 'id' | 'createdAt' | 'lastAccessedAt' | 'accessCount'>): MemoryRecord;
  retrieve(key: string, agentId: string): MemoryRecord | undefined;
  retrieveContextual(agentId: string, context: Record<string, unknown>, limit?: number): MemoryRecord[];
  recordDecision(decision: Omit<DecisionRecord, 'id' | 'createdAt'>): DecisionRecord;
  getDecisionHistory(agentId: string): DecisionRecord[];
  summarize(agentId: string): MemorySummary;
  forget(key: string, agentId: string): boolean;
  clear(organizationId: string): void;
}

export interface ISearchEngine {
  search(query: SearchQuery): SearchResult[];
  findById(id: string): Entity | undefined;
  findByType(type: EntityType, organizationId?: string): Entity[];
  findByProperties(properties: Record<string, unknown>, organizationId?: string): Entity[];
  findByText(text: string, organizationId?: string, limit?: number): SearchResult[];
  findNeighbors(entityId: string): NeighborResult[];
  findPath(startId: string, endId: string): PathResult;
}

export interface IReasoningEngine {
  query(q: ReasoningQuery): ReasoningResult;
  getRelatedDocuments(entityId: string): ReasoningResult;
  getAgentsOnCustomer(customerId: string): ReasoningResult;
  getWorkflowsAffectingIncident(incidentId: string): ReasoningResult;
  getMissingInformation(taskId: string): ReasoningResult;
  getImpactAnalysis(entityId: string): ReasoningResult;
}

export interface IIndexManager {
  indexEntity(entity: Entity): void;
  indexRelationship(rel: Relationship): void;
  removeEntity(id: string): void;
  removeRelationship(id: string): void;
  getByType(type: EntityType): string[];
  getByTag(tag: string): string[];
  getByOrganization(orgId: string): string[];
  getByOwner(ownerId: string): string[];
  getByConnector(connector: string): string[];
  getByDateRange(start: string, end: string): string[];
  searchText(text: string, limit?: number): string[];
  getStats(): IndexStats[];
  rebuild(graph: IKnowledgeGraph): void;
}

export interface IIngestionEngine {
  ingestBatch(batch: IngestionBatch): IngestionResult;
  ingestEntity(entity: Entity): boolean;
  ingestRelationship(rel: Relationship): boolean;
}

export interface ITelemetryEngine {
  emit(event: TelemetryEvent): void;
  getEvents(): TelemetryEvent[];
  getEventsByType(type: TelemetryEventType): TelemetryEvent[];
  clear(): void;
}
