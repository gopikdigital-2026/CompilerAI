# @compilerai/knowledge-graph v1.0.0

> CompilerAI Enterprise Knowledge Graph — the permanent memory that lets all agents share knowledge, relate information, and reason over enterprise context.

Every CompilerAI agent reads from and writes to this graph. It is a typed, validated, in-process knowledge graph with a reasoning engine that answers structural questions without an LLM, a persistent memory engine for per-agent and shared context, and a hybrid search layer backed by seven index types.

## Key features

- **17 entity types** — company, user, customer, supplier, employee, project, document, email, meeting, ticket, incident, repository, file, workflow, agent, task, objective.
- **13 typed relationships** — belongs_to, created_by, assigned_to, depends_on, related_to, responds_to, contains, references, participates_in, uses, generates, executes, derives_from. Two are bidirectional (`related_to`, `participates_in`); the rest are directional. Every relationship is validated against the ontology before it is written.
- **Persistent memory engine** — four memory types: `short_term`, `long_term`, `shared_context`, and `decision_history`. Supports direct retrieval, contextual retrieval with overlap scoring, decision records with reasoning and alternatives, and auto-generated agent summaries.
- **Hybrid search** — query by ID, by entity type, by properties, by free text, by graph traversal (neighbors), and by shortest path (BFS). Text search is tokenized and prefix-matched over the index.
- **Reasoning engine** — eight query types answered with graph traversal alone, no LLM required: `related_documents`, `agents_on_customer`, `workflows_affecting_incident`, `missing_information`, `entity_dependencies`, `entity_timeline`, `impact_analysis`, `knowledge_gaps`.
- **Indexing** — seven index types: `entity_type`, `tags`, `dates`, `connector`, `owner`, `organization`, and `text`. Indexes can be rebuilt from the graph at any time.
- **Ingestion engine** — batch and single-item ingestion with upsert semantics, per-item error capture, and a duration report.
- **Telemetry** — eight event types emitted on every mutating and query operation, queryable by type, clearable on demand.
- **Port-and-adapter integration** — every engine is behind an interface (`IKnowledgeGraph`, `ISearchEngine`, `IReasoningEngine`, `IMemoryEngine`, `IIndexManager`, `IIngestionEngine`, `ITelemetryEngine`) so implementations can be swapped without touching callers.

## Quick start

```typescript
import { KnowledgeGraphAPI } from '@compilerai/knowledge-graph';

const kg = new KnowledgeGraphAPI();

// Create entities
const project = kg.createEntity('project', { name: 'Project Alpha' }, 'org-1');
const doc = kg.createEntity('document', { title: 'Technical Spec' }, 'org-1');

// Create relationships
kg.createRelationship('contains', project.id, doc.id, 'org-1');

// Search
const results = kg.findByText('technical');
console.log(results);

// Reason over the graph
const docs = kg.getRelatedDocuments(project.id);
console.log(docs.answer);
```

## Modules

| Module | File | Responsibility |
|--------|------|----------------|
| `api` | `src/api/KnowledgeGraphAPI.ts` | Facade exposing every engine through a single class |
| `graph` | `src/graph/KnowledgeGraph.ts` | Entity/relationship store, adjacency lists, BFS pathfinding |
| `ontology` | `src/ontology/Ontology.ts` | Entity and relationship type definitions, validation rules |
| `indexing` | `src/indexing/IndexManager.ts` | Seven index types and text tokenization |
| `search` | `src/search/SearchEngine.ts` | Hybrid search combining structured filters with index-backed text |
| `memory` | `src/memory/MemoryEngine.ts` | Short-term, long-term, shared context, and decision history |
| `reasoning` | `src/reasoning/ReasoningEngine.ts` | Eight graph-traversal query types, gap detection |
| `ingestion` | `src/ingestion/IngestionEngine.ts` | Batch and single-item upsert ingestion |
| `telemetry` | `src/telemetry/TelemetryEngine.ts` | Event capture, type filtering, clearing |

## Stats

| Metric | Value |
|--------|-------|
| Source files | 10 |
| Test files | 9 |
| Tests | 116 |
| Line coverage | 96.89% |
| Entity types | 17 |
| Relationship types | 13 |

## Documentation

- [Validation report](./VALIDATION_REPORT.md) — environment, results, acceptance criteria.
- [Architecture](./docs/architecture.md) — diagram, module descriptions, data flow, design decisions.
- [Ontology](./docs/ontology.md) — entity and relationship type tables, validation rules.
- [Graph](./docs/graph.md) — entity and relationship structures, graph operations.
- [Reasoning](./docs/reasoning.md) — the eight query types and how they traverse the graph.
- [Memory](./docs/memory.md) — the four memory types, contextual retrieval, decision records.
- [Indexing](./docs/indexing.md) — the seven index types, tokenization, rebuild.
- [API reference](./docs/api.md) — `KnowledgeGraphAPI` method overview.
- [Examples](./docs/examples.md) — 14 runnable examples covering every feature.

## License

Proprietary — © CompilerAI.
