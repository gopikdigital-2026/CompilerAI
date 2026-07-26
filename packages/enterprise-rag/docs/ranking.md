# Ranking

## Ranking Factors

The `RankingEngine` scores each `RetrievalResult` using five weighted factors. The final `rankScore` is a weighted sum:

```
rankScore = similarity × 0.40
          + recency × 0.15
          + authority × 0.15
          + usageFrequency × 0.10
          + sourceTrust × 0.20
```

| Factor | Weight | Computation |
|--------|--------|-------------|
| Similarity | 0.40 | Retrieval score clamped to `[0, 1]` |
| Recency | 0.15 | `1 − ageMs / (180 days in ms)`, clamped to `[0, 1]` |
| Authority | 0.15 | Author authority value (default 0.5, configurable via `setAuthorAuthority`) |
| Usage frequency | 0.10 | `min(1, retrievalCount / 10)` |
| Source trust | 0.20 | Per-source trust score from the built-in table |

## Source Trust Scores

| Source | Trust score |
|--------|-------------|
| `knowledge_graph` | 1.00 |
| `github` | 0.85 |
| `google_drive` | 0.75 |
| `gmail` | 0.70 |
| (unknown) | 0.50 |

Knowledge Graph content receives the highest trust because it represents curated, structured knowledge. GitHub follows as a source of authoritative code and documentation. Google Drive and Gmail carry moderate trust as collaborative but less structured sources.

## Ranked Result

```typescript
interface RankedResult extends RetrievalResult {
  rankScore: number;        // weighted sum of all factors
  factors: RankingFactors;  // individual factor values
}

interface RankingFactors {
  similarity: number;
  recency: number;
  authority: number;
  usageFrequency: number;
  sourceTrust: number;
}
```

## Configuring Authority

Author authority defaults to 0.5 for all authors. You can override it per author:

```typescript
const rag = new RAGEngine();

// Set authority for specific authors
rag.ranking.setAuthorAuthority('alice', 0.9);  // senior architect
rag.ranking.setAuthorAuthority('bob', 0.6);    // junior engineer
```

## Usage Frequency

The ranking engine tracks how often each chunk is retrieved. Usage counts are propagated from the `RetrievalEngine` during `search()`:

```typescript
// The RAGEngine.search() method handles this automatically:
for (const r of results) {
  this.ranking.setUsageCount(r.chunk.id, this.retrieval.getUsageCount(r.chunk.id));
}
```

A chunk that has been retrieved 10 or more times receives the maximum usage-frequency factor of 1.0.

## Code Example

```typescript
import { RAGEngine, createDocument } from '@compilerai/enterprise-rag';

const rag = new RAGEngine();
rag.ranking.setAuthorAuthority('alice', 0.9);

await rag.ingest('knowledge_graph', [
  createDocument('knowledge_graph', 'kg-1', 'Microservices Pattern',
    'Microservices architecture decomposes applications into small services.', 'alice', 'org-1'),
]);
await rag.ingest('gmail', [
  createDocument('gmail', 'email-1', 'Architecture Discussion',
    'Let us discuss the microservices approach.', 'bob', 'org-1'),
]);

const results = await rag.search({
  query: 'microservices architecture',
  mode: 'hybrid',
  organizationId: 'org-1',
  limit: 5,
});

for (const r of results) {
  console.log(r.document.title, r.rankScore.toFixed(3), r.factors);
}
// The Knowledge Graph document ranks higher due to sourceTrust 1.0 and alice's authority 0.9.
```

### Inspecting weights

```typescript
const weights = rag.ranking.getWeights();
// { similarity: 0.40, recency: 0.15, authority: 0.15, usageFrequency: 0.10, sourceTrust: 0.20 }
```
