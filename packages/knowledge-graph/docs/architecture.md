# Architecture

The Enterprise Knowledge Graph is organized as nine modules behind a single API facade. Each module owns one responsibility and communicates with the others through interfaces (ports), so any implementation can be replaced without touching callers.

## Architecture diagram

```
 ┌──────────────┐     ┌──────────────┐     ┌──────────────────────────────────────────────┐
 │ Data Sources │ ──▶ │  Ingestion   │ ──▶ │           Knowledge Graph                    │
 │ (connectors, │     │   Engine     │     │   ┌────────────┐    ┌───────────────┐        │
 │  agents,     │     │  (upsert,    │     │   │  Entities  │──◀▶│ Relationships │        │
 │  imports)    │     │   batch)     │     │   │  (typed,   │    │ (typed,       │        │
 └──────────────┘     └──────────────┘     │   │  validated)│    │  validated)   │        │
                                           │   └─────┬──────┘    └───────┬───────┘        │
                                           │         │                   │                │
                                           │         └────────┬──────────┘                │
                                           │                  ▼                            │
                                           │          ┌───────────────┐                   │
                                           │          │   Indexing    │                   │
                                           │          │  (7 indexes)  │                   │
                                           │          └───────┬───────┘                   │
                                           └──────────────────┼───────────────────────────┘
                                                              ▼
                                                     ┌───────────────┐
                                                     │    Search     │
                                                     │   Engine      │
                                                     │ (hybrid:      │
                                                     │  ID, type,    │
                                                     │  props, text, │
                                                     │  traversal)   │
                                                     └───────┬───────┘
                                                              ▼
                                                     ┌───────────────┐
                                                     │   Reasoning   │
                                                     │   Engine      │
                                                     │ (8 queries,   │
                                                     │  no LLM)      │
                                                     └───────┬───────┘
                                                              ▼
 ┌──────────────┐     ┌──────────────┐          ┌─────────────────────┐
 │   Memory     │◀──▶ │  Telemetry   │◀────────│      Results         │
 │   Engine     │     │   Engine     │          │ (entities, paths,   │
 │ (4 types)    │     │ (8 events)   │          │  reasoning, memory) │
 └──────────────┘     └──────────────┘          └─────────────────────┘
        ▲
        │
 ┌──────────────┐
 │ KnowledgeGraphAPI  │  ◀── single facade every caller uses
 │  (facade)    │
 └──────────────┘
```

## Module descriptions

### 1. `api` — `KnowledgeGraphAPI`

The facade. It wires together the ontology, graph, index manager, search engine, memory engine, reasoning engine, ingestion engine, and telemetry engine, then exposes every operation through a single class. Callers depend only on `KnowledgeGraphAPI`; they never import an engine directly.

### 2. `graph` — `KnowledgeGraph`

The in-memory store. Entities live in a `Map<string, Entity>`; relationships live in a `Map<string, Relationship>`. Two adjacency maps (`outgoingRels`, `incomingRels`) give O(1) neighbor lookup. Pathfinding is breadth-first search. Every mutation is validated against the ontology and emits telemetry.

### 3. `ontology` — `Ontology`

The type system. It holds the definitions for all 17 entity types and 13 relationship types, including required properties, optional properties, allowed relationships, valid source/target types, and bidirectionality. Both entities and relationships are validated before they enter the graph.

### 4. `indexing` — `IndexManager`

Seven in-memory indexes that accelerate search: `entity_type`, `tags`, `dates`, `connector`, `owner`, `organization`, and `text`. The text index tokenizes property values and supports prefix matching. Indexes can be rebuilt from the graph at any time via `rebuild()`.

### 5. `search` — `SearchEngine`

Hybrid search. Structured filters (type, tags, properties, organization) are answered by the graph; text queries are answered by the index manager and boosted by the graph's own text matching. Exposes `findById`, `findByType`, `findByProperties`, `findByText`, `findNeighbors`, and `findPath`.

### 6. `memory` — `MemoryEngine`

Persistent memory across four types: `short_term`, `long_term`, `shared_context`, and `decision_history`. Supports direct retrieval, contextual retrieval with context-overlap scoring, decision records with reasoning and alternatives, and auto-generated agent summaries.

### 7. `reasoning` — `ReasoningEngine`

Eight query types answered purely by graph traversal — no LLM. Covers related documents, agents on a customer, workflows affecting an incident, missing information, entity dependencies, entity timelines, impact analysis, and knowledge-gap detection.

### 8. `ingestion` — `IngestionEngine`

Batch and single-item ingestion with upsert semantics. If an entity or relationship already exists it is updated; otherwise it is added. Per-item errors are captured without aborting the batch, and a duration is reported.

### 9. `telemetry` — `TelemetryEngine`

Captures every mutating and query event. Events are appended to a list, queryable by type, and clearable. The graph, reasoning engine, and API all emit through the same sink.

## Port-and-adapter pattern

Every engine is behind an interface defined in `models.ts`. The API facade depends on the interfaces, not the concrete classes, so implementations can be swapped (for example, a database-backed graph) without changing callers.

| Interface | Methods |
|-----------|---------|
| `IKnowledgeGraph` | `addEntity`, `updateEntity`, `getEntity`, `deleteEntity`, `addRelationship`, `getRelationship`, `deleteRelationship`, `getRelationships`, `getNeighbors`, `findPath`, `query`, `countEntities`, `countRelationships` |
| `ISearchEngine` | `search`, `findById`, `findByType`, `findByProperties`, `findByText`, `findNeighbors`, `findPath` |
| `IReasoningEngine` | `query`, `getRelatedDocuments`, `getAgentsOnCustomer`, `getWorkflowsAffectingIncident`, `getMissingInformation`, `getImpactAnalysis` |
| `IMemoryEngine` | `store`, `retrieve`, `retrieveContextual`, `recordDecision`, `getDecisionHistory`, `summarize`, `forget`, `clear` |
| `IIndexManager` | `indexEntity`, `indexRelationship`, `removeEntity`, `removeRelationship`, `getByType`, `getByTag`, `getByOrganization`, `getByOwner`, `getByConnector`, `getByDateRange`, `searchText`, `getStats`, `rebuild` |
| `IIngestionEngine` | `ingestBatch`, `ingestEntity`, `ingestRelationship` |
| `ITelemetryEngine` | `emit`, `getEvents`, `getEventsByType`, `clear` |

## Data flow

1. **Write path** — A caller invokes `KnowledgeGraphAPI.createEntity` / `createRelationship`. The API builds the object, calls `graph.addEntity` / `addRelationship` (which validates against the ontology and emits telemetry), then calls `index.indexEntity` / `indexRelationship`.
2. **Update path** — `updateEntity` updates the graph, removes the old entity from the index, and re-indexes the updated entity.
3. **Delete path** — `deleteEntity` removes the entity from the index, deletes it from the graph, and cleans up all relationships that referenced it.
4. **Search path** — `search` runs structured filters on the graph, then boosts text-matching results using the index. `findByText` queries the index first, then hydrates entities from the graph.
5. **Reasoning path** — `reason` dispatches to the reasoning engine, which traverses the graph via `getNeighbors` / `getRelationships`, optionally consults the ontology for gap detection, and returns an `answer` string plus the entities, relationships, and gaps it found.
6. **Ingestion path** — `ingestBatch` iterates entities then relationships, upserting each into the graph and index, collecting per-item errors, and returning a summary with counts and duration.

## Design decisions

- **In-memory first.** The graph, index, and memory engines are all in-process. This keeps the package dependency-free and fast; a database-backed adapter can be added later behind `IKnowledgeGraph`.
- **Ontology-gated writes.** No entity or relationship enters the graph without passing ontology validation. This keeps the graph internally consistent so reasoning can trust the types it traverses.
- **No LLM for reasoning.** The eight reasoning query types are answered by graph traversal alone. This makes reasoning deterministic, fast, and free of token costs; an LLM can layer on top later for synthesis.
- **Telemetry by default.** Every mutation and query emits an event. Callers can read events for observability without instrumenting their own code.
- **Facade over direct imports.** Callers depend on `KnowledgeGraphAPI` and the interface types, never on concrete engine classes, so the backing implementations can evolve independently.
