// Core API facade
export { RAGEngine } from './api/RAGEngine.js';
export type { RAGEngineConfig } from './api/RAGEngine.js';

// All domain models & types
export type {
  ContentSource,
  IngestedDocument,
  DocumentPermissions,
  Chunk,
  ChunkStrategy,
  ChunkingConfig,
  EmbeddingVector,
  IEmbeddingProvider,
  IVectorStore,
  VectorSearchFilter,
  VectorSearchResult,
  RetrievalMode,
  RetrievalQuery,
  RetrievalResult,
  RankingFactors,
  RankedResult,
  GroundedAnswer,
  GroundedChunk,
  Citation,
  CacheEntry,
  ICache,
  CacheStats,
  TelemetryEvent,
  TelemetryEventType,
  ITelemetryEngine,
  IKnowledgeGraphBridge,
  IRAGEngine,
  IngestionResult,
  ReindexResult,
} from './models.js';

// Concrete implementations
export { IngestionEngine, createDocument, computeHash } from './ingestion/IngestionEngine.js';
export { GoogleDriveAdapter, GmailAdapter, GitHubAdapter, KnowledgeGraphAdapter } from './ingestion/IngestionEngine.js';
export type { IngestionSourceAdapter } from './ingestion/IngestionEngine.js';
export { ChunkingEngine } from './chunking/ChunkingEngine.js';
export { InMemoryEmbeddingProvider, InMemoryVectorStore } from './indexing/InMemoryIndex.js';
export { RetrievalEngine } from './retrieval/RetrievalEngine.js';
export { RankingEngine } from './ranking/RankingEngine.js';
export { GroundingEngine } from './grounding/GroundingEngine.js';
export { CitationEngine } from './citations/CitationEngine.js';
export { RAGCache } from './cache/RAGCache.js';
export { TelemetryEngine } from './telemetry/TelemetryEngine.js';
