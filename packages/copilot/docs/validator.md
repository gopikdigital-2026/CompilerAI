# WorkflowValidator

> Runs 9 structural and semantic checks against a `WorkflowDAG` and returns a `ValidationResult`.

---

## Table of Contents

1. [Overview](#overview)
2. [ValidationResult Structure](#validationresult-structure)
3. [How `valid` Is Determined](#how-valid-is-determined)
4. [Validation Checks](#validation-checks)
   - [MISSING_TRIGGER](#missing_trigger)
   - [MULTIPLE_TRIGGERS](#multiple_triggers)
   - [CYCLE_DETECTED](#cycle_detected)
   - [ORPHAN_NODE](#orphan_node)
   - [UNREACHABLE_NODE](#unreachable_node)
   - [CONNECTOR_NOT_FOUND](#connector_not_found)
   - [CAPABILITY_NOT_FOUND](#capability_not_found)
   - [UNDEFINED_VARIABLE](#undefined_variable)
   - [OAUTH_SCOPES_REQUIRED](#oauth_scopes_required)
   - [NO_PARAMETERS](#no_parameters)
5. [DFS Cycle Detection Algorithm](#dfs-cycle-detection-algorithm)
6. [Example Validation Output](#example-validation-output)

---

## Overview

`WorkflowValidator` is a stateless class that accepts an `ICopilotConnectorRegistry` at construction time and exposes a single method:

```typescript
class WorkflowValidator {
  constructor(registry: ICopilotConnectorRegistry) {}

  validate(dag: WorkflowDAG): ValidationResult;
}
```

Checks are executed in a fixed order. Short-circuit logic: if `MISSING_TRIGGER` fires, the remaining checks that require a trigger node are still run (they may produce additional issues), but `CYCLE_DETECTED` is skipped if the graph is empty.

---

## ValidationResult Structure

```typescript
export interface ValidationResult {
  /** true if no error-severity issues were found */
  valid: boolean;

  /** All issues (error + warning + info), in detection order */
  issues: ValidationIssue[];

  /** Subset where severity === 'error' */
  errors: ValidationIssue[];

  /** Subset where severity === 'warning' */
  warnings: ValidationIssue[];

  /** Subset where severity === 'info' */
  infos: ValidationIssue[];
}

export interface ValidationIssue {
  code: ValidationCode;
  severity: 'error' | 'warning' | 'info';
  message: string;
  nodeId?: string;       // affected node, if applicable
  suggestion?: string;   // how to fix it
}

export type ValidationCode =
  | 'MISSING_TRIGGER'
  | 'MULTIPLE_TRIGGERS'
  | 'CYCLE_DETECTED'
  | 'ORPHAN_NODE'
  | 'UNREACHABLE_NODE'
  | 'CONNECTOR_NOT_FOUND'
  | 'CAPABILITY_NOT_FOUND'
  | 'UNDEFINED_VARIABLE'
  | 'OAUTH_SCOPES_REQUIRED'
  | 'NO_PARAMETERS';
```

---

## How `valid` Is Determined

```
valid = (errors.length === 0)
```

`warning` and `info` issues do **not** block execution. They are surfaced in the UI as advisory messages. This allows the workflow to be generated and simulated even when, for example, connector credentials have not yet been configured (`CONNECTOR_NOT_FOUND` is a warning).

---

## Validation Checks

### MISSING_TRIGGER

| Field | Value |
|---|---|
| Code | `MISSING_TRIGGER` |
| Severity | **error** |
| Blocks generation | Yes |

**Description:** Every executable workflow must begin with exactly one trigger node. If `dag.nodes` contains no node of type `'trigger'`, this error is raised.

**Message:** `"Workflow has no trigger node. Every workflow must start with a trigger."`

**Fix suggestion:** `"Add a trigger (e.g. 'When I receive an email in Gmail…') to your instruction."`

---

### MULTIPLE_TRIGGERS

| Field | Value |
|---|---|
| Code | `MULTIPLE_TRIGGERS` |
| Severity | **error** |
| Blocks generation | Yes |

**Description:** Raised when two or more nodes with `type === 'trigger'` are found.

**Message:** `"Workflow has {n} trigger nodes; only one is allowed."`

**Fix suggestion:** `"Rewrite the instruction with a single starting event. Use conditions to handle multiple cases."`

---

### CYCLE_DETECTED

| Field | Value |
|---|---|
| Code | `CYCLE_DETECTED` |
| Severity | **error** |
| Blocks generation | Yes |

**Description:** Workflow DAGs must be acyclic. A cycle would cause infinite execution. Detection uses the DFS 3-colour algorithm (see [below](#dfs-cycle-detection-algorithm)).

**Message:** `"Cycle detected involving node '{nodeId}'. Workflows must be acyclic."`

**Fix suggestion:** `"Remove the back-edge from '{nodeId}' or restructure the workflow to avoid loops."`

---

### ORPHAN_NODE

| Field | Value |
|---|---|
| Code | `ORPHAN_NODE` |
| Severity | **error** |
| Blocks generation | Yes |

**Description:** A node has no incoming **and** no outgoing edges, meaning it is completely disconnected from the graph. (Trigger nodes with only outgoing edges are exempt.)

**Message:** `"Node '{nodeId}' ({label}) is an orphan — it has no connections to any other node."`

**Fix suggestion:** `"Connect this node to the workflow or remove it from the instruction."`

---

### UNREACHABLE_NODE

| Field | Value |
|---|---|
| Code | `UNREACHABLE_NODE` |
| Severity | **error** |
| Blocks generation | Yes |

**Description:** Starting from the trigger node and following edges forward, if a non-trigger node cannot be reached it will never execute.

Detection: BFS / DFS from trigger node → collect reachable set → flag any node not in the set.

**Message:** `"Node '{nodeId}' ({label}) is unreachable from the trigger."`

**Fix suggestion:** `"Ensure there is a connected path from the trigger to this node."`

---

### CONNECTOR_NOT_FOUND

| Field | Value |
|---|---|
| Code | `CONNECTOR_NOT_FOUND` |
| Severity | **warning** |
| Blocks generation | No — `valid` remains `true` |

**Description:** A node references a `connectorId` that is not registered in the `ICopilotConnectorRegistry`. This is expected during preview before the user has connected an account.

**Message:** `"Connector '{connectorId}' used by node '{nodeId}' is not registered."`

**Fix suggestion:** `"Connect your {connectorId} account in Settings → Integrations."`

---

### CAPABILITY_NOT_FOUND

| Field | Value |
|---|---|
| Code | `CAPABILITY_NOT_FOUND` |
| Severity | **warning** |
| Blocks generation | No |

**Description:** The connector is registered but the specific `capabilityId` does not exist in its descriptor. This may indicate a typo or a capability not yet supported.

**Message:** `"Capability '{capabilityId}' not found on connector '{connectorId}'."`

**Fix suggestion:** `"Check the connector documentation for available capabilities."`

---

### UNDEFINED_VARIABLE

| Field | Value |
|---|---|
| Code | `UNDEFINED_VARIABLE` |
| Severity | **warning** |
| Blocks generation | No |

**Description:** A node's `parameters` contains a variable reference (e.g. `$email.attachments`) that is not produced by any upstream node in the DAG.

**Message:** `"Variable '\${varName}' used by node '{nodeId}' is not produced by any preceding node."`

**Fix suggestion:** `"Ensure an upstream step produces '{varName}' before this node executes."`

---

### OAUTH_SCOPES_REQUIRED

| Field | Value |
|---|---|
| Code | `OAUTH_SCOPES_REQUIRED` |
| Severity | **info** |
| Blocks generation | No |

**Description:** Informational notice listing the OAuth scopes that will be requested when the workflow is activated. Raised once per connector with non-empty `requiredScopes`.

**Message:** `"Connector '{connectorId}' requires OAuth scopes: {scopes}."`

**Fix suggestion:** `"Grant these permissions when connecting your {connectorId} account."`

---

### NO_PARAMETERS

| Field | Value |
|---|---|
| Code | `NO_PARAMETERS` |
| Severity | **info** |
| Blocks generation | No |

**Description:** An action or transform node has an empty `parameters` map. This is often fine (e.g. a trigger node) but may indicate the parser failed to extract expected values.

**Message:** `"Node '{nodeId}' ({label}) has no parameters configured."`

**Fix suggestion:** `"Add more detail to your instruction to help the copilot infer the required parameters."`

---

## DFS Cycle Detection Algorithm

The validator uses the classical **3-colour DFS** (also called white-grey-black colouring):

```
Color = { WHITE: 0, GREY: 1, BLACK: 2 }

function dfs(nodeId, color, adjacency):
  color[nodeId] = GREY

  for each neighbour in adjacency[nodeId]:
    if color[neighbour] === GREY:
      # Back-edge detected → cycle!
      emit CYCLE_DETECTED for neighbour
      return true
    if color[neighbour] === WHITE:
      if dfs(neighbour, color, adjacency):
        return true

  color[nodeId] = BLACK
  return false

# Main routine
color = { all nodes → WHITE }
for each node in dag.nodes:
  if color[node.id] === WHITE:
    dfs(node.id, color, adjacency)
```

- **WHITE** — not yet visited.
- **GREY** — currently on the DFS stack (in-progress).
- **BLACK** — fully processed; all descendants are safe.

Encountering a **GREY** neighbour means there is a back-edge, i.e. a cycle.

---

## Example Validation Output

### Valid workflow — invoice example

```json
{
  "valid": true,
  "issues": [
    {
      "code": "OAUTH_SCOPES_REQUIRED",
      "severity": "info",
      "message": "Connector 'google-workspace' requires OAuth scopes: gmail.readonly, drive.file, calendar.events.",
      "nodeId": "node-google-workspace-email-0",
      "suggestion": "Grant these permissions when connecting your google-workspace account."
    },
    {
      "code": "OAUTH_SCOPES_REQUIRED",
      "severity": "info",
      "message": "Connector 'github' requires OAuth scopes: repo, issues:write.",
      "nodeId": "node-github-github.createIssue-3",
      "suggestion": "Grant these permissions when connecting your github account."
    }
  ],
  "errors":   [],
  "warnings": [],
  "infos": [
    { "code": "OAUTH_SCOPES_REQUIRED", ... },
    { "code": "OAUTH_SCOPES_REQUIRED", ... }
  ]
}
```

---

### Invalid workflow — missing trigger

```json
{
  "valid": false,
  "issues": [
    {
      "code": "MISSING_TRIGGER",
      "severity": "error",
      "message": "Workflow has no trigger node. Every workflow must start with a trigger.",
      "suggestion": "Add a trigger (e.g. 'When I receive an email in Gmail…') to your instruction."
    },
    {
      "code": "UNREACHABLE_NODE",
      "severity": "error",
      "message": "Node 'node-google-workspace-drive.upload-0' (Drive: Upload File) is unreachable from the trigger.",
      "nodeId": "node-google-workspace-drive.upload-0",
      "suggestion": "Ensure there is a connected path from the trigger to this node."
    }
  ],
  "errors": [
    { "code": "MISSING_TRIGGER",   ... },
    { "code": "UNREACHABLE_NODE",  ... }
  ],
  "warnings": [],
  "infos": []
}
```

---

### Partial workflow — unconnected connector (still valid)

```json
{
  "valid": true,
  "issues": [
    {
      "code": "CONNECTOR_NOT_FOUND",
      "severity": "warning",
      "message": "Connector 'salesforce' used by node 'node-salesforce-createOpportunity-2' is not registered.",
      "nodeId": "node-salesforce-createOpportunity-2",
      "suggestion": "Connect your salesforce account in Settings → Integrations."
    }
  ],
  "errors":   [],
  "warnings": [{ "code": "CONNECTOR_NOT_FOUND", ... }],
  "infos":    []
}
```

---

*See [`simulation.md`](./simulation.md) for what happens after validation.*
