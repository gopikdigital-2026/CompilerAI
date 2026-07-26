# Indexing

The `IndexManager` maintains seven in-memory indexes that accelerate search. Every entity is indexed on creation and update; every entity is de-indexed on deletion. Indexes can also be rebuilt from the graph at any time.

## The seven index types

| Index type | Key | Backed by | Lookup method |
|-----------|-----|-----------|---------------|
| `entity_type` | Entity `type` | `Map<EntityType, Set<entityId>>` | `getByType(type)` |
| `tags` | Each tag in `tags[]` | `Map<tag, Set<entityId>>` | `getByTag(tag)` |
| `dates` | `createdAt` day (YYYY-MM-DD) | Array of `{ date, entityIds }` | `getByDateRange(start, end)` |
| `connector` | `metadata.connector` | `Map<connector, Set<entityId>>` | `getByConnector(connector)` |
| `owner` | `metadata.ownerId` | `Map<ownerId, Set<entityId>>` | `getByOwner(ownerId)` |
| `organization` | `organizationId` | `Map<orgId, Set<entityId>>` | `getByOrganization(orgId)` |
| `text` | Tokenized values | `Map<token, entityId[]>` | `searchText(text, limit?)` |

`getStats()` returns an `IndexStats[]` with the size and last-updated timestamp for each of the seven indexes.

## Text tokenization

When an entity is indexed, `tokenize(entity)` produces tokens from:

- the entity `id` (lowercased),
- the entity `type` (lowercased),
- each tag (lowercased),
- each property value — strings are split on whitespace and lowercased; numbers are stringified.

Each token maps to a list of entity ids. `searchText(text, limit)` splits the query into tokens, scores each entity by how many query tokens it contains (exact match = 1.0, prefix match = 0.5), sorts by score descending, and returns the top `limit` entity ids (default 50). The search engine then hydrates those ids into `SearchResult` objects with computed relevance scores.

## Index rebuild

`rebuild(graph)` clears every index and re-indexes all entities from the graph. It pulls every entity via `graph.query({ limit: Number.MAX_SAFE_INTEGER })` and calls `indexEntity` on each. Use this after bulk loads that bypassed the index, or to reclaim space after many deletions.

## Architecture for hybrid search

The `SearchEngine` combines the graph and the index to answer queries:

1. **Structured filters** (`type`, `tags`, `properties`, `organizationId`) are evaluated by `graph.query`, which scans entities directly.
2. **Text queries** are answered by `index.searchText`, which returns ranked entity ids; the search engine hydrates them from the graph and computes a text score.
3. **Combined queries** (structured + text) run the structured filter on the graph, then boost the score of any result that also appears in the text index, and re-sort by score.

This split keeps the graph as the source of truth while the index accelerates the text path. Future sprints can add a dedicated text-search index (for example, an embedded vector store) behind the same `IIndexManager` interface without changing the search engine or its callers.

## Code example

```typescript
import { KnowledgeGraphAPI } from '@compilerai/knowledge-graph';

const kg = new KnowledgeGraphAPI();

kg.createEntity('project', { name: 'Alpha' }, 'org-1', { tags: ['priority'], ownerId: 'alice' });
kg.createEntity('document', { title: 'Alpha Spec' }, 'org-1', { connector: 'drive' });

// Type index
const projects = kg.index.getByType('project');
console.log(projects.length); // 1

// Owner index
const alices = kg.index.getByOwner('alice');
console.log(alices.length); // 1

// Connector index
const fromDrive = kg.index.getByConnector('drive');
console.log(fromDrive.length); // 1

// Text index
const hits = kg.index.searchText('alpha');
console.log(hits.length); // 2

// Index stats
const stats = kg.getIndexStats();
console.log(stats.map((s) => s.type)); // ['entity_type','tags','organization','owner','connector','dates','text']

// Rebuild from the graph
kg.index.rebuild(kg.graph);
console.log(kg.index.getByType('project').length); // 1
