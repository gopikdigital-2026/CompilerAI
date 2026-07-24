# WorkflowSimulator (Dry Run)

> Simulates a validated `WorkflowDAG` without executing any real actions, producing a step-by-step execution plan with duration estimates, required permissions, and pre-flight diagnostics.

---

## Table of Contents

1. [Overview](#overview)
2. [What the Simulator Does](#what-the-simulator-does)
3. [Pre-Flight Checks](#pre-flight-checks)
4. [DAG Walk](#dag-walk)
5. [Duration Estimates per Node Type](#duration-estimates-per-node-type)
6. [SimulationResult](#simulationresult)
7. [SimulationStep](#simulationstep)
8. [Example — Invoice Workflow](#example--invoice-workflow)

---

## Overview

`WorkflowSimulator` is instantiated with an `ICopilotConnectorRegistry` and exposes one method:

```typescript
class WorkflowSimulator {
  constructor(registry: ICopilotConnectorRegistry) {}

  simulate(dag: WorkflowDAG): SimulationResult;
}
```

`dryRun` is **always `true`**. The simulator never opens a network socket, never reads or writes files, and never calls any connector API. It is safe to invoke in any environment, including browser sandboxes and air-gapped CI pipelines.

---

## What the Simulator Does

1. **Pre-flight checks** — validate connector and capability availability before walking the graph.
2. **DAG walk** — iterate nodes in `executionOrder` (topological order), producing one `SimulationStep` per node.
3. **Permission collection** — accumulate OAuth scopes from each action node's `requiredScopes`.
4. **Duration summation** — sum individual step estimates into `totalEstimatedDurationMs`.
5. **Skip tracking** — record nodes that will not execute (false branch of a condition).

The result is a complete _execution plan_ that can be shown to the user before they activate the workflow.

---

## Pre-Flight Checks

Pre-flight checks run **before** the DAG walk and populate `preflightErrors` / `preflightWarnings`.

### Missing Connectors

For each `connectorId` in `dag.requiredConnectors`:

```
if registry.getConnector(connectorId) === undefined:
    preflightErrors.push(
      `Connector '${connectorId}' is required but not registered.`
    )
    missingConnectors.push(connectorId)
```

A missing connector is an **error** at pre-flight (unlike the validator where it is only a warning) because the simulator needs to know whether to mark steps as `skipped`.

### Missing Capabilities

For each action node in the DAG:

```
if connector found but capability not found:
    preflightWarnings.push(
      `Capability '${capabilityId}' not found on '${connectorId}'.`
    )
```

---

## DAG Walk

After pre-flight the simulator iterates `dag.executionOrder`:

```typescript
for (const nodeId of dag.executionOrder) {
  const node = nodeMap.get(nodeId)!;

  if (missingConnectors.includes(node.connectorId ?? '')) {
    skippedNodes.push(nodeId);
    steps.push(buildStep(node, 'skipped'));
    continue;
  }

  const duration = estimateDuration(node);
  executionPath.push(nodeId);
  totalEstimatedDurationMs += duration;
  steps.push(buildStep(node, 'simulated', duration));
}
```

**Status values:**

| Status | Meaning |
|---|---|
| `simulated` | Step would execute normally |
| `skipped` | Step will not execute (condition false-branch or missing connector) |
| `error` | Step would fail (raised by pre-flight, not by real execution) |

---

## Duration Estimates per Node Type

| Node type / capability category | Duration (ms) |
|---|---|
| `trigger` | **0** (event receipt has no synthetic delay) |
| `condition` | **1** |
| `transform`, `merge`, `split` | **5** |
| Read — metadata (e.g. `github.listIssues`) | **300** |
| Read — payload (e.g. `gmail.list`, `drive.list`) | **500** |
| Write — fast (e.g. `slack.sendMessage`) | **800** |
| Write — standard (e.g. `github.createIssue`, `jira.createIssue`) | **2 000** |
| Write — heavy (e.g. `drive.upload`, `calendar.createEvent`) | **3 000** |
| CRM writes (`hubspot.*`, `salesforce.*`) | **2 500** |

These values are **estimates only**. Real connector latency depends on network conditions, API rate limits, and payload size.

---

## SimulationResult

```typescript
export interface SimulationResult {
  /** Always true — simulator never executes real actions */
  dryRun: true;

  /** One step per DAG node, in execution order */
  steps: SimulationStep[];

  /** Sum of all step estimatedDurationMs */
  totalEstimatedDurationMs: number;

  /** Errors detected before the walk began (missing connectors, etc.) */
  preflightErrors: string[];

  /** Non-blocking issues detected before the walk */
  preflightWarnings: string[];

  /** Node IDs that would execute (excluding skipped) */
  executionPath: string[];

  /** Node IDs that would NOT execute */
  skippedNodes: string[];

  /** Aggregated OAuth scopes across all action nodes */
  requiredPermissions: string[];

  /** Connector IDs not found in the registry */
  missingConnectors: string[];
}
```

---

## SimulationStep

```typescript
export interface SimulationStep {
  /** DAG node ID */
  nodeId: string;

  /** Human-readable label, e.g. "Drive: Upload File" */
  nodeLabel: string;

  /** 'simulated' | 'skipped' | 'error' */
  status: SimulationStepStatus;

  /** Estimated duration in milliseconds */
  estimatedDurationMs: number;

  /**
   * Simulated input variables available at this step.
   * Keys are variable names; values are placeholder descriptions.
   */
  inputs: Record<string, string>;

  /**
   * Variables this step would produce.
   * Keys are variable names; values are placeholder descriptions.
   */
  outputs: Record<string, string>;

  /** Non-fatal notes about this step */
  warnings: string[];

  /** Fatal issues that would cause this step to fail at runtime */
  errors: string[];
}
```

### Simulated inputs/outputs

Because no real data flows during simulation, the simulator uses **placeholder descriptions**:

```json
{
  "inputs":  { "email.attachments": "<attachment from Gmail trigger>" },
  "outputs": { "file.id": "<Drive file ID>", "file.url": "<Drive file URL>" }
}
```

These placeholders are rendered in the UI to show the user what data flows between steps.

---

## Example — Invoice Workflow

**DAG:** 5 nodes (trigger, drive upload, currency condition, github issue, calendar event)

**Pre-flight:**
- All connectors registered (`google-workspace`, `github`) ✅
- All capabilities found ✅

### Full SimulationResult

```json
{
  "dryRun": true,
  "preflightErrors": [],
  "preflightWarnings": [],
  "missingConnectors": [],
  "executionPath": [
    "node-google-workspace-email-0",
    "node-google-workspace-drive.upload-1",
    "node-condition-currency_eur-2",
    "node-github-github.createIssue-3",
    "node-google-workspace-calendar.createEvent-4"
  ],
  "skippedNodes": [],
  "totalEstimatedDurationMs": 8001,
  "requiredPermissions": [
    "gmail.readonly",
    "drive.file",
    "calendar.events",
    "repo",
    "issues:write"
  ],
  "steps": [
    {
      "nodeId": "node-google-workspace-email-0",
      "nodeLabel": "Gmail: New Email (Trigger)",
      "status": "simulated",
      "estimatedDurationMs": 0,
      "inputs": {},
      "outputs": {
        "email.subject":     "<email subject line>",
        "email.body":        "<email body text>",
        "email.sender":      "<sender email address>",
        "email.attachments": "<list of attachments>"
      },
      "warnings": [],
      "errors": []
    },
    {
      "nodeId": "node-google-workspace-drive.upload-1",
      "nodeLabel": "Drive: Upload File",
      "status": "simulated",
      "estimatedDurationMs": 3000,
      "inputs": {
        "email.attachments": "<attachment from Gmail trigger>"
      },
      "outputs": {
        "file.id":   "<Drive file ID>",
        "file.url":  "<Drive file URL>",
        "file.name": "<Drive file name>"
      },
      "warnings": [],
      "errors": []
    },
    {
      "nodeId": "node-condition-currency_eur-2",
      "nodeLabel": "Condition: Amount > 5,000 €",
      "status": "simulated",
      "estimatedDurationMs": 1,
      "inputs": {
        "email.body": "<email body text>"
      },
      "outputs": {
        "condition.result": "<true | false>"
      },
      "warnings": ["Condition result depends on runtime data; both branches are shown."],
      "errors": []
    },
    {
      "nodeId": "node-github-github.createIssue-3",
      "nodeLabel": "GitHub: Create Issue",
      "status": "simulated",
      "estimatedDurationMs": 2000,
      "inputs": {
        "email.subject": "<email subject line>",
        "email.body":    "<email body text>"
      },
      "outputs": {
        "issue.id":     "<GitHub issue ID>",
        "issue.url":    "<GitHub issue URL>",
        "issue.number": "<GitHub issue number>"
      },
      "warnings": [],
      "errors": []
    },
    {
      "nodeId": "node-google-workspace-calendar.createEvent-4",
      "nodeLabel": "Calendar: Add Review Task",
      "status": "simulated",
      "estimatedDurationMs": 3000,
      "inputs": {
        "email.subject": "<email subject line>"
      },
      "outputs": {
        "event.id":    "<Calendar event ID>",
        "event.url":   "<Calendar event URL>",
        "event.title": "<Calendar event title>"
      },
      "warnings": [],
      "errors": []
    }
  ]
}
```

### Summary

| Metric | Value |
|---|---|
| Total steps | 5 |
| Simulated steps | 5 |
| Skipped steps | 0 |
| Estimated duration | **~8 seconds** |
| Required permissions | 5 OAuth scopes |
| Missing connectors | none |

---

*See [`prompts.md`](./prompts.md) for how the simulator output is converted into human-readable summaries.*
