// ---------------------------------------------------------------------------
// Core domain models for the Enterprise RAG Engine
// ---------------------------------------------------------------------------

// ── Ingestion ────────────────────────────────────────────────────────────────

export type ContentSource = 'google_drive' | 'gmail' | 'github' | 'knowledge_graph';

export interface IngestedDocument {
  id: string;
  source: ContentSource;
  sourceId: string;
  title: string;
  content: string;
  author: string;
  organizationId: string;
  createdAt: string;
  ingestedAt: string;
  permissions: DocumentPermissions;
  version: string;
  hash: string;
  metadata: Record<string, unknown>;
}

export interface DocumentPermissions {
  visibility: 'public' | 'organization' | 'private' | 'restricted';
  allowedUserIds: string[];
  allowedRoleIds: string[];
}

// ── Chunking ─────────────────────────────────────────────────────────────────

export type ChunkStrategy = 'fixed_size' | 'by_header' | 'by_section';

export interface ChunkingConfig {
  strategy: ChunkStrategy;
  chunkSize: number;
  overlap: number;
  preserveTables: boolean;
  preserveCodeBlocks: boolean;
}

export interface Chunk {
  id: string;
  documentId: string;
  index: number;
  content: string;
  tokenCount: number;
  section: string | null;
  position: { start: number; end: number };
  hash: string;
}

// ── Indexing / Embeddings ────────────────────────────────────────────────────

export interface EmbeddingVector {
  id: string;
  chunkId: string;
  vector: number[];
  documentId: string;
  organizationId: string;
}

export interface IEmbeddingProvider {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
  dimensions(): number;
}

export interface IVectorStore {
  add(embedding: EmbeddingVector): void;
  addBatch(embeddings: EmbeddingVector[]): void;
  remove(id: string): void;
  removeByDocument(documentId: string): void;
  search(vector: number[], limit: number, filter?: VectorSearchFilter): VectorSearchResult[];
  count(): number;
}

export interface VectorSearchFilter {
  organizationId?: string;
  documentIds?: string[];
  source?: ContentSource;
}

export interface VectorSearchResult {
  embedding: EmbeddingVector;
  score: number;
}

// ── Retrieval ────────────────────────────────────────────────────────────────

export type RetrievalMode = 'vector' | 'metadata' | 'hybrid';

export interface RetrievalQuery {
  query: string;
  mode: RetrievalMode;
  organizationId: string;
  userId?: string;
  roleIds?: string[];
  source?: ContentSource;
  dateRange?: { start: string; end: string };
  limit?: number;
}

export interface RetrievalResult {
  chunk: Chunk;
  document: IngestedDocument;
  score: number;
  matchedFields: string[];
}

// ── Ranking ──────────────────────────────────────────────────────────────────

export interface RankingFactors {
  similarity: number;
  recency: number;
  authority: number;
  usageFrequency: number;
  sourceTrust: number;
}

export interface RankedResult extends RetrievalResult {
  rankScore: number;
  factors: RankingFactors;
}

// ── Grounding & Citations ───────────────────────────────────────────────────

export interface GroundedAnswer {
  answer: string;
  citations: Citation[];
  groundedChunks: GroundedChunk[];
  confidence: number;
  organizationId: string;
}

export interface GroundedChunk {
  chunkId: string;
  documentId: string;
  content: string;
  score: number;
  section: string | null;
  position: { start: number; end: number };
}

export interface Citation {
  documentId: string;
  documentTitle: string;
  source: ContentSource;
  author: string;
  chunkId: string;
  section: string | null;
  position: { start: number; end: number };
  score: number;
  knowledgeGraphRefs: string[];
}

// ── Cache ────────────────────────────────────────────────────────────────────

export interface CacheEntry<T> {
  key: string;
  value: T;
  createdAt: string;
  lastAccessedAt: string;
  accessCount: number;
  ttlMs: number;
  contentHash: string;
}

export interface ICache {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, contentHash: string, ttlMs?: number): void;
  invalidate(key: string): boolean;
  invalidateByHash(hash: string): number;
  invalidatePattern(pattern: string): number;
  size(): number;
  clear(): void;
  getStats(): CacheStats;
}

export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
  invalidated: number;
}

// ── Telemetry ────────────────────────────────────────────────────────────────

export type TelemetryEventType =
  | 'ingestion.completed'
  | 'indexing.completed'
  | 'retrieval.executed'
  | 'ranking.completed'
  | 'cache.hit'
  | 'cache.miss'
  | 'grounding.completed';

export interface TelemetryEvent {
  type: TelemetryEventType;
  timestamp: string;
  organizationId?: string;
  metadata: Record<string, unknown>;
}

export interface ITelemetryEngine {
  emit(event: TelemetryEvent): void;
  getEvents(): TelemetryEvent[];
  getEventsByType(type: TelemetryEventType): TelemetryEvent[];
  clear(): void;
}

// ── Knowledge Graph integration interface ────────────────────────────────────

export interface IKnowledgeGraphBridge {
  getRelatedEntities(documentId: string, organizationId: string): string[];
  getEntityBySourceId(sourceId: string, source: ContentSource): string | undefined;
}

// ── Public API interfaces ───────────────────────────────────────────────────

export interface IRAGEngine {
  ingest(source: ContentSource, documents: IngestedDocument[]): Promise<IngestionResult>;
  reindex(documentId?: string): Promise<ReindexResult>;
  search(query: RetrievalQuery): Promise<RankedResult[]>;
  retrieve(query: RetrievalQuery): Promise<RetrievalResult[]>;
  explain(query: string, organizationId: string, userId?: string): Promise<GroundedAnswer>;
  invalidateCache(pattern?: string): number;
}

export interface IngestionResult {
  documentsIngested: number;
  chunksCreated: number;
  embeddingsGenerated: number;
  errors: string[];
  durationMs: number;
}

export interface ReindexResult {
  documentsReindexed: number;
  chunksReprocessed: number;
  embeddingsRegenerated: number;
  errors: string[];
  durationMs: number;
}
