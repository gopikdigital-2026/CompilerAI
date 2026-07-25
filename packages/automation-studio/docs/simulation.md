# Visual Simulation

> **Sprint 28** — This guide covers the `VisualSimulation` engine: dry-run execution with visual node states and highlights, cost and duration estimation, preflight checks, execution timelines, and confidence scoring.

## Overview

The `VisualSimulation` class runs a **dry-run** simulation of a workflow. It does not execute real actions or make external API calls. Instead, it walks the execution graph from the trigger node, assigns each node a visual state and highlight, estimates cost and duration per node, collects decisions, and reports preflight errors and warnings.

The result is a complete `VisualSimulationResult` that a frontend can render as an animated execution path with color-coded nodes, active edges, and a cost/duration summary.

```typescript
import { VisualSimulation } from '@compilerai/automation-studio';

const simulator = new VisualSimulation();
const result = simulator.simulate(workflow);
```

## Node States

Each simulated node has a `SimulationNodeState`:

| State | Description |
|-------|-------------|
| `idle` | Not yet processed (no trigger found) |
| `running` | Currently executing (used in animated playback) |
| `completed` | Successfully reached and processed |
| `failed` | Encountered an error |
| `skipped` | Not reached during the dry-run execution path |

## Highlights

Each node also carries a `SimulationHighlight` that maps directly to a visual treatment:

| Highlight | When | Visual meaning |
|-----------|------|----------------|
| `normal` | idle / default | Standard appearance |
| `active` | running | Pulsing / highlighted (currently executing) |
| `success` | completed | Green / checkmark |
| `failure` | failed | Red / error indicator |
| `warning` | warning present | Amber / caution |
| `dimmed` | skipped | Greyed out / faded |

The state-to-highlight mapping:

| State | Highlight |
|-------|-----------|
| `completed` | `success` |
| `failed` | `failure` |
| `running` | `active` |
| `skipped` | `dimmed` |
| `idle` | `normal` |

Highlight mode can be disabled (`simulate(workflow, { highlightMode: false })`) to return all nodes as `normal`.

## Execution Path Visualization

The simulation performs a **BFS traversal** from the trigger node, following connections in order. The `executionPath` is an ordered array of node IDs representing the traversal sequence:

```typescript
result.executionPath;
// → ['trigger-1', 'ai-1', 'decision-1', 'tool-1', 'end-1']
```

Edges traversed during the simulation are marked `active: true` in `result.edges`. Nodes not reached are marked `skipped` with a warning: "Node was not reached during simulation".

If no trigger node is found, all nodes are set to `idle` and `success` is `false`.

## Cost Estimation

`estimateCost` computes a per-node cost using a fixed cost table. The unit is USD per execution.

| Node type | Estimated cost |
|-----------|---------------|
| `ai_agent` | $0.02 |
| `ai_prompt` | $0.02 |
| `tool` | $0.05 |
| `loop` | $0.01 |
| `notification` | $0.001 |
| `http_request` | $0.0001 |
| `trigger` | $0 |
| `webhook_trigger` | $0 |
| `gmail_trigger` | $0 |
| `gmail_send` | $0 |
| `drive_upload` | $0 |
| `drive_list` | $0 |
| `calendar_create` | $0 |
| `calendar_list` | $0 |
| `github_create_issue` | $0 |
| `github_list_issues` | $0 |
| `variable_set` | $0 |
| `variable_get` | $0 |
| `decision` | $0 |
| `condition` | $0 |
| `human_approval` | $0 |
| `delay` | $0 |
| `wait` | $0 |
| `retry` | $0 |
| `end` | $0 |

```typescript
const { totalCost, perNode } = simulator.estimateCost(workflow);
// totalCost → sum of all node costs
// perNode   → [{ nodeId, cost }]
```

The `result.totalEstimatedCost` aggregates all node costs.

## Duration Estimation

`estimateDuration` computes a per-node duration in milliseconds using a fixed duration table.

| Node type | Estimated duration |
|-----------|-------------------|
| `trigger` | 0 ms |
| `webhook_trigger` | 0 ms |
| `gmail_trigger` | 0 ms |
| `ai_agent` | 2000 ms |
| `ai_prompt` | 2000 ms |
| `decision` | 1 ms |
| `condition` | 1 ms |
| `human_approval` | 86,400,000 ms (24 hours) |
| `tool` | 1000 ms |
| `loop` | 500 ms × maxIterations (default 100) |
| `delay` | config `durationMs` (default 1000 ms) |
| `wait` | config `durationMs` (default 1000 ms) |
| `notification` | 500 ms |
| `gmail_send` | 1500 ms |
| `drive_upload` | 2000 ms |
| `drive_list` | 2000 ms |
| `calendar_create` | 2000 ms |
| `calendar_list` | 2000 ms |
| `github_create_issue` | 1500 ms |
| `github_list_issues` | 1500 ms |
| `http_request` | 3000 ms |
| `variable_set` | 0 ms |
| `variable_get` | 0 ms |
| `retry` | 0 ms |
| `end` | 0 ms |

```typescript
const { totalMs, perNode } = simulator.estimateDuration(workflow);
// totalMs  → sum of all node durations
// perNode  → [{ nodeId, durationMs }]
```

Special handling:
- **`delay` / `wait`** — Uses the explicit `durationMs` from node config if present.
- **`loop`** — Multiplies the base 500 ms by `maxIterations` (from config, default 100).

The `result.totalEstimatedDurationMs` aggregates all node durations.

## Preflight Checks

`preflightCheck` runs before simulation and deployment to catch structural problems early.

```typescript
const { errors, warnings, ready } = simulator.preflightCheck(workflow);
```

| Check | Level | Condition |
|-------|-------|-----------|
| Workflow name required | error | name is blank |
| At least one node | error | no nodes |
| Exactly one trigger | error | zero triggers |
| At most one trigger | error | more than one trigger |
| End node present | warning | no `end` node |
| Empty properties | warning | any node config value is blank |

`ready` is `true` only when there are no errors. The `result.success` of a simulation is `true` only when `preflight.errors` is empty.

## Execution Timeline

`getTimeline` produces an ordered `SimulationStep[]` representing the execution sequence with step indices and timestamps:

```typescript
const timeline = simulator.getTimeline(workflow);
// → [{ nodeId, stepIndex, timestamp }, ...]
```

```typescript
interface SimulationStep {
  nodeId: string;
  stepIndex: number;
  timestamp: string;
}
```

This is useful for rendering a step-by-step playback or a Gantt-style timeline.

## Confidence Scoring

Each node receives a confidence score representing how predictable its outcome is. The `averageConfidence` in the result is the mean across all reached nodes.

| Node type | Confidence |
|-----------|-----------|
| `trigger`, `webhook_trigger`, `gmail_trigger` | 1.0 |
| `end` | 1.0 |
| `human_approval` | 1.0 |
| `ai_agent`, `ai_prompt` | 0.9 |
| `decision` | 0.85 |
| `condition` | 0.9 |
| `tool` | 0.95 |
| Other / connector nodes | 0.9 |

## Required Connectors

`getRequiredConnectors` inspects node types for connector prefixes and returns the set of required connectors:

```typescript
const connectors = simulator.getRequiredConnectors(workflow);
// → ['gmail', 'http', 'ai']
```

Recognized prefixes: `gmail`, `drive`, `calendar`, `github`, `http`, `webhook`, `ai`. These appear in `result.requiredConnectors`.

## VisualSimulationResult

The full result of `simulate`:

```typescript
interface VisualSimulationResult {
  dryRun: true;                       // always true — no real execution
  workflowId: string;
  workflowName: string;
  nodes: VisualSimulationNode[];      // per-node state + estimates
  edges: VisualSimulationEdge[];      // connections with active flags
  executionPath: string[];            // ordered traversal
  totalEstimatedDurationMs: number;
  totalEstimatedCost: number;
  averageConfidence: number;          // mean across reached nodes
  preflightErrors: string[];
  preflightWarnings: string[];
  requiredConnectors: string[];
  missingConnectors: string[];        // always [] (no connector registry)
  requiredPermissions: string[];      // always []
  success: boolean;                   // preflight.errors.length === 0
}
```

### VisualSimulationNode

```typescript
interface VisualSimulationNode {
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
  state: SimulationNodeState;         // idle | running | completed | failed | skipped
  highlight: SimulationHighlight;     // normal | active | success | failure | warning | dimmed
  estimatedDurationMs: number;
  estimatedCost: number;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  decisions: string[];                // e.g., ['true'] for decision nodes
  errors: string[];
  warnings: string[];                 // e.g., skipped nodes
}
```

### VisualSimulationEdge

```typescript
interface VisualSimulationEdge {
  from: string;
  to: string;
  active: boolean;        // true if traversed during simulation
  label: string | null;
}
```

## Code Examples

### Basic Simulation

```typescript
import { VisualSimulation } from '@compilerai/automation-studio';

const simulator = new VisualSimulation();
const result = simulator.simulate(workflow);

console.log(result.success);              // true if no preflight errors
console.log(result.executionPath);        // ['trigger-1', 'ai-1', ...]
console.log(result.totalEstimatedCost);   // e.g., 0.0201
console.log(result.totalEstimatedDurationMs); // e.g., 4052
console.log(result.averageConfidence);    // e.g., 0.93

for (const node of result.nodes) {
  console.log(`${node.nodeLabel}: ${node.state} (${node.highlight})`);
}
```

### Cost and Duration Breakdown

```typescript
const cost = simulator.estimateCost(workflow);
console.log(`Total cost: $${cost.totalCost.toFixed(4)}`);
for (const { nodeId, cost: c } of cost.perNode) {
  if (c > 0) console.log(`  ${nodeId}: $${c.toFixed(4)}`);
}

const duration = simulator.estimateDuration(workflow);
console.log(`Total duration: ${duration.totalMs} ms`);
```

### Preflight Before Deployment

```typescript
const preflight = simulator.preflightCheck(workflow);
if (!preflight.ready) {
  console.error('Cannot simulate:', preflight.errors);
  console.warn('Warnings:', preflight.warnings);
  return;
}
const result = simulator.simulate(workflow);
```

### Execution Timeline

```typescript
const timeline = simulator.getTimeline(workflow, 50);
timeline.forEach((step) => {
  console.log(`Step ${step.stepIndex}: ${step.nodeId} at ${step.timestamp}`);
});
```

### Required Connectors

```typescript
const connectors = simulator.getRequiredConnectors(workflow);
console.log('Required connectors:', connectors);
// → ['gmail', 'http', 'ai']
```

### Disabled Highlight Mode

```typescript
const result = simulator.simulate(workflow, { highlightMode: false });
// all nodes have highlight: 'normal'
```

### Step Limit

```typescript
const result = simulator.simulate(workflow, { maxSteps: 50 });
// stops after 50 steps (default 100)
```

## Integration with the Full Pipeline

The `VisualSimulation` is typically used between validation and deployment:

```
build → validate → simulate (dry run) → review → deploy
```

See `docs/examples.md` for a full end-to-end pipeline example, and `docs/deployment.md` for the deployment step.
