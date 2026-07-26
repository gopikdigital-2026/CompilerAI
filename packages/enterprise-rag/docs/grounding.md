# Grounding

## Grounded Answer Structure

The `GroundingEngine` produces a `GroundedAnswer` that synthesizes a natural-language response from ranked retrieval results, with full traceability:

```typescript
interface GroundedAnswer {
  answer: string;            // synthesized response text
  citations: Citation[];     // per-chunk citations with KG refs
  groundedChunks: GroundedChunk[]; // source chunks with content and position
  confidence: number;        // computed confidence score [0, 0.98]
  organizationId: string;    // scope of the query
}
```

## Grounded Chunks

Each grounded chunk preserves the exact content and position from the source document:

```typescript
interface GroundedChunk {
  chunkId: string;                          // chunk identifier
  documentId: string;                       // parent document
  content: string;                          // chunk text
  score: number;                            // rank score
  section: string | null;                   // section name
  position: { start: number; end: number }; // character offsets in source
}
```

## Answer Synthesis

The `buildAnswer()` method constructs a response that references the top result and summarizes source diversity:

- States the number of retrieved documents and distinct sources.
- Names the top result's title, author, and score.
- Lists the sections where relevant content was found.
- Includes a 200-character excerpt of the top chunk's content.

When no results are found, the answer is: `No relevant information found for query: "<query>".`

## Confidence Computation

Confidence is computed as the average `rankScore` across all results, plus a source-diversity boost:

```
confidence = min(0.98, averageRankScore + min(0.15, distinctSourceCount × 0.05))
```

| Distinct sources | Boost |
|------------------|-------|
| 1 | 0.05 |
| 2 | 0.10 |
| 3+ | 0.15 |

The confidence is capped at 0.98 to reflect that absolute certainty is never guaranteed.

## Knowledge Graph Cross-References

When a `IKnowledgeGraphBridge` is configured, the grounding engine populates `knowledgeGraphRefs` on each citation by calling `getRelatedEntities(documentId, organizationId)`. This enables traceability between document chunks and Knowledge Graph entities.

Without a bridge, `knowledgeGraphRefs` defaults to an empty array.

## Code Example

```typescript
import { RAGEngine, createDocument } from '@compilerai/enterprise-rag';

const rag = new RAGEngine({
  kgBridge: {
    getRelatedEntities: (docId, orgId) => [`kg-entity-${docId}`],
    getEntityBySourceId: (sourceId, source) => undefined,
  },
});

await rag.ingest('google_drive', [
  createDocument('google_drive', 'file-1', 'Project Alpha',
    'Project Alpha uses a microservices architecture with API gateway.', 'alice', 'org-1'),
]);

const answer = await rag.explain('What architecture does Project Alpha use?', 'org-1');

console.log(answer.answer);
// Based on 1 retrieved document(s) from 1 source(s), the most relevant information
// comes from "Project Alpha" by alice (score: 0.750). Key content: "Project Alpha
// uses a microservices architecture with API gateway...."

console.log(answer.confidence);         // e.g. 0.80
console.log(answer.groundedChunks[0]);  // { chunkId, documentId, content, score, section, position }
console.log(answer.citations[0].knowledgeGraphRefs); // ['kg-entity-doc-1']
```

### Using the GroundingEngine directly

```typescript
import { GroundingEngine, ChunkingEngine, RetrievalEngine, InMemoryEmbeddingProvider, InMemoryVectorStore } from '@compilerai/enterprise-rag';

const grounding = new GroundingEngine();
// grounding.ground(query, rankedResults, organizationId) → GroundedAnswer
```
