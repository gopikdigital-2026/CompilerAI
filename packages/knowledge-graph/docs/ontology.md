# Ontology

The ontology defines the 17 entity types and 13 relationship types that the graph understands. Every entity and relationship is validated against the ontology before it is written, which keeps the graph internally consistent so the reasoning engine can trust the types it traverses.

## Entity types (17)

Each entity type declares a label, a description, required and optional properties, and the relationship types it is allowed to participate in.

| Type | Label | Required properties | Optional properties |
|------|-------|---------------------|---------------------|
| `company` | Company | `name` | `industry`, `size`, `website` |
| `user` | User | `name` | `email`, `role`, `department` |
| `customer` | Customer | `name` | `email`, `phone`, `industry`, `revenue` |
| `supplier` | Supplier | `name` | `email`, `phone`, `category` |
| `employee` | Employee | `name` | `email`, `department`, `position`, `salary` |
| `project` | Project | `name` | `status`, `budget`, `deadline`, `description` |
| `document` | Document | `title` | `content`, `format`, `size`, `author` |
| `email` | Email | `subject` | `from`, `to`, `body`, `date` |
| `meeting` | Meeting | `title` | `date`, `duration`, `attendees`, `notes` |
| `ticket` | Ticket | `title` | `status`, `priority`, `assignee`, `description` |
| `incident` | Incident | `title` | `severity`, `status`, `affectedSystems`, `rootCause` |
| `repository` | Repository | `name` | `url`, `language`, `visibility` |
| `file` | File | `name` | `path`, `size`, `mimeType` |
| `workflow` | Workflow | `name` | `status`, `trigger`, `description` |
| `agent` | Agent | `name` | `role`, `capabilities`, `status` |
| `task` | Task | `title` | `status`, `priority`, `assignee`, `deadline` |
| `objective` | Objective | `title` | `status`, `progress`, `deadline`, `description` |

> Note the required-property split: most types require `name`, but `document`, `email`, `meeting`, `ticket`, `incident`, `task`, and `objective` require `title`, and `email` requires `subject`. The validator enforces these exactly.

## Relationship types (13)

Each relationship type declares valid source entity types, valid target entity types, and whether it is bidirectional.

| Type | Label | Bidirectional | Valid source types | Valid target types |
|------|-------|:-------------:|--------------------|--------------------|
| `belongs_to` | Belongs To | No | Any | `company`, `project`, `user`, `customer` |
| `created_by` | Created By | No | Any | `user`, `agent`, `employee` |
| `assigned_to` | Assigned To | No | `ticket`, `incident`, `task`, `project`, `objective` | `user`, `agent`, `employee`, `customer` |
| `depends_on` | Depends On | No | `project`, `task`, `workflow`, `objective`, `incident` | Any |
| `related_to` | Related To | **Yes** | Any | Any |
| `responds_to` | Responds To | No | `email`, `ticket`, `incident`, `task` | `email`, `ticket`, `incident`, `task` |
| `contains` | Contains | No | `project`, `repository`, `document`, `company`, `objective` | `file`, `document`, `task`, `repository`, `email`, `meeting` |
| `references` | References | No | Any | Any |
| `participates_in` | Participates In | **Yes** | `user`, `employee`, `agent`, `customer` | `project`, `meeting` |
| `uses` | Uses | No | `agent`, `workflow`, `employee`, `user`, `project` | `repository`, `file`, `document`, `agent` |
| `generates` | Generates | No | `agent`, `workflow` | `document`, `file`, `email`, `task` |
| `executes` | Executes | No | `agent`, `workflow` | `task`, `workflow` |
| `derives_from` | Derives From | No | `document`, `file`, `ticket`, `incident` | `document`, `file`, `ticket`, `incident`, `email` |

Two relationships are bidirectional: `related_to` and `participates_in`. When a bidirectional relationship is added, the graph registers it in both entities' adjacency lists so `getNeighbors` returns the related entity from either end.

## Ontology validation rules

### Entity validation

`Ontology.validateEntity(type, properties)` returns `{ valid: boolean; missing: string[] }`:

1. The `type` must be one of the 17 known entity types.
2. Every property listed in the type's `requiredProperties` must be present and not `null`/`undefined`.
3. If any required property is missing, `valid` is `false` and `missing` lists the absent property names.

The graph calls this in `addEntity` and throws `Entity validation failed: missing required properties: …` if it fails.

### Relationship validation

`Ontology.validateRelationship(type, sourceType, targetType)` returns `{ valid: boolean; reason?: string }`:

1. The `type` must be one of the 13 known relationship types.
2. The source entity's type must appear in the relationship's `sourceTypes`.
3. The target entity's type must appear in the relationship's `targetTypes`.
4. If either check fails, `valid` is `false` and `reason` explains the mismatch.

The graph calls this in `addRelationship` and throws `Relationship validation failed: …` if it fails. The source and target entities must already exist in the graph.

### Bidirectionality

`Ontology.isBidirectional(type)` returns whether a relationship type is bidirectional. The graph uses this flag to decide whether to register the relationship in both adjacency lists.

## Code example

```typescript
import { KnowledgeGraphAPI } from '@compilerai/knowledge-graph';

const kg = new KnowledgeGraphAPI();

// Inspect the ontology
const entityDef = kg.ontology.getEntityDef('document');
console.log(entityDef?.requiredProperties); // ['title']

const relDef = kg.ontology.getRelationshipDef('contains');
console.log(relDef?.sourceTypes); // ['project', 'repository', 'document', 'company', 'objective']
console.log(relDef?.targetTypes); // ['file', 'document', 'task', 'repository', 'email', 'meeting']

// Validation succeeds
const project = kg.createEntity('project', { name: 'Project Alpha' }, 'org-1');
const doc = kg.createEntity('document', { title: 'Technical Spec' }, 'org-1');
kg.createRelationship('contains', project.id, doc.id, 'org-1'); // OK

// Validation fails — missing required property
try {
  kg.createEntity('document', { author: 'Alice' }, 'org-1'); // no 'title'
} catch (err) {
  console.log((err as Error).message); // Entity validation failed: missing required properties: title
}

// Validation fails — wrong source type for relationship
try {
  kg.createRelationship('executes', doc.id, project.id, 'org-1'); // document cannot execute
} catch (err) {
  console.log((err as Error).message); // Relationship validation failed: ...
}
```
