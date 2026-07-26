# API Reference

## RAGEngine

The `RAGEngine` class is the public facade for the Enterprise RAG Engine. It orchestrates ingestion, chunking, indexing, retrieval, ranking, grounding, citations, caching, and telemetry.

### Configuration

```typescript
interface RAGEngineConfig {
  embeddingProvider?: IEmbeddingProvider;  // default: InMemoryEmbeddingProvider
  vectorStore?: IVectorStore;              // default: InMemoryVectorStore
  chunkingConfig?: Partial<ChunkingConfig>; // default: fixed_size, 512, 64
  cache?: ICache;                          // default: RAGCache
  kgBridge?: IKnowledgeGraphBridge;        // default: none
}
```

All configuration is optional. When omitted, sensible in-memory defaults are used.

```typescript
import { RAGEngine } from '@compilerai/enterprise-rag';

// Default configuration
const rag = new RAGEngine();

// Custom configuration
const custom = new RAGEngine({
  chunkingConfig: { strategy: 'by_section', chunkSize: 256 },
  kgBridge: myKgBridge,
});
```

## Public API Methods

### `ingest(source, documents)`

Ingests documents from a content source. Handles registration, chunking, embedding, indexing, and cache invalidation.

```typescript
async ingest(source: ContentSource, documents: IngestedDocument[]): Promise<IngestionResult>
```

**Returns:** `IngestionResult` with `documentsIngested`, `chunksCreated`, `embeddingsGenerated`, `errors`, and `durationMs`.

### `reindex(documentId?)`

Reprocesses chunks and embeddings for one or all documents. Invalidates cache entries for the affected document(s).

```typescript
async reindex(documentId?: string): Promise<ReindexResult>
```

**Returns:** `ReindexResult` with `documentsReindexed`, `chunksReprocessed`, `embeddingsRegenerated`, `errors`, and `durationMs`.

### `search(query)`

Executes a ranked, cached search. Checks the query cache, retrieves results, ranks them, and caches the ranked output.

```typescript
async search(query: RetrievalQuery): Promise<RankedResult[]>
```

**Returns:** `RankedResult[]` sorted by `rankScore` descending, each with computed `factors`.

### `retrieve(query)`

Executes an unranked, uncached retrieval. Useful when you need raw results or want to apply custom ranking.

```typescript
async retrieve(query: RetrievalQuery): Promise<RetrievalResult[]>
```

**Returns:** `RetrievalResult[]` with `chunk`, `document`, `score`, and `matchedFields`.

### `explain(query, organizationId, userId?)`

Produces a grounded answer with citations. Runs a hybrid search, grounds the results, and caches the answer.

```typescript
async explain(query: string, organizationId: string, userId?: string): Promise<GroundedAnswer>
```

**Returns:** `GroundedAnswer` with `answer`, `citations`, `groundedChunks`, `confidence`, and `organizationId`.

### `invalidateCache(pattern?)`

Invalidates cache entries by regex pattern or clears the entire cache.

```typescript
invalidateCache(pattern?: string): number
```

**Returns:** Number of entries invalidated.

## Convenience Helpers

The `RAGEngine` also exposes helper methods:

| Method | Description |
|--------|-------------|
| `getCitations(answer)` | Returns the citations array from a grounded answer |
| `formatCitations(answer)` | Formats citations as a numbered list string |
| `formatBibliography(answer)` | Formats a deduplicated bibliography string |
| `getTelemetryEvents()` | Returns all telemetry events |
| `getCacheStats()` | Returns cache hit/miss/size statistics |
| `countDocuments()` | Returns the total ingested document count |
| `countChunks()` | Returns the total indexed chunk count |
| `countEmbeddings()` | Returns the total embedding count in the vector store |

## Exposed Sub-Engines

The RAGEngine exposes its internal engines as public readonly properties for advanced use:

| Property | Type |
|----------|------|
| `ingestion` | `IngestionEngine` |
| `chunking` | `ChunkingEngine` |
| `embeddingProvider` | `IEmbeddingProvider` |
| `vectorStore` | `IVectorStore` |
| `retrieval` | `RetrievalEngine` |
| `ranking` | `RankingEngine` |
| `grounding` | `GroundingEngine` |
| `citations` | `CitationEngine` |
| `cache` | `ICache` |
| `telemetry` | `ITelemetryEngine` |

## Code Example

```typescript
import { RAGEngine, createDocument } from '@compilerai/enterprise-rag';

const rag = new RAGEngine({ chunkingConfig: { strategy: 'by_header' } });

// Ingest
await rag.ingest('google_drive', [
  createDocument('google_drive', 'file-1', 'Spec', 'Content here.', 'alice', 'org-1'),
]);

// Search
const results = await rag.search({ query: 'content', mode: 'hybrid', organizationId: 'org-1' });

// Explain
const answer = await rag.explain('What is the content?', 'org-1');

// Reindex a single document
await rag.reindex('doc-1');

// Invalidate cache
const removed = rag.invalidateCache('query:org-1:.*');

// Inspect telemetry and stats
console.log(rag.getTelemetryEvents());
console.log(rag.getCacheStats());
console.log(rag.countDocuments(), rag.countChunks(), rag.countEmbeddings());
```
