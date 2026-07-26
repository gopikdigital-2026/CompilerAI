# Examples

14 runnable examples covering every feature of the package. Every example assumes this preamble unless it re-declares it:

```typescript
import { KnowledgeGraphAPI } from '@compilerai/knowledge-graph';
const kg = new KnowledgeGraphAPI();
```

---

## 1. Create entities (all types)

```typescript
const org = 'org-1';

const company    = kg.createEntity('company',    { name: 'Acme', industry: 'manufacturing' }, org);
const user       = kg.createEntity('user',       { name: 'Alice', email: 'alice@acme.com', role: 'engineer' }, org);
const customer   = kg.createEntity('customer',   { name: 'Globex', email: 'ceo@globex.com', revenue: 5_000_000 }, org);
const supplier   = kg.createEntity('supplier',   { name: 'Initech Supplies', category: 'hardware' }, org);
const employee   = kg.createEntity('employee',   { name: 'Bob', department: 'eng', position: 'lead' }, org);
const project    = kg.createEntity('project',    { name: 'Migration', status: 'active', budget: 250_000 }, org, { ownerId: user.id });
const document   = kg.createEntity('document',   { title: 'Migration Spec', content: '...' }, org);
const email      = kg.createEntity('email',      { subject: 'Kickoff', from: 'alice@acme.com', to: ['team@acme.com'] }, org);
const meeting    = kg.createEntity('meeting',    { title: 'Cutover review', date: '2026-03-01', duration: 60 }, org);
const ticket     = kg.createEntity('ticket',     { title: 'Bug 101', status: 'open', priority: 'high' }, org);
const incident   = kg.createEntity('incident',   { title: 'DB outage', severity: 'sev1', status: 'investigating' }, org);
const repository = kg.createEntity('repository', { name: 'compilerai', url: 'https://github.com/acme/compilerai', language: 'TypeScript' }, org);
const file       = kg.createEntity('file',       { name: 'spec.pdf', path: '/docs/spec.pdf', size: 1024 }, org);
const workflow   = kg.createEntity('workflow',   { name: 'Deploy workflow', status: 'active', trigger: 'push' }, org);
const agent      = kg.createEntity('agent',      { name: 'Assistant', role: 'planner', status: 'active' }, org);
const task       = kg.createEntity('task',       { title: 'Plan cutover', status: 'in_progress', priority: 'high' }, org);
const objective  = kg.createEntity('objective',  { title: 'Zero-downtime migration', progress: 0.4, status: 'on_track' }, org);

console.log(kg.countEntities()); // 17
```

---

## 2. Create relationships

```typescript
const project = kg.createEntity('project', { name: 'Migration' }, 'org-1');
const doc     = kg.createEntity('document', { title: 'Spec' }, 'org-1');
const user    = kg.createEntity('user', { name: 'Alice' }, 'org-1');
const agent   = kg.createEntity('agent', { name: 'Assistant' }, 'org-1');
const task    = kg.createEntity('task', { title: 'Plan cutover' }, 'org-1');
const company = kg.createEntity('company', { name: 'Acme' }, 'org-1');

kg.createRelationship('belongs_to', project.id, company.id, 'org-1');
kg.createRelationship('created_by', doc.id, user.id, 'org-1');
kg.createRelationship('assigned_to', task.id, agent.id, 'org-1');
kg.createRelationship('contains', project.id, doc.id, 'org-1');
kg.createRelationship('contains', project.id, task.id, 'org-1');
kg.createRelationship('related_to', project.id, agent.id, 'org-1', { bidirectional: true });
kg.createRelationship('depends_on', task.id, project.id, 'org-1');

console.log(kg.countRelationships()); // 7
```

---

## 3. Search by type

```typescript
kg.createEntity('project', { name: 'Alpha' }, 'org-1');
kg.createEntity('project', { name: 'Beta' }, 'org-1');
kg.createEntity('document', { title: 'Spec' }, 'org-1');

const projects = kg.findByType('project');
console.log(projects.length); // 2

const projectsInOrg = kg.findByType('project', 'org-1');
console.log(projectsInOrg.length); // 2
```

---

## 4. Search by text

```typescript
kg.createEntity('document', { title: 'Technical Specification' }, 'org-1', { tags: ['spec'] });
kg.createEntity('document', { title: 'User Guide' }, 'org-1');
kg.createEntity('project', { name: 'Technical Debt Cleanup' }, 'org-1');

const results = kg.findByText('technical');
console.log(results.length); // 2 (title + name match)
console.log(results[0].matchedFields); // ['properties']
```

---

## 5. Find neighbors

```typescript
const project = kg.createEntity('project', { name: 'Migration' }, 'org-1');
const doc     = kg.createEntity('document', { title: 'Spec' }, 'org-1');
const task    = kg.createEntity('task', { title: 'Plan cutover' }, 'org-1');

kg.createRelationship('contains', project.id, doc.id, 'org-1');
kg.createRelationship('contains', project.id, task.id, 'org-1');

const neighbors = kg.findNeighbors(project.id);
console.log(neighbors.length); // 2
for (const n of neighbors) {
  console.log(n.entity.type, n.direction, n.relationship.type);
}
// document outgoing contains
// task outgoing contains
```

---

## 6. Find a path between entities

```typescript
const company = kg.createEntity('company', { name: 'Acme' }, 'org-1');
const project = kg.createEntity('project', { name: 'Migration' }, 'org-1');
const doc     = kg.createEntity('document', { title: 'Spec' }, 'org-1');
const file    = kg.createEntity('file', { name: 'spec.pdf' }, 'org-1');

kg.createRelationship('belongs_to', project.id, company.id, 'org-1');
kg.createRelationship('contains', project.id, doc.id, 'org-1');
kg.createRelationship('contains', doc.id, file.id, 'org-1');

const path = kg.findPath(company.id, file.id);
console.log(path.found);        // true
console.log(path.path);         // [company.id, project.id, doc.id, file.id]
console.log(path.relationships.length); // 3
```

---

## 7. Reasoning: related documents

```typescript
const project = kg.createEntity('project', { name: 'Migration' }, 'org-1');
const doc     = kg.createEntity('document', { title: 'Migration Spec' }, 'org-1');
const email   = kg.createEntity('email', { subject: 'Migration kickoff' }, 'org-1');

kg.createRelationship('contains', project.id, doc.id, 'org-1');
kg.createRelationship('references', project.id, email.id, 'org-1');

const result = kg.getRelatedDocuments(project.id);
console.log(result.answer);   // Found 2 related documents for entity 'Migration'.
console.log(result.entities.map((e) => e.type)); // ['document', 'email']
console.log(result.confidence); // 0.85
```

---

## 8. Reasoning: missing information

```typescript
const task = kg.createEntity('task', { title: 'Plan cutover', status: 'in_progress' }, 'org-1');
// No assigned_to, no belongs_to, no depends_on

const result = kg.getMissingInformation(task.id);
console.log(result.answer); // 3 information gaps found for task 'Plan cutover'.
for (const gap of result.gaps) {
  console.log('-', gap.description);
}
// - Task 'Plan cutover' has no assigned agent or user
// - Task is not linked to any project
// - Task has no defined dependencies — consider if it truly has none
```

---

## 9. Reasoning: impact analysis

```typescript
const incident = kg.createEntity('incident', { title: 'DB outage' }, 'org-1');
const project  = kg.createEntity('project', { name: 'Migration' }, 'org-1');
const task     = kg.createEntity('task', { title: 'Cutover' }, 'org-1');
const agent    = kg.createEntity('agent', { name: 'Assistant' }, 'org-1');

kg.createRelationship('depends_on', incident.id, project.id, 'org-1');
kg.createRelationship('contains', project.id, task.id, 'org-1');
kg.createRelationship('assigned_to', task.id, agent.id, 'org-1');

const impact = kg.getImpactAnalysis(incident.id);
console.log(impact.answer); // Impact analysis: 'DB outage' affects 3 entities across the graph.
console.log(impact.entities.length); // 3
```

---

## 10. Memory: store and retrieve

```typescript
kg.storeMemory({
  type: 'long_term',
  agentId: 'agent-1',
  key: 'globex-deadline',
  content: '2026-03-15',
  context: { customer: 'globex' },
  importance: 0.9,
  organizationId: 'org-1',
});

const record = kg.retrieveMemory('globex-deadline', 'agent-1');
console.log(record?.content);     // '2026-03-15'
console.log(record?.accessCount); // 1
```

---

## 11. Memory: contextual retrieval

```typescript
kg.storeMemory({
  type: 'long_term',
  agentId: 'agent-1',
  key: 'globex-deadline',
  content: '2026-03-15',
  context: { customer: 'globex', project: 'migration' },
  importance: 0.9,
  organizationId: 'org-1',
});

kg.storeMemory({
  type: 'shared_context',
  agentId: 'agent-1',
  key: 'review-policy',
  content: 'All deployments require peer review.',
  context: { domain: 'deployments' },
  importance: 0.8,
  organizationId: 'org-1',
});

// The customer/project context matches the long-term memory exactly (+2 each)
const relevant = kg.retrieveContextualMemory('agent-1', { customer: 'globex', project: 'migration' });
console.log(relevant[0].key); // 'globex-deadline'

// A deployments query surfaces the shared context
const deployCtx = kg.retrieveContextualMemory('agent-1', { domain: 'deployments' });
console.log(deployCtx[0].key); // 'review-policy'
```

---

## 12. Memory: decision history and summary

```typescript
kg.recordDecision({
  agentId: 'agent-1',
  taskId: 'task-42',
  decision: 'Use blue-green deployment',
  reasoning: 'Minimizes downtime during the cutover window',
  alternatives: ['Rolling restart', 'Maintenance window'],
  confidence: 0.85,
  outcome: 'success',
  relatedEntityIds: ['ent-1', 'ent-2'],
  organizationId: 'org-1',
});

kg.recordDecision({
  agentId: 'agent-1',
  taskId: 'task-43',
  decision: 'Schedule cutover at 02:00 UTC',
  reasoning: 'Lowest traffic window',
  alternatives: ['10:00 UTC'],
  confidence: 0.70,
  outcome: 'pending',
  relatedEntityIds: ['ent-3'],
  organizationId: 'org-1',
});

const history = kg.getDecisionHistory('agent-1');
console.log(history.length); // 2

const summary = kg.summarizeAgent('agent-1');
console.log(summary.summary);
// Agent 'agent-1' has 0 memory records and 2 decisions (1 successful, avg confidence: 0.78).
console.log(summary.entityIds); // ['ent-1','ent-2','ent-3']
```

---

## 13. Batch ingestion

```typescript
import { createEntity, createRelationship } from '@compilerai/knowledge-graph';

const entities = Array.from({ length: 100 }, (_, i) =>
  createEntity('task', { title: `Task ${i}`, status: 'open' }, 'org-1', { id: `task-${i}` }),
);

// Link each task to a shared project
const project = createEntity('project', { name: 'Bulk load' }, 'org-1', { id: 'proj-bulk' });
entities.push(project);

const relationships = entities
  .filter((e) => e.id.startsWith('task-'))
  .map((e) => createRelationship('contains', project.id, e.id, 'org-1', { id: `rel-${e.id}` }));

const result = kg.ingestBatch({ entities, relationships, organizationId: 'org-1' });
console.log(result.entitiesAdded);       // 101
console.log(result.relationshipsAdded);  // 100
console.log(result.errors.length);       // 0
console.log(result.durationMs);          // small number
console.log(kg.countEntities());         // 101

// Re-ingesting the same ids upserts (updates) rather than failing
const upsert = kg.ingestBatch({ entities, relationships: [], organizationId: 'org-1' });
console.log(upsert.entitiesUpdated); // 101
```

---

## 14. Telemetry events

```typescript
const project = kg.createEntity('project', { name: 'Alpha' }, 'org-1');
const doc     = kg.createEntity('document', { title: 'Spec' }, 'org-1');
kg.createRelationship('contains', project.id, doc.id, 'org-1');

kg.findByText('spec');          // emits graph.query.executed
kg.getRelatedDocuments(project.id); // emits graph.reasoning.executed

kg.storeMemory({
  type: 'short_term', agentId: 'agent-1', key: 'k', content: 'v',
  context: {}, importance: 0.5, organizationId: 'org-1',
});
kg.retrieveMemory('k', 'agent-1'); // emits memory.retrieved

const events = kg.getTelemetryEvents();
console.log(events.map((e) => e.type));
// ['entity.created', 'entity.created', 'relationship.created',
//  'graph.query.executed', 'graph.reasoning.executed',
//  'memory.updated', 'memory.retrieved']

const created = kg.getTelemetryEventsByType('entity.created');
console.log(created.length); // 2
```
