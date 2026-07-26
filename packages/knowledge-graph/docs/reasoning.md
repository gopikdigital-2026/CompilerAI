# Reasoning

The reasoning engine answers structural questions about the graph using graph traversal alone — **no LLM is involved**. This makes reasoning deterministic, fast, and free of token costs. Every query returns a `ReasoningResult` with a human-readable `answer`, the `entities` and `relationships` it traversed, a `confidence` score, and any `KnowledgeGap` objects it detected.

## The eight query types

| Query type | Method | What it answers |
|-----------|--------|-----------------|
| `related_documents` | `getRelatedDocuments(entityId)` | Which documents, files, and emails are related to this entity? |
| `agents_on_customer` | `getAgentsOnCustomer(customerId)` | Which agents, users, or employees have worked on this customer? |
| `workflows_affecting_incident` | `getWorkflowsAffectingIncident(incidentId)` | Which workflows affect this incident? |
| `missing_information` | `getMissingInformation(taskId)` | What required links, assignments, or properties is this task missing? |
| `entity_dependencies` | `getEntityDependencies(entityId)` | What does this entity depend on (via `depends_on`)? |
| `entity_timeline` | `getEntityTimeline(entityId)` | What is the chronological history around this entity? |
| `impact_analysis` | `getImpactAnalysis(entityId)` | What is the full blast radius of this entity? |
| `knowledge_gaps` | `getKnowledgeGaps(entityId)` | Which expected relationships are absent for this entity? |

All eight are also reachable through the generic `reason(query)` method by passing `{ type, entityId, organizationId, parameters? }`.

## How each query works

### `related_documents`

Traverses up to **3 hops** from the entity, collecting every neighbor whose type is `document`, `file`, or `email`. Deduplicates by entity id. If nothing is found, it reports a knowledge gap: "No documents found related to …". Confidence is 0.85 when results exist, 0.3 otherwise.

### `agents_on_customer`

Inspects the customer's direct neighbors for entities of type `agent`, `user`, or `employee`. For any neighbor that is a `task` or `project`, it also inspects the second hop to find agents assigned to those. Deduplicates. Confidence is 0.88 with results, 0.2 without.

### `workflows_affecting_incident`

Traverses up to **4 hops** from the incident, collecting every `workflow` entity encountered. Deduplicates. Confidence is 0.82 with results, 0.25 without.

### `missing_information`

Inspects the task's direct neighbors and checks four conditions, producing a `KnowledgeGap` for each failure:

1. **No assignee** — no `assigned_to` relationship is present (missing entity type `agent`).
2. **No project link** — no neighbor is a `project` and no `belongs_to` relationship is present (missing entity type `project`).
3. **No dependencies** — no `depends_on` relationship and the task is not completed.
4. **Missing required properties** — every property in the ontology's `requiredProperties` for the task type must be present.

Confidence is 0.90 when no gaps are found, 0.75 otherwise.

### `entity_dependencies`

Collects every `depends_on` relationship on the entity (in either direction) and returns the entities on the other end. Confidence is 0.92.

### `entity_timeline`

Gathers the entity and every directly connected entity, then sorts the result by `createdAt` ascending. The `answer` reports the span from the earliest to the latest creation timestamp. Confidence is 0.85.

### `impact_analysis`

Traverses up to **5 hops** from the entity, collecting the full reachable subgraph (every neighbor at every depth up to 5). Deduplicates. Confidence is 0.80 with results, 0.5 otherwise.

### `knowledge_gaps`

Compares the entity's actual relationship types to the `allowedRelationships` declared in the ontology for its entity type. Every allowed relationship type that is **not** present produces a gap: "Entity has no 'X' relationship, which is expected for type 'Y'". Confidence is 0.78.

## Knowledge gap detection

A `KnowledgeGap` is:

```typescript
interface KnowledgeGap {
  description: string;
  missingEntityType?: EntityType;
  relatedEntityId?: string;
}
```

Gaps are returned in the `gaps` field of every `ReasoningResult`. Three query types produce gaps: `related_documents` (when no documents are found), `missing_information` (for each missing assignment/link/property), and `knowledge_gaps` (for each allowed relationship that is absent). The other five return an empty `gaps` array.

## Code example

```typescript
import { KnowledgeGraphAPI } from '@compilerai/knowledge-graph';

const kg = new KnowledgeGraphAPI();

const customer = kg.createEntity('customer', { name: 'Globex' }, 'org-1');
const project = kg.createEntity('project', { name: 'Migration' }, 'org-1');
const agent = kg.createEntity('agent', { name: 'Assistant' }, 'org-1');
const task = kg.createEntity('task', { title: 'Plan cutover' }, 'org-1');
const doc = kg.createEntity('document', { title: 'Migration Spec' }, 'org-1');

kg.createRelationship('related_to', customer.id, project.id, 'org-1', { bidirectional: true });
kg.createRelationship('assigned_to', task.id, agent.id, 'org-1');
kg.createRelationship('contains', project.id, task.id, 'org-1');
kg.createRelationship('references', project.id, doc.id, 'org-1');

// Related documents for the project
const docs = kg.getRelatedDocuments(project.id);
console.log(docs.answer);    // Found 1 related documents for entity 'Migration'.
console.log(docs.entities);  // [doc]

// Agents on the customer
const agents = kg.getAgentsOnCustomer(customer.id);
console.log(agents.answer);  // 1 agents/users have worked on customer 'Globex'.

// Missing information for the task (no depends_on, no belongs_to)
const missing = kg.getMissingInformation(task.id);
console.log(missing.gaps);   // gaps for missing project link and missing dependencies

// Impact analysis for the project
const impact = kg.getImpactAnalysis(project.id);
console.log(impact.answer);  // Impact analysis: 'Migration' affects N entities across the graph.

// Knowledge gaps for the agent
const gaps = kg.getKnowledgeGaps(agent.id);
console.log(gaps.gaps);      // allowed relationships the agent lacks
