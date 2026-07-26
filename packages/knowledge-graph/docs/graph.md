# Graph

The `KnowledgeGraph` module is the in-memory store for entities and relationships. It is the core of the package: the search, reasoning, and ingestion engines all read from and write to it through the `IKnowledgeGraph` interface.

## Entity structure

Every entity in the graph has this shape (defined in `models.ts`):

```typescript
interface Entity {
  id: string;                       // unique, e.g. 'ent-1'
  type: EntityType;                 // one of 17 types
  properties: Record<string, unknown>; // typed per the ontology
  tags: string[];                   // free-form labels for filtering
  metadata: EntityMetadata;         // source, connector, ownerId, confidence, ...
  createdAt: string;                // ISO timestamp
  updatedAt: string;                // ISO timestamp
  organizationId: string;           // tenant scope
}

interface EntityMetadata {
  source?: string;
  connector?: string;
  ownerId?: string;
  confidence?: number;
  [key: string]: unknown;
}
```

Entities are keyed by `id` in a `Map<string, Entity>`. Two adjacency maps — `outgoingRels` and `incomingRels` — map each entity id to the list of relationship ids touching it, giving O(1) neighbor lookup.

## Relationship structure

```typescript
interface Relationship {
  id: string;                        // unique, e.g. 'rel-1'
  type: RelationshipType;            // one of 13 types
  sourceId: string;                  // entity id
  targetId: string;                  // entity id
  properties: Record<string, unknown>;
  bidirectional: boolean;            // from the ontology
  createdAt: string;                 // ISO timestamp
  organizationId: string;            // tenant scope
}
```

Relationships are keyed by `id` in a `Map<string, Relationship>`. When `bidirectional` is `true`, the relationship is registered in both endpoints' adjacency lists, so `getNeighbors` returns the related entity from either end without a second lookup.

## Graph operations

All operations are methods on `KnowledgeGraph` (exposed via `IKnowledgeGraph` and re-exposed on `KnowledgeGraphAPI`).

### `addEntity(entity): Entity`

Validates the entity against the ontology (required properties present), stores it, initializes empty adjacency lists, and emits an `entity.created` event. Throws if validation fails.

### `updateEntity(id, updates): Entity | undefined`

Merges `updates` into the existing entity, preserving `id` and `createdAt` and refreshing `updatedAt`. Returns `undefined` if the entity does not exist. Emits `entity.updated`.

### `deleteEntity(id): boolean`

Deletes the entity and removes every relationship that referenced it from the adjacency lists of other entities. Returns `true` if the entity existed.

### `addRelationship(rel): Relationship`

Checks that both endpoints exist, validates the relationship against the ontology (source/target types allowed for this relationship type), stores it, updates the adjacency lists, and — if `bidirectional` — registers it on both ends. Emits `relationship.created`. Throws if validation fails or an endpoint is missing.

### `getRelationship(id): Relationship | undefined`

Direct lookup by id.

### `deleteRelationship(id): boolean`

Removes the relationship from the store and from both endpoints' adjacency lists. Emits `relationship.deleted`.

### `getRelationships(entityId): Relationship[]`

Returns every relationship where the entity is the source or the target (deduplicated).

### `getNeighbors(entityId): NeighborResult[]`

Returns the entities directly connected to the given entity, each annotated with the connecting relationship and a `direction` of `'outgoing'` or `'incoming'`. Deduplicates by entity id so a bidirectional relationship yields one neighbor.

### `findPath(startId, endId): PathResult`

Breadth-first search from `startId` to `endId`. Returns `{ startId, endId, path, relationships, found }` where `path` is the ordered list of entity ids and `relationships` is the ordered list of relationships along the path. Returns `found: false` with empty arrays if no path exists or either endpoint is missing. If `startId === endId`, returns a single-node path.

### `query(searchQuery): SearchResult[]`

Structured filter over all entities: by `organizationId`, `type`, `tags`, `properties`, and `text`. Applies `limit` (default 50) and `offset` (default 0). Emits `graph.query.executed`.

### `countEntities()` / `countRelationships()`

Return the current store sizes.

## Code example

```typescript
import { KnowledgeGraphAPI } from '@compilerai/knowledge-graph';

const kg = new KnowledgeGraphAPI();

// Create entities (validated against the ontology)
const company = kg.createEntity('company', { name: 'Acme' }, 'org-1', { tags: ['enterprise'] });
const project = kg.createEntity('project', { name: 'Project Alpha' }, 'org-1');
const doc = kg.createEntity('document', { title: 'Technical Spec' }, 'org-1');
const file = kg.createEntity('file', { name: 'spec.pdf' }, 'org-1');

// Create relationships (validated against the ontology)
kg.createRelationship('belongs_to', project.id, company.id, 'org-1');
kg.createRelationship('contains', project.id, doc.id, 'org-1');
kg.createRelationship('contains', project.id, file.id, 'org-1');

// Neighbors — everything directly connected to the project
const neighbors = kg.findNeighbors(project.id);
console.log(neighbors.length); // 3

// Path — BFS from the company to the file through the project
const path = kg.findPath(company.id, file.id);
console.log(path.found);        // true
console.log(path.path);         // [company.id, project.id, file.id]
console.log(path.relationships.length); // 2

// Counts
console.log(kg.countEntities());       // 4
console.log(kg.countRelationships());  // 3
```
