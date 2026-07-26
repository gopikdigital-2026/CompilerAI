# API reference

`KnowledgeGraphAPI` is the single facade every caller uses. It wires together the ontology, graph, index manager, search engine, memory engine, reasoning engine, ingestion engine, and telemetry engine, then exposes every operation through one class.

## Construction

```typescript
import { KnowledgeGraphAPI } from '@compilerai/knowledge-graph';

const kg = new KnowledgeGraphAPI();
```

The constructor takes no arguments. It instantiates every engine and connects them. The public properties `ontology`, `graph`, `index`, `searchEngine`, `memory`, `reasoning`, `ingestion`, and `telemetry` expose the engine instances (typed as their interfaces) for advanced use.

## Entity operations

| Method | Description |
|--------|-------------|
| `createEntity(type, properties, organizationId, options?)` | Creates, validates, stores, and indexes an entity. `options` may include `tags`, `ownerId`, `connector`, `metadata`. |
| `updateEntity(id, updates)` | Merges updates into the entity, re-indexes it. Returns `undefined` if not found. |
| `getEntity(id)` | Direct lookup. |
| `deleteEntity(id)` | Removes the entity, its index entries, and all relationships that referenced it. |

## Relationship operations

| Method | Description |
|--------|-------------|
| `createRelationship(type, sourceId, targetId, organizationId, options?)` | Creates, validates, stores, and indexes a relationship. `options` may include `properties` and `bidirectional`. |
| `getRelationship(id)` | Direct lookup. |
| `deleteRelationship(id)` | Removes the relationship and cleans up adjacency lists. |
| `getRelationships(entityId)` | All relationships where the entity is source or target. |

## Search

| Method | Description |
|--------|-------------|
| `search(query: SearchQuery)` | Hybrid search: structured filters plus optional text boosting. |
| `findById(id)` | Direct entity lookup. |
| `findByType(type, organizationId?)` | All entities of a type, optionally scoped to an organization. |
| `findByText(text, organizationId?, limit?)` | Tokenized text search returning ranked `SearchResult[]`. |
| `findNeighbors(entityId)` | Directly connected entities with relationship and direction. |
| `findPath(startId, endId)` | BFS shortest path as a `PathResult`. |

## Reasoning

| Method | Description |
|--------|-------------|
| `reason(query: ReasoningQuery)` | Dispatches to any of the eight query types by `query.type`. |
| `getRelatedDocuments(entityId)` | Documents/files/emails within 3 hops. |
| `getAgentsOnCustomer(customerId)` | Agents/users/employees on a customer. |
| `getWorkflowsAffectingIncident(incidentId)` | Workflows within 4 hops of an incident. |
| `getMissingInformation(taskId)` | Missing assignments, links, dependencies, and properties. |
| `getImpactAnalysis(entityId)` | Full reachable subgraph within 5 hops. |

The remaining two query types (`entity_dependencies`, `entity_timeline`, `knowledge_gaps`) are reached via `reason({ type, entityId, organizationId })`.

## Memory

| Method | Description |
|--------|-------------|
| `storeMemory(record)` | Stores a memory record; emits `memory.updated`. |
| `retrieveMemory(key, agentId)` | Direct lookup; emits `memory.retrieved` on hit. |
| `retrieveContextualMemory(agentId, context, limit?)` | Context-overlap-scored retrieval. |
| `recordDecision(decision)` | Appends a decision record. |
| `getDecisionHistory(agentId)` | Lists an agent's decisions. |
| `summarizeAgent(agentId)` | Generates and stores a `MemorySummary`. |
| `forgetMemory(key, agentId)` | Deletes one memory record. |

## Ingestion

| Method | Description |
|--------|-------------|
| `ingestBatch(batch: IngestionBatch)` | Upserts a batch of entities and relationships; returns counts, errors, and duration. |
| `ingestEntity(entity)` | Upserts a single entity. |
| `ingestRelationship(rel)` | Upserts a single relationship. |

## Telemetry and stats

| Method | Description |
|--------|-------------|
| `countEntities()` | Total entities in the graph. |
| `countRelationships()` | Total relationships in the graph. |
| `getIndexStats()` | Size and last-updated timestamp for each of the seven indexes. |
| `getTelemetryEvents()` | All captured telemetry events. |
| `getTelemetryEventsByType(type)` | Events filtered by one of the eight event types. |

## Code example

```typescript
import { KnowledgeGraphAPI } from '@compilerai/knowledge-graph';

const kg = new KnowledgeGraphAPI();

const project = kg.createEntity('project', { name: 'Alpha' }, 'org-1', { tags: ['priority'] });
const doc = kg.createEntity('document', { title: 'Spec' }, 'org-1');
kg.createRelationship('contains', project.id, doc.id, 'org-1');

console.log(kg.countEntities());       // 2
console.log(kg.findByType('document').length); // 1
console.log(kg.findByText('spec')[0].score);   // > 0
console.log(kg.getRelatedDocuments(project.id).answer);
console.log(kg.getTelemetryEvents().length);   // mutations emitted events
```
