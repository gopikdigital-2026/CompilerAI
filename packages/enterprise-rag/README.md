# @compilerai/enterprise-rag v1.0.0

Enterprise RAG Engine that retrieves contextual knowledge from the Knowledge Graph, documents, and connectors. Provides agents with precise, traceable information through grounding and citations.

## Features

- **4 content sources** — Google Drive, Gmail, GitHub, and Knowledge Graph, each with a dedicated source adapter
- **Configurable chunking** — fixed size, by header, or by section, with table and code-block preservation
- **InMemory semantic index** — hash-based embedding provider and cosine-similarity vector store with pluggable interfaces
- **3 retrieval modes** — vector search, metadata search, and hybrid (score-merged) retrieval
- **5 ranking factors** — similarity, recency, authority, usage frequency, and source trust
- **Grounding with full traceability** — every answer includes grounded chunks, position ranges, and source provenance
- **Citations with KG cross-references** — per-chunk citations linked to Knowledge Graph entities via a configurable bridge
- **Multi-layer cache with automatic invalidation** — embedding, query, and result caches with hash-based and pattern-based invalidation
- **7 telemetry event types** — ingestion, indexing, retrieval, ranking, cache hit/miss, and grounding events
- **Permission-aware filtering** — public, organization, private, and restricted visibility levels enforced at retrieval time

## Quick start

```typescript
import { RAGEngine, createDocument } from '@compilerai/enterprise-rag';

const rag = new RAGEngine();

// Ingest documents
await rag.ingest('google_drive', [
  createDocument('google_drive', 'file-1', 'Project Spec', 'Project Alpha uses microservices architecture...', 'alice', 'org-1'),
]);

// Search with hybrid retrieval
const results = await rag.search({
  query: 'microservices architecture',
  mode: 'hybrid',
  organizationId: 'org-1',
  limit: 5,
});

// Get grounded answer with citations
const answer = await rag.explain('What architecture does Project Alpha use?', 'org-1');
console.log(answer.answer);
console.log(answer.citations);
```

## Modules

| # | Module | Path | Responsibility |
|---|--------|------|----------------|
| 1 | api | `src/api/RAGEngine.ts` | Public facade orchestrating all engines |
| 2 | ingestion | `src/ingestion/IngestionEngine.ts` | Source adapters, document registration, hashing |
| 3 | chunking | `src/chunking/ChunkingEngine.ts` | Fixed-size, header-based, and section-based chunking |
| 4 | indexing | `src/indexing/InMemoryIndex.ts` | Embedding provider and in-memory vector store |
| 5 | retrieval | `src/retrieval/RetrievalEngine.ts` | Vector, metadata, and hybrid retrieval with permission checks |
| 6 | ranking | `src/ranking/RankingEngine.ts` | Multi-factor scoring and sorting |
| 7 | grounding | `src/grounding/GroundingEngine.ts` | Answer synthesis, confidence, and KG cross-references |
| 8 | citations | `src/citations/CitationEngine.ts` | Citation formatting, bibliography, and traceability objects |
| 9 | cache | `src/cache/RAGCache.ts` | TTL-based multi-layer cache with hash and pattern invalidation |
| 10 | telemetry | `src/telemetry/TelemetryEngine.ts` | Event emission and querying |
| 11 | models | `src/models.ts` | All shared domain types and interfaces |

## Stats

| Metric | Value |
|--------|-------|
| Source files | 12 |
| Test files | 9 |
| Tests | 105 |
| Line coverage | 98.28% |
| Branch coverage | 92.12% |
| Function coverage | 96.64% |
| Test suites | 12 |

## Documentation

| Document | Description |
|----------|-------------|
| [docs/architecture.md](docs/architecture.md) | Architecture diagram, module descriptions, and data flow |
| [docs/ingestion.md](docs/ingestion.md) | Content sources, adapters, and document model |
| [docs/chunking.md](docs/chunking.md) | Chunking strategies and configuration |
| [docs/retrieval.md](docs/retrieval.md) | Retrieval modes, filters, and permission model |
| [docs/ranking.md](docs/ranking.md) | Ranking factors and source trust scores |
| [docs/grounding.md](docs/grounding.md) | Grounded answers, confidence, and KG cross-references |
| [docs/citations.md](docs/citations.md) | Citation structure, formatting, and bibliography |
| [docs/api.md](docs/api.md) | Public API methods and configuration |
| [docs/examples.md](docs/examples.md) | 14 complete usage examples |
| [VALIDATION_REPORT.md](VALIDATION_REPORT.md) | Full validation results and acceptance criteria |

## License

MIT
