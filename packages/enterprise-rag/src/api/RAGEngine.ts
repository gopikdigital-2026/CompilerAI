import type {
  Chunk,
  ChunkingConfig,
  Citation,
  ContentSource,
  GroundedAnswer,
  ICache,
  IEmbeddingProvider,
  IKnowledgeGraphBridge,
  IRAGEngine,
  ITelemetryEngine,
  IVectorStore,
  IngestedDocument,
  IngestionResult,
  RankedResult,
  ReindexResult,
  RetrievalQuery,
  RetrievalResult,
} from '../models.js';
import { IngestionEngine, computeHash } from '../ingestion/IngestionEngine.js';
import { ChunkingEngine } from '../chunking/ChunkingEngine.js';
import { InMemoryEmbeddingProvider, InMemoryVectorStore } from '../indexing/InMemoryIndex.js';
import { RetrievalEngine } from '../retrieval/RetrievalEngine.js';
import { RankingEngine } from '../ranking/RankingEngine.js';
import { GroundingEngine } from '../grounding/GroundingEngine.js';
import { CitationEngine } from '../citations/CitationEngine.js';
import { RAGCache } from '../cache/RAGCache.js';
import { TelemetryEngine } from '../telemetry/TelemetryEngine.js';

export interface RAGEngineConfig {
  embeddingProvider?: IEmbeddingProvider;
  vectorStore?: IVectorStore;
  chunkingConfig?: Partial<ChunkingConfig>;
  cache?: ICache;
  kgBridge?: IKnowledgeGraphBridge;
}

export class RAGEngine implements IRAGEngine {
  public readonly ingestion: IngestionEngine;
  public readonly chunking: ChunkingEngine;
  public readonly embeddingProvider: IEmbeddingProvider;
  public readonly vectorStore: IVectorStore;
  public readonly retrieval: RetrievalEngine;
  public readonly ranking: RankingEngine;
  public readonly grounding: GroundingEngine;
  public readonly citations: CitationEngine;
  public readonly cache: ICache;
  public readonly telemetry: ITelemetryEngine;

  private readonly chunkMap = new Map<string, Chunk[]>();
  private readonly embeddingMap = new Map<string, { chunkId: string; vector: number[] }[]>();

  constructor(config?: RAGEngineConfig) {
    this.embeddingProvider = config?.embeddingProvider ?? new InMemoryEmbeddingProvider();
    this.vectorStore = config?.vectorStore ?? new InMemoryVectorStore();
    this.ingestion = new IngestionEngine();
    this.chunking = new ChunkingEngine(config?.chunkingConfig);
    this.cache = config?.cache ?? new RAGCache();
    this.telemetry = new TelemetryEngine();
    this.retrieval = new RetrievalEngine(this.embeddingProvider, this.vectorStore);
    this.ranking = new RankingEngine();
    this.grounding = new GroundingEngine(config?.kgBridge);
    this.citations = new CitationEngine();
  }

  async ingest(_source: ContentSource, documents: IngestedDocument[]): Promise<IngestionResult> {
    const startMs = Date.now();
    let chunksCreated = 0;
    let embeddingsGenerated = 0;
    const errors: string[] = [];

    const result = this.ingestion.ingest(documents);
    errors.push(...result.errors);

    for (const doc of documents) {
      try {
        const chunks = this.chunking.chunk(doc);
        this.chunkMap.set(doc.id, chunks);
        chunksCreated += chunks.length;

        const texts = chunks.map((c) => c.content);
        const vectors = await this.embeddingProvider.embedBatch(texts);
        const embeddings = chunks.map((c, i) => ({ chunkId: c.id, vector: vectors[i] }));
        this.embeddingMap.set(doc.id, embeddings);
        embeddingsGenerated += embeddings.length;

        this.retrieval.indexChunks(doc, chunks, embeddings);

        // Invalidate cache for this document's content
        this.cache.invalidateByHash(doc.hash);
      } catch (err) {
        errors.push(`Document '${doc.id}': ${(err as Error).message}`);
      }
    }

    const durationMs = Date.now() - startMs;

    this.telemetry.emit({
      type: 'ingestion.completed',
      timestamp: new Date().toISOString(),
      organizationId: documents[0]?.organizationId,
      metadata: { documentsIngested: result.added + result.updated, chunksCreated, embeddingsGenerated, durationMs },
    });

    this.telemetry.emit({
      type: 'indexing.completed',
      timestamp: new Date().toISOString(),
      organizationId: documents[0]?.organizationId,
      metadata: { embeddingsGenerated, chunksIndexed: chunksCreated },
    });

    return {
      documentsIngested: result.added + result.updated,
      chunksCreated,
      embeddingsGenerated,
      errors,
      durationMs,
    };
  }

  async reindex(documentId?: string): Promise<ReindexResult> {
    const startMs = Date.now();
    let chunksReprocessed = 0;
    let embeddingsRegenerated = 0;
    const errors: string[] = [];

    const docs = documentId
      ? [this.ingestion.getDocument(documentId)].filter((d): d is IngestedDocument => d !== undefined)
      : this.ingestion.getAllDocuments();

    for (const doc of docs) {
      try {
        this.retrieval.removeDocument(doc.id);
        this.chunkMap.delete(doc.id);
        this.embeddingMap.delete(doc.id);

        const chunks = this.chunking.chunk(doc);
        this.chunkMap.set(doc.id, chunks);
        chunksReprocessed += chunks.length;

        const texts = chunks.map((c) => c.content);
        const vectors = await this.embeddingProvider.embedBatch(texts);
        const embeddings = chunks.map((c, i) => ({ chunkId: c.id, vector: vectors[i] }));
        this.embeddingMap.set(doc.id, embeddings);
        embeddingsRegenerated += embeddings.length;

        this.retrieval.indexChunks(doc, chunks, embeddings);
      } catch (err) {
        errors.push(`Document '${doc.id}': ${(err as Error).message}`);
      }
    }

    // Invalidate relevant cache entries
    if (documentId) {
      this.cache.invalidatePattern(`doc:${documentId}`);
    } else {
      this.cache.clear();
    }

    const durationMs = Date.now() - startMs;

    this.telemetry.emit({
      type: 'indexing.completed',
      timestamp: new Date().toISOString(),
      metadata: { documentsReindexed: docs.length, chunksReprocessed, embeddingsRegenerated, durationMs },
    });

    return {
      documentsReindexed: docs.length,
      chunksReprocessed,
      embeddingsRegenerated,
      errors,
      durationMs,
    };
  }

  async search(query: RetrievalQuery): Promise<RankedResult[]> {
    const cacheKey = RAGCache.queryKey(query.query + (query.userId ?? '') + (query.roleIds?.join(',') ?? ''), query.organizationId, query.mode);

    // Check cache
    const cached = this.cache.get<RankedResult[]>(cacheKey);
    if (cached) {
      this.telemetry.emit({ type: 'cache.hit', timestamp: new Date().toISOString(), metadata: { key: cacheKey } });
      return cached;
    }
    this.telemetry.emit({ type: 'cache.miss', timestamp: new Date().toISOString(), metadata: { key: cacheKey } });

    const results = await this.retrieval.retrieve(query);

    this.telemetry.emit({
      type: 'retrieval.executed',
      timestamp: new Date().toISOString(),
      organizationId: query.organizationId,
      metadata: { mode: query.mode, resultCount: results.length, query: query.query.slice(0, 100) },
    });

    // Update usage counts for ranking
    for (const r of results) {
      this.ranking.setUsageCount(r.chunk.id, this.retrieval.getUsageCount(r.chunk.id));
    }

    const ranked = this.ranking.rank(results);

    this.telemetry.emit({
      type: 'ranking.completed',
      timestamp: new Date().toISOString(),
      organizationId: query.organizationId,
      metadata: { rankedCount: ranked.length, topScore: ranked[0]?.rankScore ?? 0 },
    });

    // Cache the results
    const contentHash = computeHash(query.query + query.organizationId + query.mode);
    this.cache.set(cacheKey, ranked, contentHash);

    return ranked;
  }

  async retrieve(query: RetrievalQuery): Promise<RetrievalResult[]> {
    const results = await this.retrieval.retrieve(query);

    this.telemetry.emit({
      type: 'retrieval.executed',
      timestamp: new Date().toISOString(),
      organizationId: query.organizationId,
      metadata: { mode: query.mode, resultCount: results.length },
    });

    return results;
  }

  async explain(query: string, organizationId: string, userId?: string): Promise<GroundedAnswer> {
    const cacheKey = RAGCache.resultKey(query, organizationId);

    const cached = this.cache.get<GroundedAnswer>(cacheKey);
    if (cached) {
      this.telemetry.emit({ type: 'cache.hit', timestamp: new Date().toISOString(), metadata: { key: cacheKey } });
      return cached;
    }
    this.telemetry.emit({ type: 'cache.miss', timestamp: new Date().toISOString(), metadata: { key: cacheKey } });

    const ranked = await this.search({
      query,
      mode: 'hybrid',
      organizationId,
      userId,
      limit: 5,
    });

    const answer = this.grounding.ground(query, ranked, organizationId);

    this.telemetry.emit({
      type: 'grounding.completed',
      timestamp: new Date().toISOString(),
      organizationId,
      metadata: {
        citationCount: answer.citations.length,
        confidence: answer.confidence,
        chunkCount: answer.groundedChunks.length,
      },
    });

    const contentHash = computeHash(query + organizationId);
    this.cache.set(cacheKey, answer, contentHash);

    return answer;
  }

  invalidateCache(pattern?: string): number {
    if (pattern) {
      return this.cache.invalidatePattern(pattern);
    }
    const size = this.cache.size();
    this.cache.clear();
    return size;
  }

  // ── Convenience helpers ─────────────────────────────────────────────────────

  getCitations(answer: GroundedAnswer): Citation[] {
    return answer.citations;
  }

  formatCitations(answer: GroundedAnswer): string {
    return this.citations.formatCitationList(answer.citations);
  }

  formatBibliography(answer: GroundedAnswer): string {
    return this.citations.formatBibliography(answer.citations);
  }

  getTelemetryEvents() {
    return this.telemetry.getEvents();
  }

  getCacheStats() {
    return this.cache.getStats();
  }

  countDocuments(): number {
    return this.ingestion.count();
  }

  countChunks(): number {
    return this.retrieval.countChunks();
  }

  countEmbeddings(): number {
    return this.vectorStore.count();
  }
}
