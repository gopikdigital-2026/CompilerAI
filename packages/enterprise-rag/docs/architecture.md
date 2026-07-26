# Architecture

## Overview

The Enterprise RAG Engine is organized as a pipeline of specialized modules. Each module owns a single responsibility and communicates through well-typed interfaces defined in `src/models.ts`. The `RAGEngine` facade in `src/api/RAGEngine.ts` orchestrates the modules and exposes six public methods.

## Architecture Diagram

```
 ┌───────────┐   ┌───────────┐   ┌───────────┐   ┌─────────────────┐
 │  Google   │   │   Gmail   │   │  GitHub   │   │  Knowledge Graph│
 │  Drive    │   │           │   │           │   │                 │
 └─────┬─────┘   └─────┬─────┘   └─────┬─────┘   └────────┬────────┘
       │               │               │                  │
       ▼               ▼               ▼                  ▼
 ┌─────────────────────────────────────────────────────────────┐
 │                      INGESTION                              │
 │  Source adapters · createDocument() · hashing · org index   │
 └───────────────────────────┬─────────────────────────────────┘
                             ▼
 ┌─────────────────────────────────────────────────────────────┐
 │                       CHUNKING                              │
 │  fixed_size · by_header · by_section                        │
 │  table/code preservation · token estimation                 │
 └───────────────────────────┬─────────────────────────────────┘
                             ▼
 ┌─────────────────────────────────────────────────────────────┐
 │              INDEXING (Embeddings + Vector Store)           │
 │  InMemoryEmbeddingProvider · InMemoryVectorStore            │
 │  cosine similarity · org/doc filtering                      │
 └───────────────────────────┬─────────────────────────────────┘
                             ▼
 ┌─────────────────────────────────────────────────────────────┐
 │         RETRIEVAL  (vector + metadata + hybrid)             │
 │  permission checks · date range filters · usage tracking    │
 └───────────────────────────┬─────────────────────────────────┘
                             ▼
 ┌─────────────────────────────────────────────────────────────┐
 │                        RANKING                              │
 │  similarity · recency · authority · usage · source trust    │
 └───────────────────────────┬─────────────────────────────────┘
                             ▼
 ┌─────────────────────────────────────────────────────────────┐
 │                       GROUNDING                             │
 │  answer synthesis · confidence · KG cross-references        │
 └───────────────────────────┬─────────────────────────────────┘
                             ▼
 ┌─────────────────────────────────────────────────────────────┐
 │                       CITATIONS                             │
 │  per-chunk citations · bibliography · traceability object   │
 └───────────────────────────┬─────────────────────────────────┘
                             ▼
                        ┌──────────┐
                        │  Answer  │
                        └──────────┘
```

## Module Descriptions

### 1. api (`src/api/RAGEngine.ts`)

The public facade. It wires together all engines, manages chunk and embedding maps, caches query and result entries, and emits telemetry events. Exposes `ingest()`, `reindex()`, `search()`, `retrieve()`, `explain()`, and `invalidateCache()`.

### 2. ingestion (`src/ingestion/IngestionEngine.ts`)

Manages source adapters (`GoogleDriveAdapter`, `GmailAdapter`, `GitHubAdapter`, `KnowledgeGraphAdapter`), document registration with upsert semantics (added vs. updated by content hash), and per-organization document indexing. Provides the `createDocument()` helper.

### 3. chunking (`src/chunking/ChunkingEngine.ts`)

Splits documents into chunks using one of three strategies. Preserves code blocks and tables by extending chunk boundaries to include protected segments. Estimates token counts as `ceil(length / 4)`.

### 4. indexing (`src/indexing/InMemoryIndex.ts`)

Provides `InMemoryEmbeddingProvider` (hash-based, 128-dimensional, L2-normalized) and `InMemoryVectorStore` (cosine similarity with organization and document-ID filtering). Both implement pluggable interfaces (`IEmbeddingProvider`, `IVectorStore`).

### 5. retrieval (`src/retrieval/RetrievalEngine.ts`)

Executes vector, metadata, or hybrid retrieval. Enforces permission checks (public, organization, private, restricted), date-range filtering, and per-chunk usage tracking. Hybrid mode runs vector and metadata in parallel and merges scores with a match boost.

### 6. ranking (`src/ranking/RankingEngine.ts`)

Scores retrieval results using five weighted factors. Source trust scores: Knowledge Graph 1.0, GitHub 0.85, Google Drive 0.75, Gmail 0.70. Recency decays linearly over 180 days. Usage frequency normalizes to 10 retrievals.

### 7. grounding (`src/grounding/GroundingEngine.ts`)

Synthesizes a grounded answer from ranked results, computes confidence (average rank score plus a source-diversity boost capped at 0.15), and attaches KG cross-references via the optional `IKnowledgeGraphBridge`.

### 8. citations (`src/citations/CitationEngine.ts`)

Formats individual citations and citation lists, generates deduplicated bibliographies, and produces traceability objects (document IDs, chunk IDs, KG refs, sources).

### 9. cache (`src/cache/RAGCache.ts`)

TTL-based multi-layer cache with a hash index for content-aware invalidation. Supports per-key, per-hash, and regex-pattern invalidation. Tracks hits, misses, and invalidation counts. Default TTL: 3,600,000 ms (1 hour).

### 10. telemetry (`src/telemetry/TelemetryEngine.ts`)

In-memory event store supporting seven event types. Events carry a type, timestamp, optional organization ID, and arbitrary metadata. Queryable by type or in full.

### 11. models (`src/models.ts`)

All shared domain types and interfaces: `IngestedDocument`, `Chunk`, `EmbeddingVector`, `RetrievalQuery`, `RankedResult`, `GroundedAnswer`, `Citation`, `CacheEntry`, `TelemetryEvent`, and the pluggable interfaces (`IEmbeddingProvider`, `IVectorStore`, `ICache`, `ITelemetryEngine`, `IKnowledgeGraphBridge`).

## Data Flow

1. **Ingest** — `RAGEngine.ingest()` receives documents, calls `IngestionEngine.ingest()` for registration, `ChunkingEngine.chunk()` for splitting, and `embeddingProvider.embedBatch()` for embeddings. Chunks and embeddings are indexed in `RetrievalEngine`. Cache entries for the document hash are invalidated.

2. **Search** — `RAGEngine.search()` checks the query cache, then delegates to `RetrievalEngine.retrieve()`. Results are ranked by `RankingEngine.rank()` and cached under a content-hash key. Telemetry events are emitted for cache hit/miss, retrieval, and ranking.

3. **Explain** — `RAGEngine.explain()` checks the result cache, runs a hybrid search, then calls `GroundingEngine.ground()` to produce a `GroundedAnswer` with citations, grounded chunks, and confidence. The answer is cached and a `grounding.completed` event is emitted.

## Cache Layer

The cache operates at three levels:

| Layer | Key pattern | Invalidation trigger |
|-------|-------------|----------------------|
| Embeddings | `emb:<hash>` | Content hash change |
| Queries | `query:<org>:<mode>:<hash>` | Hash invalidation or pattern match |
| Results | `result:<org>:<hash>` | Hash invalidation or pattern match |

Automatic invalidation occurs on ingest (`invalidateByHash`) and reindex (`invalidatePattern` for a single document, `clear()` for all).

## Permission Filtering

The `RetrievalEngine` enforces four visibility levels:

| Visibility | Access rule |
|------------|-------------|
| `public` | Always accessible |
| `organization` | Same `organizationId` as the query |
| `private` | `userId` must be in `allowedUserIds` |
| `restricted` | `userId` in `allowedUserIds` **or** any `roleId` in `allowedRoleIds` |

## Knowledge Graph Bridge

The `IKnowledgeGraphBridge` interface connects retrieved documents to Knowledge Graph entities:

```typescript
interface IKnowledgeGraphBridge {
  getRelatedEntities(documentId: string, organizationId: string): string[];
  getEntityBySourceId(sourceId: string, source: ContentSource): string | undefined;
}
```

When configured, `GroundingEngine.ground()` populates `knowledgeGraphRefs` on each citation, enabling cross-references between document chunks and KG entities.
