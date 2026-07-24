# WorkflowPlanner

> Converts a `ParsedIntent` into a typed directed-acyclic-graph (`WorkflowDAG`) with topological execution order, duration estimates, and variable-flow metadata.

---

## Table of Contents

1. [Overview](#overview)
2. [Input & Output](#input--output)
3. [Node Types](#node-types)
4. [Edge Types](#edge-types)
5. [Error Policies](#error-policies)
6. [Node & Edge ID Format](#node--edge-id-format)
7. [Condition Insertion Algorithm](#condition-insertion-algorithm)
8. [Topological Sort — Kahn's Algorithm](#topological-sort--kahns-algorithm)
9. [Duration Estimation](#duration-estimation)
10. [Variable Flow](#variable-flow)
11. [Example DAG — Invoice Workflow](#example-dag--invoice-workflow)

---

## Overview

`WorkflowPlanner` is constructed with an `ICopilotConnectorRegistry` and exposes a single method:

```typescript
class WorkflowPlanner {
  constructor(registry: ICopilotConnectorRegistry) {}

  plan(intent: ParsedIntent): WorkflowDAG;
}
```

The planner is **pure**: given the same `ParsedIntent` and the same registry snapshot it always returns the same DAG. It performs no I/O and holds no mutable state.

---

## Input & Output

### Input

| Field | Source |
|---|---|
| `intent: ParsedIntent` | Output of `NaturalLanguageParser` |
| `registry: ICopilotConnectorRegistry` | Injected at construction time |

### Output — `WorkflowDAG`

```typescript
export interface WorkflowDAG {
  nodes: DAGNode[];
  edges: DAGEdge[];

  /** Node IDs in topological execution order */
  executionOrder: string[];

  /** Sum of all node duration estimates (ms) */
  estimatedDurationMs: number;

  /** De-duplicated connector IDs used across all nodes */
  requiredConnectors: string[];
}
```

---

## Node Types

```typescript
export type NodeType =
  | 'trigger'     // entry point — always exactly one per DAG
  | 'action'      // performs real work (read or write)
  | 'condition'   // boolean branch — two outgoing edges
  | 'transform'   // data mapping / formatting, no external I/O
  | 'merge'       // fan-in: waits for all incoming edges
  | 'split';      // fan-out: fires all outgoing edges in parallel
```

| Type | Has connector? | Can have conditions? | Typical child types |
|---|---|---|---|
| `trigger` | Yes | No | `action`, `condition`, `transform` |
| `action` | Yes | No | `action`, `condition`, `transform` |
| `condition` | No | — | `action`, `merge`, `skip` |
| `transform` | No | No | `action`, `merge` |
| `merge` | No | No | `action`, `condition` |
| `split` | No | No | `action` (≥2 parallel branches) |

```typescript
export interface DAGNode {
  id: string;
  type: NodeType;
  label: string;
  connectorId?: string;
  capabilityId?: string;
  parameters: Record<string, unknown>;
  errorPolicy: ErrorPolicy;
  estimatedDurationMs: number;
  requiredScopes: string[];
}
```

---

## Edge Types

```typescript
export type EdgeType =
  | 'success'      // previous node completed without error
  | 'failure'      // previous node threw an error
  | 'conditional'  // edge from a condition node (true OR false branch)
  | 'always';      // fires regardless of previous node outcome
```

```typescript
export interface DAGEdge {
  id: string;
  from: string;     // source node ID
  to: string;       // target node ID
  type: EdgeType;
  label?: string;   // e.g. 'amount > 5000 €', 'true', 'false'
}
```

A `condition` node always produces **exactly two** outgoing edges — one labelled `true`, one labelled `false` — both of type `conditional`.

---

## Error Policies

Each node receives an `errorPolicy` that tells the runtime how to react to a failure.

| Policy | Assigned to | Behaviour |
|---|---|---|
| `fail` | `trigger`, write `action` nodes | Halt the workflow immediately; propagate error |
| `retry` | Read `action` nodes | Retry up to 3 times with exponential back-off before failing |
| `continue` | `condition` nodes | Log the error, treat branch result as `false`, continue |
| `skip` | `transform`, `merge`, `split` | Skip this node and proceed to the next node in order |

The planner determines whether an action node is a _read_ or a _write_ by looking up the capability descriptor in the registry. If the registry is unavailable the capability is assumed to be a write (conservative default → `fail`).

---

## Node & Edge ID Format

```
node-{connectorId}-{capabilityId}-{sequenceIndex}
  e.g.  node-google-workspace-drive.upload-1

edge-{fromNodeIndex}-{toNodeIndex}
  e.g.  edge-0-1
```

Condition nodes use:
```
node-condition-{conditionType}-{sequenceIndex}
  e.g.  node-condition-currency_eur-0
```

The sequence index is the insertion order within the `nodes` array, making IDs stable across re-plans of the same intent.

---

## Condition Insertion Algorithm

When `intent.conditions` is non-empty the planner inserts condition nodes **between the trigger and the actions that should be gated**.

```
Step 1  Create the trigger node (index 0).

Step 2  For each condition in intent.conditions:
          a. Create a condition node.
          b. Connect previous node → condition node  (edge type: 'success').
          c. Connect condition node → next_action    (edge type: 'conditional', label: 'true').
          d. Connect condition node → END / skip     (edge type: 'conditional', label: 'false').

Step 3  For each action NOT gated by a condition:
          Connect previous node → action node        (edge type: 'success').

Step 4  Remaining actions (after condition true-branch) are chained:
          condition_true_action → next_action        (edge type: 'success').
```

Actions before the condition (e.g. a Drive upload that should always happen) are wired directly from the trigger with an `always` edge, so they execute unconditionally.

---

## Topological Sort — Kahn's Algorithm

```
1.  Build an in-degree map: { nodeId → count of incoming edges }
2.  Enqueue all nodes with in-degree == 0  (the trigger node)
3.  While queue is non-empty:
      a. Dequeue node N, append to executionOrder
      b. For each outgoing neighbour M of N:
           decrement in-degree[M]
           if in-degree[M] == 0: enqueue M
4.  If executionOrder.length < nodes.length:
        a cycle was detected — WorkflowValidator will catch it
```

The planner does NOT raise an error for cycles; it simply returns an incomplete `executionOrder`. The validator's `CYCLE_DETECTED` check is the authoritative cycle guard.

---

## Duration Estimation

The planner estimates total workflow duration by summing per-node estimates.

### Base Duration per Capability Type

| Category | Examples | Estimated ms |
|---|---|---|
| Trigger (event) | Gmail trigger, GitHub webhook | 0 |
| Condition evaluation | Currency check, label check | 1 |
| Transform / merge / split | Variable mapping | 5 |
| Read — fast (metadata) | `github.listIssues`, `jira.getIssue` | 300 |
| Read — standard | `gmail.list`, `drive.list` | 500 |
| Write — fast | `slack.sendMessage` | 800 |
| Write — standard | `github.createIssue`, `jira.createIssue` | 2 000 |
| Write — heavy | `drive.upload`, `calendar.createEvent` | 3 000 |
| Salesforce / HubSpot writes | CRM record mutations | 2 500 |

### Per-Connector Overrides

| Connector | Multiplier |
|---|---|
| `google-workspace` | ×1.0 |
| `github` | ×1.0 |
| `slack` | ×0.4 (write is cheap) |
| `jira` | ×1.2 (API is slower) |
| `notion` | ×1.1 |
| `hubspot` | ×1.2 |
| `salesforce` | ×1.3 |

`estimatedDurationMs` = Σ (base × multiplier) for each node.

---

## Variable Flow

The planner resolves which nodes produce variables and which nodes consume them, using two static maps.

### `CAPABILITY_PRODUCES`

```typescript
const CAPABILITY_PRODUCES: Record<string, string[]> = {
  'google-workspace/gmail.list':        ['email.subject', 'email.body', 'email.sender', 'email.attachments'],
  'google-workspace/drive.upload':      ['file.id', 'file.url', 'file.name'],
  'google-workspace/calendar.createEvent': ['event.id', 'event.url', 'event.title'],
  'github/github.createIssue':          ['issue.id', 'issue.url', 'issue.number'],
  'github/github.createPR':             ['pr.id', 'pr.url', 'pr.number'],
  'slack/slack.sendMessage':            ['message.ts', 'message.channel'],
  'jira/jira.createIssue':              ['ticket.id', 'ticket.url', 'ticket.key'],
  'notion/notion.createPage':           ['page.id', 'page.url', 'page.title'],
  'hubspot/hubspot.createContact':      ['contact.id', 'contact.email', 'contact.name'],
  'salesforce/salesforce.createOpportunity': ['opportunity.id', 'opportunity.name'],
};
```

### `CAPABILITY_CONSUMES`

```typescript
const CAPABILITY_CONSUMES: Record<string, string[]> = {
  'google-workspace/drive.upload':         ['email.attachments'],
  'google-workspace/calendar.createEvent': ['email.subject'],
  'github/github.createIssue':             ['email.subject', 'email.body'],
  'github/github.addComment':              ['issue.id', 'issue.number'],
  'slack/slack.sendMessage':               ['issue.url', 'file.url', 'event.url', 'ticket.url', 'page.url'],
  'jira/jira.createIssue':                 ['email.subject', 'email.body'],
  'jira/jira.updateIssue':                 ['ticket.id', 'ticket.key'],
  'notion/notion.createPage':              ['email.subject', 'issue.url'],
  'notion/notion.updatePage':              ['page.id'],
  'hubspot/hubspot.updateDeal':            ['contact.id'],
  'salesforce/salesforce.updateRecord':    ['opportunity.id'],
};
```

The planner uses these maps to populate each node's `parameters` with variable references (`$email.subject`, etc.) and to compute `VariableBinding` objects in the resulting `ParsedIntent`.

---

## Example DAG — Invoice Workflow

**Instruction:**
> "When I receive an email with an invoice in Gmail, save it in Google Drive, create an issue in GitHub if it exceeds 5,000 € and add a review task to the calendar."

### ASCII Diagram

```
┌──────────────────────────────────────┐
│  TRIGGER                             │
│  node-google-workspace-email-0       │
│  Gmail: email.received               │
└──────────────┬───────────────────────┘
               │ always
               ▼
┌──────────────────────────────────────┐
│  ACTION                              │
│  node-google-workspace-drive.upload-1│
│  Drive: Upload attachment            │
│  errorPolicy: fail                   │
└──────────────┬───────────────────────┘
               │ success
               ▼
┌──────────────────────────────────────┐
│  CONDITION                           │
│  node-condition-currency_eur-2       │
│  amount > 5,000 €                    │
└──────────┬───────────────┬───────────┘
           │ true          │ false
           ▼               ▼
┌──────────────────┐   ┌──────────────┐
│  ACTION          │   │  (skip)      │
│  node-github-    │   └──────────────┘
│  createIssue-3   │
│  GitHub: create  │
│  issue           │
└────────┬─────────┘
         │ success
         ▼
┌──────────────────────────────────────┐
│  ACTION                              │
│  node-google-workspace-              │
│  calendar.createEvent-4              │
│  Calendar: Add review task           │
│  errorPolicy: fail                   │
└──────────────────────────────────────┘

executionOrder: [0, 1, 2, 3, 4]
estimatedDurationMs: 0 + 3000 + 1 + 2000 + 3000 = 8,001 ms
requiredConnectors: ['google-workspace', 'github']
```

### JSON Snapshot

```json
{
  "nodes": [
    { "id": "node-google-workspace-email-0",          "type": "trigger",   "label": "Gmail: New Email",        "estimatedDurationMs": 0    },
    { "id": "node-google-workspace-drive.upload-1",   "type": "action",    "label": "Drive: Upload File",      "estimatedDurationMs": 3000 },
    { "id": "node-condition-currency_eur-2",          "type": "condition", "label": "Amount > 5,000 €",        "estimatedDurationMs": 1    },
    { "id": "node-github-github.createIssue-3",       "type": "action",    "label": "GitHub: Create Issue",    "estimatedDurationMs": 2000 },
    { "id": "node-google-workspace-calendar.createEvent-4", "type": "action", "label": "Calendar: Add Task",  "estimatedDurationMs": 3000 }
  ],
  "edges": [
    { "id": "edge-0-1", "from": "node-...-0", "to": "node-...-1", "type": "always" },
    { "id": "edge-1-2", "from": "node-...-1", "to": "node-...-2", "type": "success" },
    { "id": "edge-2-3", "from": "node-...-2", "to": "node-...-3", "type": "conditional", "label": "true"  },
    { "id": "edge-2-x", "from": "node-...-2", "to": null,         "type": "conditional", "label": "false" },
    { "id": "edge-3-4", "from": "node-...-3", "to": "node-...-4", "type": "success" }
  ],
  "executionOrder": [
    "node-google-workspace-email-0",
    "node-google-workspace-drive.upload-1",
    "node-condition-currency_eur-2",
    "node-github-github.createIssue-3",
    "node-google-workspace-calendar.createEvent-4"
  ],
  "estimatedDurationMs": 8001,
  "requiredConnectors": ["google-workspace", "github"]
}
```

---

*See [`validator.md`](./validator.md) for how this DAG is checked before generation.*
