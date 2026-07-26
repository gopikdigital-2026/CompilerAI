# Memory

The memory engine gives every agent persistent memory so it can recall facts, decisions, and shared context across sessions. It supports four memory types, contextual retrieval, decision records, and auto-generated summaries.

## The four memory types

| Memory type | Purpose |
|-------------|---------|
| `short_term` | Ephemeral context for an in-progress task — scratchpad values, intermediate results. |
| `long_term` | Durable facts an agent should remember indefinitely — learned preferences, resolved answers. |
| `shared_context` | Context shared across all agents in an organization — not scoped to a single `agentId`. |
| `decision_history` | A log of decisions an agent made, with reasoning, alternatives, and outcomes. |

A `MemoryRecord` is:

```typescript
interface MemoryRecord {
  id: string;
  type: MemoryType;
  agentId: string;
  key: string;
  content: unknown;
  context: Record<string, unknown>;
  importance: number;
  createdAt: string;
  lastAccessedAt: string;
  accessCount: number;
  expiresAt?: string;
  organizationId: string;
}
```

Records are keyed internally by `${agentId}:${key}`, so two agents can use the same `key` without colliding. `shared_context` records are retrievable by any agent because contextual retrieval matches on `type === 'shared_context'` regardless of `agentId`.

## Contextual retrieval

`retrieveContextual(agentId, context, limit?)` returns the most relevant memories for a given context. It scores every memory belonging to the agent (plus all `shared_context` memories) using:

- **Context overlap** — +2 for each context key whose value matches exactly, +0.5 for each context key that is present but differs. This surfaces memories created in similar situations.
- **Importance boost** — `+ importance * 0.5`, so high-importance memories rank higher.
- **Recency boost** — `+ max(0, 1 - ageMs / 7 days)`, so newer memories rank higher within a one-week window.

Results are sorted by score descending, limited to `limit` (default 10), and each returned record has its `lastAccessedAt` refreshed and `accessCount` incremented.

## Decision records

A `DecisionRecord` captures a single decision an agent made:

```typescript
interface DecisionRecord {
  id: string;
  agentId: string;
  taskId: string;
  decision: string;
  reasoning: string;
  alternatives: string[];
  confidence: number;
  outcome: 'success' | 'failure' | 'pending';
  relatedEntityIds: string[];
  createdAt: string;
  organizationId: string;
}
```

Use `recordDecision(...)` to append one and `getDecisionHistory(agentId)` to list all decisions an agent has made. Decision records are the raw material for summaries.

## Auto-summary generation

`summarize(agentId)` produces a `MemorySummary` from an agent's memory records and decision history:

```typescript
interface MemorySummary {
  id: string;
  agentId: string;
  summary: string;
  entityIds: string[];
  createdAt: string;
  organizationId: string;
}
```

The summary string reports the number of memory records, the number of decisions, the number of successful decisions, the average confidence, and the number of related entities. `entityIds` is the union of entity ids found in array-typed memory contents and in decision `relatedEntityIds`. Each summary is stored against the agent so a history of summaries accrues over time.

## Forgetting and clearing

- `forgetMemory(key, agentId)` deletes a single memory record. Returns `true` if it existed.
- `MemoryEngine.clear(organizationId)` removes all memory records, decision records, and summaries belonging to an organization — used for tenant data cleanup.

## Code example

```typescript
import { KnowledgeGraphAPI } from '@compilerai/knowledge-graph';

const kg = new KnowledgeGraphAPI();

// Store a long-term fact
kg.storeMemory({
  type: 'long_term',
  agentId: 'agent-1',
  key: 'globex-migration-deadline',
  content: '2026-03-15',
  context: { customer: 'globex', project: 'migration' },
  importance: 0.9,
  organizationId: 'org-1',
});

// Retrieve it directly
const fact = kg.retrieveMemory('globex-migration-deadline', 'agent-1');
console.log(fact?.content); // '2026-03-15'

// Store a shared context entry
kg.storeMemory({
  type: 'shared_context',
  agentId: 'agent-1',
  key: 'org-policy',
  content: 'All deployments require peer review.',
  context: { domain: 'deployments' },
  importance: 0.8,
  organizationId: 'org-1',
});

// Contextual retrieval — the customer/project context matches the long-term fact
const relevant = kg.retrieveContextualMemory('agent-1', { customer: 'globex', project: 'migration' });
console.log(relevant.length); // >= 1

// Record a decision
kg.recordDecision({
  agentId: 'agent-1',
  taskId: 'task-42',
  decision: 'Use blue-green deployment',
  reasoning: 'Minimizes downtime for the cutover window',
  alternatives: ['Rolling restart', 'Maintenance window'],
  confidence: 0.85,
  outcome: 'success',
  relatedEntityIds: ['ent-1'],
  organizationId: 'org-1',
});

// Get the decision history
const history = kg.getDecisionHistory('agent-1');
console.log(history.length); // 1

// Generate a summary
const summary = kg.summarizeAgent('agent-1');
console.log(summary.summary); // Agent 'agent-1' has N memory records and 1 decisions ...
