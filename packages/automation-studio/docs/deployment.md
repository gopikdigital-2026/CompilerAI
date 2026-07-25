# Deployment

> **Sprint 28** — This guide covers the `DeploymentManager`: the publish workflow, activate/deactivate, archive, duplicate, JSON export/import, and deployment status tracking.

## Overview

The `DeploymentManager` manages the lifecycle of a workflow from draft to active deployment. It validates before publishing, creates version snapshots, deploys via the runtime adapter (when available), and supports activation, deactivation, archiving, duplication, and JSON-based export/import.

```typescript
import { DeploymentManager } from '@compilerai/automation-studio';
import { NodeRegistry } from '@compilerai/automation-studio';
import { WorkflowValidator } from '@compilerai/automation-studio';
import { NullRuntimeAdapter } from '@compilerai/automation-studio';

const deployment = new DeploymentManager(
  new WorkflowValidator(new NodeRegistry()),
  new NullRuntimeAdapter(),
  () => crypto.randomUUID(),
  () => new Date().toISOString(),
);
```

## Deployment Status

A workflow's deployment status is mapped from its internal workflow status:

| Workflow status | Deployment status |
|-----------------|-------------------|
| `draft` | `draft` |
| `validated` | `draft` |
| `published` | `active` |
| `unpublished` | `inactive` |
| `archived` | `archived` |

```typescript
type DeploymentStatus = 'draft' | 'published' | 'active' | 'inactive' | 'archived';
```

## Publish Workflow

Publishing a workflow performs three steps:

1. **Validate** — Runs `WorkflowValidator.validate`. If validation fails, the publish is rejected with `success: false` and the list of validation errors.
2. **Version** — Increments the workflow version and captures a snapshot of all nodes and connections.
3. **Deploy** — If the runtime adapter is available (`isAvailable()`), deploys the workflow to the runtime and receives a `deploymentId`.

```typescript
const result = await deployment.publish(workflow, 'user-1', 'Initial version');
```

```typescript
interface DeploymentResult {
  success: boolean;
  deploymentId: string | null;   // set if runtime deployed
  version: number;               // new version number
  message: string;               // human-readable
  validationErrors: string[];    // empty on success
}
```

### Validation Failure

If the workflow is invalid (e.g., missing a trigger), `publish` returns immediately without deploying:

```typescript
const result = await deployment.publish(invalidWorkflow, 'user-1');
// result.success === false
// result.message === 'Validation failed'
// result.validationErrors === ['Workflow must have a trigger node', ...]
```

### Successful Publish

```typescript
const result = await deployment.publish(validWorkflow, 'user-1', 'Add email step');
// result.success === true
// result.version === 2
// result.message === 'Workflow published as version 2'
// result.deploymentId === 'dep-...' (or null if no runtime)
```

## Activate

`activate` deploys a workflow that is already published (or was previously published/unpublished) to the runtime:

```typescript
const result = await deployment.activate(workflow, 'user-1');
```

The workflow must be in `published` or `unpublished` status; otherwise activation fails with "Workflow must be published or previously published to activate".

## Deactivate

`deactivate` takes a published workflow offline:

```typescript
const result = await deployment.deactivate(workflow, 'user-1');
```

The workflow must be in `published` status; otherwise deactivation fails with "Workflow is not published".

## Archive

`archive` marks a workflow as archived (no longer in use). A workflow that is already archived cannot be archived again.

```typescript
const result = await deployment.archive(workflow, 'user-1');
```

## Duplicate / Clone

`duplicate` creates a copy of a workflow with a new ID, `draft` status, version 1, no version history, and no publication metadata. The original workflow is unchanged.

```typescript
const clone = await deployment.duplicate(workflow, 'My Automation (Copy)', 'user-1');
// clone.id          → new UUID
// clone.name        → 'My Automation (Copy)'
// clone.status      → 'draft'
// clone.currentVersion → 1
// clone.versions    → []
```

This is useful for branching a workflow for experimentation without affecting the original.

## Export to JSON

`exportWorkflow` serializes a workflow to a portable JSON format. Connections are resolved by **node label** (not internal ID), making exports stable across environments.

```typescript
const exported = deployment.exportWorkflow(workflow);
```

```typescript
interface ExportFormat {
  format: 'json';
  version: '1.0.0';
  exportedAt: string;
  workflow: ExportedWorkflow;
}

interface ExportedWorkflow {
  name: string;
  description: string;
  category: string;
  tags: string[];
  nodes: ExportedNode[];          // type, label, position, config
  connections: ExportedConnection[]; // fromLabel, toLabel, ports
}
```

### Exported Node

```typescript
interface ExportedNode {
  type: string;
  label: string;
  positionX: number;
  positionY: number;
  config: Record<string, unknown>;
}
```

### Exported Connection

```typescript
interface ExportedConnection {
  fromLabel: string;  // resolved from node label
  toLabel: string;
  fromPort: string;
  toPort: string;
}
```

## Import from JSON

`importWorkflow` reconstructs a `Workflow` from an exported JSON format. New node IDs are generated (indexed by position), and connections are resolved back from labels to IDs via a label-to-id map.

```typescript
const imported = await deployment.importWorkflow(
  exportedData,
  'org-1',
  'user-1',
);
// imported.id          → new UUID
// imported.status      → 'draft'
// imported.currentVersion → 1
// imported.organizationId → 'org-1'
// imported.createdBy   → 'user-1'
```

### Validation

The import validates:
- `data.format` must be `'json'` and `data.workflow` must be present — otherwise throws `WorkflowValidationError`.
- The workflow must have at least one node — otherwise throws `WorkflowValidationError`.

```typescript
try {
  const wf = await deployment.importWorkflow(badData, 'org-1', 'user-1');
} catch (e) {
  // WorkflowValidationError: 'Invalid import format' or 'Invalid import'
}
```

## Deployment Info

`getDeploymentInfo` returns a summary of a workflow's deployment state:

```typescript
const info = deployment.getDeploymentInfo(workflow);
```

```typescript
interface DeploymentInfo {
  workflowId: string;
  workflowName: string;
  status: DeploymentStatus;      // draft | active | inactive | archived
  version: number;
  publishedAt: string | null;
  publishedBy: string | null;
  deploymentId: string | null;
  activeExecutions: number;      // 0 in standalone mode
}
```

## Status Tracking

The deployment status is derived from the workflow's internal status. The full lifecycle:

```
draft → (publish) → active → (deactivate) → inactive → (activate) → active
                            → (archive) → archived
```

Duplicated or imported workflows always start as `draft`.

## Code Examples

### Full Publish Cycle

```typescript
import {
  DeploymentManager, NodeRegistry, WorkflowValidator, NullRuntimeAdapter,
} from '@compilerai/automation-studio';

const deployment = new DeploymentManager(
  new WorkflowValidator(new NodeRegistry()),
  new NullRuntimeAdapter(),
  () => crypto.randomUUID(),
  () => new Date().toISOString(),
);

// Publish
const published = await deployment.publish(workflow, 'user-1', 'v1');
console.log(published.success, published.version, published.message);

// Check info
const info = deployment.getDeploymentInfo(workflow);
console.log(info.status);  // 'active' (if workflow.status was 'published')

// Deactivate
const deactivated = await deployment.deactivate(workflow, 'user-1');

// Archive
const archived = await deployment.archive(workflow, 'user-1');
```

### Duplicate a Workflow

```typescript
const clone = await deployment.duplicate(workflow, 'Email Triage (v2)', 'user-1');
console.log(clone.id, clone.name, clone.status);  // new-id, 'Email Triage (v2)', 'draft'
```

### Export and Import Round-Trip

```typescript
// Export
const exported = deployment.exportWorkflow(workflow);
const json = JSON.stringify(exported, null, 2);

// ... persist or transfer the JSON ...

// Import into another organization
const data = JSON.parse(json);
const imported = await deployment.importWorkflow(data, 'org-2', 'user-2');
console.log(imported.name, imported.nodes.length, imported.connections.length);
```

### Publish with Validation Errors

```typescript
const result = await deployment.publish(brokenWorkflow, 'user-1');
if (!result.success) {
  for (const err of result.validationErrors) {
    console.error(`✖ ${err}`);
  }
}
```

## Integration

The `DeploymentManager` is exposed through the `StudioApi` facade:

```typescript
import { StudioApi } from '@compilerai/automation-studio';

const api = new StudioApi({
  idGenerator: () => crypto.randomUUID(),
  clock: () => new Date().toISOString(),
});

await api.deployment.publish(workflow, 'user-1', 'Initial deploy');
const info = api.deployment.getDeploymentInfo(workflow);
const clone = await api.deployment.duplicate(workflow, 'Copy', 'user-1');
```

See `docs/versioning.md` for how version snapshots relate to deployment, and `docs/examples.md` for a full create → validate → simulate → publish pipeline.
