# Retrieval

## Retrieval Modes

The `RetrievalEngine` supports three retrieval modes:

| Mode | Identifier | Description |
|------|------------|-------------|
| Vector | `vector` | Embeds the query and searches the vector store by cosine similarity |
| Metadata | `metadata` | Token-overlap scoring against chunk content, document title, and section |
| Hybrid | `hybrid` | Runs vector and metadata retrieval in parallel, merges scores with a match boost |

### Hybrid merging

Hybrid retrieval executes both vector and metadata searches (each with `2× limit`), then merges results into a map keyed by chunk ID:

- Chunks found by **both** modes receive `max(scores) × 1.1` (match boost).
- Chunks found only by **vector** receive `score × 0.7`.
- Chunks found only by **metadata** receive `score × 0.5`.

The merged list is sorted by score and truncated to the requested limit.

## Query Structure

```typescript
interface RetrievalQuery {
  query: string;                              // search text
  mode: RetrievalMode;                        // 'vector' | 'metadata' | 'hybrid'
  organizationId: string;                     // required org scope
  userId?: string;                            // for private/restricted checks
  roleIds?: string[];                         // for restricted checks
  source?: ContentSource;                     // filter by source
  dateRange?: { start: string; end: string }; // filter by createdAt
  limit?: number;                             // max results (default 10)
}
```

## Filters

| Filter | Field | Applies to |
|--------|-------|------------|
| Organization | `organizationId` | All modes — always enforced |
| Source | `source` | All modes — restricts to one content source |
| Date range | `dateRange` | All modes — filters by `createdAt` |
| Permissions | `userId` / `roleIds` | All modes — enforced via visibility rules |
| Document IDs | (internal) | Vector store filter for scoped reindex scenarios |

## Permission Model

Every document carries a `DocumentPermissions` object. The retrieval engine checks permissions before including a result:

| Visibility | Access rule | Required query fields |
|------------|-------------|----------------------|
| `public` | Always accessible | none |
| `organization` | Same `organizationId` as query | `organizationId` (always present) |
| `private` | `userId` must be in `allowedUserIds` | `userId` |
| `restricted` | `userId` in `allowedUserIds` **or** any `roleId` in `allowedRoleIds` | `userId` and/or `roleIds` |

Documents that fail the permission check are silently excluded from results.

## Retrieval Result

```typescript
interface RetrievalResult {
  chunk: Chunk;               // the matched chunk
  document: IngestedDocument; // parent document
  score: number;              // raw retrieval score
  matchedFields: string[];    // e.g. ['vector'], ['content', 'title']
}
```

## Code Example

```typescript
import { RAGEngine, createDocument } from '@compilerai/enterprise-rag';

const rag = new RAGEngine();

await rag.ingest('google_drive', [
  createDocument('google_drive', 'file-1', 'Microservices', 'The system uses microservices...', 'alice', 'org-1',
    { visibility: 'organization' }),
  createDocument('google_drive', 'file-2', 'Secret Roadmap', 'Confidential Q4 plans...', 'alice', 'org-1',
    { visibility: 'private', allowedUserIds: ['alice'] }),
]);

// Vector search — accessible to anyone in org-1
const vectorResults = await rag.retrieve({
  query: 'microservices',
  mode: 'vector',
  organizationId: 'org-1',
  limit: 5,
});

// Metadata search
const metadataResults = await rag.retrieve({
  query: 'microservices architecture',
  mode: 'metadata',
  organizationId: 'org-1',
});

// Hybrid search
const hybridResults = await rag.retrieve({
  query: 'microservices architecture',
  mode: 'hybrid',
  organizationId: 'org-1',
  limit: 10,
});

// Private document — requires userId
const privateResults = await rag.retrieve({
  query: 'Q4 plans',
  mode: 'hybrid',
  organizationId: 'org-1',
  userId: 'alice',
});
```

### Using search() vs retrieve()

`RAGEngine.search()` wraps `retrieve()` with ranking and caching — it returns `RankedResult[]` with computed factors and a `rankScore`. `RAGEngine.retrieve()` returns raw `RetrievalResult[]` without ranking or caching, useful when you need unranked results or want to apply custom ranking.
