// Core API facade
export { KnowledgeGraphAPI, createEntity, createRelationship } from './api/KnowledgeGraphAPI.js';

// Domain models & types
export type {
  Entity,
  EntityMetadata,
  EntityType,
  Relationship,
  RelationshipType,
  MemoryRecord,
  MemoryType,
  DecisionRecord,
  MemorySummary,
  SearchQuery,
  SearchResult,
  PathResult,
  NeighborResult,
  ReasoningQuery,
  ReasoningQueryType,
  ReasoningResult,
  KnowledgeGap,
  TelemetryEvent,
  TelemetryEventType,
  ITelemetrySink,
  IndexType,
  IndexStats,
  IngestionBatch,
  IngestionResult,
  IKnowledgeGraph,
  IMemoryEngine,
  ISearchEngine,
  IReasoningEngine,
  IIndexManager,
  IIngestionEngine,
  ITelemetryEngine,
} from './models.js';

// Concrete implementations
export { Ontology } from './ontology/Ontology.js';
export type { OntologyDefinition, EntityTypeDef, RelationshipTypeDef } from './ontology/Ontology.js';
export { KnowledgeGraph } from './graph/KnowledgeGraph.js';
export { IndexManager } from './indexing/IndexManager.js';
export { SearchEngine } from './search/SearchEngine.js';
export { MemoryEngine } from './memory/MemoryEngine.js';
export { ReasoningEngine } from './reasoning/ReasoningEngine.js';
export { IngestionEngine } from './ingestion/IngestionEngine.js';
export { TelemetryEngine } from './telemetry/TelemetryEngine.js';
