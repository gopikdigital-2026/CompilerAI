# Examples

This document provides complete, runnable examples covering every public API of the Enterprise RAG Engine.

## 1. Basic setup and ingest

```typescript
import { RAGEngine, createDocument } from '@compilerai/enterprise-rag';

const rag = new RAGEngine();

const result = await rag.ingest('google_drive', [
  createDocument(
    'google_drive',
    'file-1',
    'Project Alpha Spec',
    'Project Alpha uses a microservices architecture with an API gateway and event-driven communication.',
    'alice',
    'org-1',
  ),
]);

console.log(result);
// { documentsIngested: 1, chunksCreated: 1, embeddingsGenerated: 1, errors: [], durationMs: 3 }

console.log(rag.countDocuments()); // 1
console.log(rag.countChunks());    // 1
console.log(rag.countEmbeddings()); // 1
```

## 2. Ingest from different sources

```typescript
import { RAGEngine, createDocument } from '@compilerai/enterprise-rag';

const rag = new RAGEngine();

// Google Drive
await rag.ingest('google_drive', [
  createDocument('google_drive', 'doc-1', 'Design Doc', 'The system uses event sourcing.', 'alice', 'org-1'),
]);

// Gmail
await rag.ingest('gmail', [
  createDocument('gmail', 'email-42', 'Re: Architecture', 'We agreed on microservices.', 'bob', 'org-1'),
]);

// GitHub
await rag.ingest('github', [
  createDocument('github', 'repo-1/readme', 'README', '# Project Alpha\n\nMicroservices-based system.', 'carol', 'org-1'),
]);

// Knowledge Graph
await rag.ingest('knowledge_graph', [
  createDocument('knowledge_graph', 'kg-node-7', 'Microservices Pattern',
    'Microservices decompose applications into loosely coupled services.', 'system', 'org-1'),
]);

console.log(rag.countDocuments()); // 4

// Filter by source via the ingestion engine
const githubDocs = rag.ingestion.getDocumentsBySource('github');
console.log(githubDocs.length); // 1
```

## 3. Chunking with different strategies

```typescript
import { RAGEngine, createDocument } from '@compilerai/enterprise-rag';

const content = [
  '# Overview',
  '',
  'The system uses microservices.',
  '',
  '---',
  '',
  '# Details',
  '',
  '```yaml',
  'service: api-gateway',
  'port: 8080',
  '```',
  '',
  '| Component | Technology |',
  '|-----------|-----------|',
  '| Gateway   | Kong      |',
  '| Services  | Go        |',
].join('\n');

// Fixed size
const ragFixedSize = new RAGEngine({ chunkingConfig: { strategy: 'fixed_size', chunkSize: 100, overlap: 20 } });
await ragFixedSize.ingest('google_drive', [createDocument('google_drive', 'f1', 'Doc', content, 'alice', 'org-1')]);
console.log('fixed_size chunks:', ragFixedSize.countChunks());

// By header
const ragByHeader = new RAGEngine({ chunkingConfig: { strategy: 'by_header', chunkSize: 512, overlap: 0 } });
await ragByHeader.ingest('google_drive', [createDocument('google_drive', 'f2', 'Doc', content, 'alice', 'org-1')]);
console.log('by_header chunks:', ragByHeader.countChunks());

// By section
const ragBySection = new RAGEngine({
  chunkingConfig: { strategy: 'by_section', chunkSize: 200, overlap: 0, preserveCodeBlocks: true, preserveTables: true },
});
await ragBySection.ingest('google_drive', [createDocument('google_drive', 'f3', 'Doc', content, 'alice', 'org-1')]);
console.log('by_section chunks:', ragBySection.countChunks());
```

## 4. Vector search

```typescript
import { RAGEngine, createDocument } from '@compilerai/enterprise-rag';

const rag = new RAGEngine();

await rag.ingest('google_drive', [
  createDocument('google_drive', 'file-1', 'Microservices Guide',
    'Microservices architecture decomposes applications into small, independent services.', 'alice', 'org-1'),
  createDocument('google_drive', 'file-2', 'Monolith Guide',
    'A monolithic architecture builds the entire application as a single unit.', 'bob', 'org-1'),
]);

const results = await rag.search({
  query: 'microservices decomposition',
  mode: 'vector',
  organizationId: 'org-1',
  limit: 5,
});

console.log(results.length); // results matching the query
console.log(results[0].document.title); // 'Microservices Guide'
console.log(results[0].factors.similarity.toFixed(3));
```

## 5. Metadata search

```typescript
import { RAGEngine, createDocument } from '@compilerai/enterprise-rag';

const rag = new RAGEngine();

await rag.ingest('github', [
  createDocument('github', 'repo-1', 'API Documentation',
    'The REST API exposes endpoints for user management and authentication.', 'alice', 'org-1'),
  createDocument('github', 'repo-2', 'Database Schema',
    'PostgreSQL schema with tables for users, sessions, and audit logs.', 'bob', 'org-1'),
]);

const results = await rag.retrieve({
  query: 'API endpoints authentication',
  mode: 'metadata',
  organizationId: 'org-1',
  limit: 5,
});

for (const r of results) {
  console.log(r.document.title, r.score.toFixed(3), r.matchedFields);
}
// 'API Documentation' will score higher due to token overlap in content and title
```

## 6. Hybrid search

```typescript
import { RAGEngine, createDocument } from '@compilerai/enterprise-rag';

const rag = new RAGEngine();

await rag.ingest('google_drive', [
  createDocument('google_drive', 'file-1', 'Microservices',
    'Microservices architecture enables independent deployment and scaling.', 'alice', 'org-1'),
]);
await rag.ingest('github', [
  createDocument('github', 'repo-1', 'Deployment Guide',
    'Microservices are deployed using Kubernetes with Helm charts.', 'bob', 'org-1'),
]);

const results = await rag.search({
  query: 'microservices deployment',
  mode: 'hybrid',
  organizationId: 'org-1',
  limit: 10,
});

for (const r of results) {
  console.log(r.document.title, r.rankScore.toFixed(3), r.matchedFields);
  // Chunks matching both vector and metadata get a 1.1× boost
}
```

## 7. Search with permission filter

```typescript
import { RAGEngine, createDocument } from '@compilerai/enterprise-rag';

const rag = new RAGEngine();

await rag.ingest('google_drive', [
  // Public — visible to everyone
  createDocument('google_drive', 'pub-1', 'Public Docs', 'Public architecture overview.', 'alice', 'org-1',
    { visibility: 'public' }),

  // Organization — visible to anyone in org-1
  createDocument('google_drive', 'org-1', 'Internal Docs', 'Internal microservices details.', 'alice', 'org-1',
    { visibility: 'organization' }),

  // Private — visible only to alice
  createDocument('google_drive', 'priv-1', 'Private Notes', 'Confidential architecture decisions.', 'alice', 'org-1',
    { visibility: 'private', allowedUserIds: ['alice'] }),

  // Restricted — visible to engineers role or alice
  createDocument('google_drive', 'rest-1', 'Restricted Spec', 'Restricted API design.', 'alice', 'org-1',
    { visibility: 'restricted', allowedUserIds: ['alice'], allowedRoleIds: ['engineers'] }),
]);

// Alice can see all four documents
const aliceResults = await rag.search({
  query: 'architecture',
  mode: 'hybrid',
  organizationId: 'org-1',
  userId: 'alice',
  roleIds: ['engineers'],
});

// Bob (no roles) can see only public and organization documents
const bobResults = await rag.search({
  query: 'architecture',
  mode: 'hybrid',
  organizationId: 'org-1',
  userId: 'bob',
});

console.log(aliceResults.length); // includes private and restricted
console.log(bobResults.length);   // only public and organization
```

## 8. Search with date range

```typescript
import { RAGEngine, createDocument } from '@compilerai/enterprise-rag';

const rag = new RAGEngine();

// Create documents with specific creation dates
const oldDoc = createDocument('github', 'repo-1', 'Old Design', 'Legacy monolith architecture.', 'alice', 'org-1');
oldDoc.createdAt = '2023-01-15T00:00:00.000Z';

const newDoc = createDocument('github', 'repo-2', 'New Design', 'Modern microservices architecture.', 'bob', 'org-1');
newDoc.createdAt = '2024-06-20T00:00:00.000Z';

await rag.ingest('github', [oldDoc, newDoc]);

// Search within a date range — only recent documents
const recentResults = await rag.search({
  query: 'architecture',
  mode: 'hybrid',
  organizationId: 'org-1',
  dateRange: { start: '2024-01-01T00:00:00.000Z', end: '2024-12-31T23:59:59.999Z' },
});

console.log(recentResults.length); // 1 — only 'New Design'
console.log(recentResults[0].document.title); // 'New Design'
```

## 9. Explain with citations

```typescript
import { RAGEngine, createDocument } from '@compilerai/enterprise-rag';

const rag = new RAGEngine();

await rag.ingest('google_drive', [
  createDocument('google_drive', 'file-1', 'Project Alpha',
    'Project Alpha uses a microservices architecture with an API gateway and event-driven communication.', 'alice', 'org-1'),
  createDocument('github', 'repo-1', 'Architecture Decision Record',
    'We chose microservices to enable independent team velocity and deployment.', 'bob', 'org-1'),
]);

const answer = await rag.explain('What architecture does Project Alpha use?', 'org-1');

console.log(answer.answer);
// Based on 2 retrieved document(s) from 2 source(s), the most relevant information comes from ...

console.log(answer.confidence.toFixed(3));
console.log(answer.citations.length);    // 2
console.log(answer.groundedChunks.length); // 2

// Each citation has full provenance
for (const c of answer.citations) {
  console.log(c.documentTitle, c.source, c.author, c.score.toFixed(3), c.position);
}
```

## 10. Reindex documents

```typescript
import { RAGEngine, createDocument } from '@compilerai/enterprise-rag';

const rag = new RAGEngine();

await rag.ingest('google_drive', [
  createDocument('google_drive', 'file-1', 'Doc A', 'Content for document A.', 'alice', 'org-1'),
  createDocument('google_drive', 'file-2', 'Doc B', 'Content for document B.', 'bob', 'org-1'),
]);

console.log(rag.countChunks());    // e.g. 2
console.log(rag.countEmbeddings()); // e.g. 2

// Reindex a single document
const singleResult = await rag.reindex('doc-1');
console.log(singleResult);
// { documentsReindexed: 1, chunksReprocessed: 1, embeddingsRegenerated: 1, errors: [], durationMs: 2 }

// Reindex all documents
const allResult = await rag.reindex();
console.log(allResult);
// { documentsReindexed: 2, chunksReprocessed: 2, embeddingsRegenerated: 2, errors: [], durationMs: 3 }

// Reindexing clears relevant cache entries
const stats = rag.getCacheStats();
console.log(stats.invalidated); // > 0
```

## 11. Cache invalidation

```typescript
import { RAGEngine, createDocument } from '@compilerai/enterprise-rag';

const rag = new RAGEngine();

await rag.ingest('google_drive', [
  createDocument('google_drive', 'file-1', 'Project Alpha', 'Microservices architecture.', 'alice', 'org-1'),
]);

// First search — cache miss
const results1 = await rag.search({ query: 'microservices', mode: 'hybrid', organizationId: 'org-1' });
let stats = rag.getCacheStats();
console.log(stats.misses); // 1
console.log(stats.hits);   // 0

// Second search — cache hit
const results2 = await rag.search({ query: 'microservices', mode: 'hybrid', organizationId: 'org-1' });
stats = rag.getCacheStats();
console.log(stats.hits); // 1

// Invalidate by pattern
const removed = rag.invalidateCache('query:org-1:.*');
console.log(removed); // 1 — the query cache entry

// Clear all cache
const totalCleared = rag.invalidateCache();
console.log(totalCleared); // remaining entries

// Ingesting new content invalidates cache entries by content hash
await rag.ingest('google_drive', [
  createDocument('google_drive', 'file-2', 'New Doc', 'Additional context.', 'alice', 'org-1'),
]);
stats = rag.getCacheStats();
console.log(stats.invalidated); // incremented
```

## 12. Knowledge Graph bridge integration

```typescript
import { RAGEngine, createDocument } from '@compilerai/enterprise-rag';
import type { IKnowledgeGraphBridge } from '@compilerai/enterprise-rag';

// Implement the KG bridge
const kgBridge: IKnowledgeGraphBridge = {
  getRelatedEntities(documentId: string, organizationId: string): string[] {
    // In production, query the Knowledge Graph for entities related to this document
    const entityMap: Record<string, string[]> = {
      'doc-1': ['kg:concept:microservices', 'kg:pattern:event-driven'],
      'doc-2': ['kg:concept:api-gateway'],
    };
    return entityMap[documentId] ?? [];
  },

  getEntityBySourceId(sourceId: string, source: string): string | undefined {
    // Map source IDs to KG entities
    if (sourceId.startsWith('kg-')) return `kg:entity:${sourceId}`;
    return undefined;
  },
};

const rag = new RAGEngine({ kgBridge });

await rag.ingest('google_drive', [
  createDocument('google_drive', 'file-1', 'Microservices Architecture',
    'Microservices with event-driven communication and an API gateway.', 'alice', 'org-1'),
  createDocument('google_drive', 'file-2', 'API Gateway Design',
    'The API gateway handles routing, authentication, and rate limiting.', 'bob', 'org-1'),
]);

const answer = await rag.explain('What is the architecture?', 'org-1');

// Citations now include KG cross-references
for (const c of answer.citations) {
  console.log(c.documentTitle, '→', c.knowledgeGraphRefs);
}
// 'Microservices Architecture' → ['kg:concept:microservices', 'kg:pattern:event-driven']
// 'API Gateway Design' → ['kg:concept:api-gateway']

// Use the traceability object to collect all KG refs
const { CitationEngine } = await import('@compilerai/enterprise-rag');
const trace = new CitationEngine().toTraceableObject(answer.citations);
console.log(trace.kgRefs);
// ['kg:concept:microservices', 'kg:pattern:event-driven', 'kg:concept:api-gateway']
```

## 13. Format citations and bibliography

```typescript
import { RAGEngine, createDocument } from '@compilerai/enterprise-rag';

const rag = new RAGEngine();

await rag.ingest('google_drive', [
  createDocument('google_drive', 'file-1', 'Project Alpha Spec',
    'Project Alpha uses microservices with an event-driven design.', 'alice', 'org-1'),
  createDocument('github', 'repo-1', 'Architecture ADR',
    'Decision: adopt microservices for independent deployment.', 'bob', 'org-1'),
  createDocument('gmail', 'email-1', 'Architecture Review',
    'The team approved the microservices approach.', 'carol', 'org-1'),
]);

const answer = await rag.explain('What architecture was chosen?', 'org-1');

// Format as a numbered citation list
console.log(rag.formatCitations(answer));
// Citations (3):
//   1. [doc-1] Project Alpha Spec — alice (source: google_drive) pos: 0-56 score: 0.750
//   2. [doc-2] Architecture ADR — bob (source: github) pos: 0-52 score: 0.680
//   3. [doc-3] Architecture Review — carol (source: gmail) pos: 0-42 score: 0.610

// Format as a deduplicated bibliography
console.log(rag.formatBibliography(answer));
// Bibliography (3 source(s)):
// 1. Project Alpha Spec — alice (google_drive)
// 2. Architecture ADR — bob (github)
// 3. Architecture Review — carol (gmail)

// Get raw citations array
const citations = rag.getCitations(answer);
console.log(citations.length); // 3
```

## 14. Custom embedding provider

```typescript
import { RAGEngine, createDocument } from '@compilerai/enterprise-rag';
import type { IEmbeddingProvider, IVectorStore, EmbeddingVector, VectorSearchFilter, VectorSearchResult } from '@compilerai/enterprise-rag';

// Implement a custom embedding provider
class CustomEmbeddingProvider implements IEmbeddingProvider {
  private readonly dims = 256;

  async embed(text: string): Promise<number[]> {
    return this.encode(text);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return texts.map((t) => this.encode(t));
  }

  dimensions(): number {
    return this.dims;
  }

  private encode(text: string): number[] {
    const vector = new Array(this.dims).fill(0);
    const tokens = text.toLowerCase().split(/\s+/).filter(Boolean);
    for (const token of tokens) {
      const idx = Math.abs(this.hashCode(token)) % this.dims;
      vector[idx] += 1;
    }
    // L2 normalize
    const norm = Math.sqrt(vector.reduce((s, v) => s + v * v, 0));
    return norm > 0 ? vector.map((v) => v / norm) : vector;
  }

  private hashCode(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return h;
  }
}

// Implement a custom vector store (optional — InMemoryVectorStore is fine for most cases)
class CustomVectorStore implements IVectorStore {
  private readonly store = new Map<string, EmbeddingVector>();

  add(embedding: EmbeddingVector): void {
    this.store.set(embedding.id, embedding);
  }

  addBatch(embeddings: EmbeddingVector[]): void {
    embeddings.forEach((e) => this.add(e));
  }

  remove(id: string): void {
    this.store.delete(id);
  }

  removeByDocument(documentId: string): void {
    for (const [id, emb] of this.store) {
      if (emb.documentId === documentId) this.store.delete(id);
    }
  }

  search(vector: number[], limit: number, filter?: VectorSearchFilter): VectorSearchResult[] {
    let candidates = Array.from(this.store.values());
    if (filter?.organizationId) {
      candidates = candidates.filter((e) => e.organizationId === filter.organizationId);
    }
    const results = candidates.map((embedding) => ({
      embedding,
      score: this.cosine(vector, embedding.vector),
    }));
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  count(): number {
    return this.store.size;
  }

  private cosine(a: number[], b: number[]): number {
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i];
    }
    return na === 0 || nb === 0 ? 0 : dot / (Math.sqrt(na) * Math.sqrt(nb));
  }
}

// Wire custom implementations into the RAG engine
const rag = new RAGEngine({
  embeddingProvider: new CustomEmbeddingProvider(),
  vectorStore: new CustomVectorStore(),
  chunkingConfig: { strategy: 'fixed_size', chunkSize: 300, overlap: 50 },
});

await rag.ingest('github', [
  createDocument('github', 'repo-1', 'Custom Search', 'Content indexed with custom embeddings.', 'alice', 'org-1'),
]);

const results = await rag.search({ query: 'custom embeddings', mode: 'vector', organizationId: 'org-1' });
console.log(results.length);
console.log(results[0].document.title); // 'Custom Search'
```
