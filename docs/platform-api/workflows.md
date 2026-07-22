# Workflows API

## Endpoints

### Create Workflow

```
POST /api/v1/workflows
```

**Required permissions:** `workflow:create`

**Request Body:**

```json
{
  "name": "Sales Analysis Pipeline",
  "description": "Analyzes sales data and generates recommendations.",
  "nodes": [
    {
      "nodeId": "n1",
      "type": "INTELLIGENCE",
      "label": "Intent Analysis",
      "order": 1,
      "dependsOn": [],
      "requiresApproval": false
    },
    {
      "nodeId": "n2",
      "type": "FINALIZATION",
      "label": "Finalize",
      "order": 2,
      "dependsOn": ["n1"],
      "requiresApproval": false
    }
  ],
  "edges": [
    {
      "sourceNodeId": "n1",
      "targetNodeId": "n2",
      "condition": null
    }
  ],
  "mode": "SEQUENTIAL"
}
```

**Response (201):** Returns `WorkflowResponseDto` with `workflowId`, `version: "1"`, `contentHash`, and `active: false`.

### List Workflows

```
GET /api/v1/workflows
```

**Required permissions:** `workflow:read`

Returns all workflows for the authenticated organization.

### Get Workflow

```
GET /api/v1/workflows/{workflowId}
```

**Required permissions:** `workflow:read`

Returns the latest version of the workflow. Cross-org access returns 404.

### Validate Workflow

```
POST /api/v1/workflows/validate
```

**Required permissions:** `workflow:create`

Dry-run validation without persisting. Returns:

```json
{
  "data": {
    "valid": true,
    "errors": []
  },
  "meta": { ... }
}
```

### Create New Version

```
POST /api/v1/workflows/{workflowId}/versions
```

**Required permissions:** `workflow:create`

Creates a new immutable version of an existing workflow. The version number auto-increments. The content hash is recomputed from the node/edge structure.

### Activate Version

```
POST /api/v1/workflows/{workflowId}/versions/{version}/activate
```

**Required permissions:** `workflow:publish`

Sets the specified version as the active version for execution.

### Deactivate Workflow

```
POST /api/v1/workflows/{workflowId}/deactivate
```

**Required permissions:** `workflow:publish`

Deactivates the workflow (no version is active).

## Node Types

| Type | Description |
|------|-------------|
| `INTELLIGENCE` | Run the intelligence pipeline (context, intent, planning, decision, confidence) |
| `MEMORY_READ` | Read from the memory engine |
| `MEMORY_WRITE` | Write to the memory engine |
| `TOOL_SELECTION` | Select tools for the execution |
| `TOOL_EXECUTION` | Execute selected tools |
| `HUMAN_APPROVAL` | Pause for human approval gate |
| `CONDITION` | Conditional branching |
| `PARALLEL` | Parallel execution fan-out |
| `JOIN` | Synchronize parallel branches |
| `LEARNING` | Extract learning from execution |
| `FINALIZATION` | Build final result and cleanup |

## Execution Modes

| Mode | Description |
|------|-------------|
| `SEQUENTIAL` | Nodes execute one at a time in order |
| `DAG` | Nodes execute in dependency-based topological order (parallel where possible) |

## Versioning

- Each workflow has an auto-incrementing version number starting at `"1"`.
- Versions are immutable — creating a new version does not modify existing ones.
- The `contentHash` is computed from node IDs, types, orders, dependencies, and edges. It changes when the workflow structure changes.
- Only one version can be active at a time.
