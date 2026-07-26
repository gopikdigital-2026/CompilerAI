# Execution

The `ExecutionEngine` turns an `ExecutionPlan` into a completed
`ExecutionResult`. It schedules tasks respecting dependencies, runs independent
tasks in parallel, pauses for human approvals, retries failed tasks once, and
records a full timeline plus telemetry for every transition.

## Parallel & sequential scheduling

The engine uses a topological sort (Kahn's algorithm) over `finish_to_start`
dependencies. On each iteration it finds the set of **ready tasks** — those
whose dependencies are all completed — and runs up to `maxConcurrency` of them
in a single parallel batch via `Promise.allSettled`.

```
queue = plan.tasks
while queue not empty and not cancelled:
  ready = tasks whose dependencies are all completed
  if ready is empty:
    if every remaining task depends on a failed task → state = failed
    else → state = paused   (awaiting approvals / external deps)
  batch = ready.slice(0, maxConcurrency)
  results = await Promise.allSettled(batch.map(executeTask))
  mark completed / failed
```

When more than one task runs in a batch, the engine emits a
`workflow.parallelized` telemetry event and records a `checkpoint` timeline
entry naming the parallelized task ids.

## Concurrency limiting

`maxConcurrency` is read from the `PolicySet` and clamped to a minimum of 1.
With the default policies it is `3`, so at most three tasks execute
concurrently; the rest stay queued until a slot frees up. Batching is purely
dependency and concurrency driven — no manual thread management is required.

## Approval pausing

When a task carries `approval.required: true`, the engine asks the
`IApprovalEngine` to create an `ApprovalRequest` **before** invoking the agent.
The workflow enters the `paused` state while the approval is pending.

In non-interactive (automation/test) mode the engine auto-approves so the flow
proceeds. In production you would resolve approvals through
`orchestrator.requestApproval(...)` / `approvals.approve(...)` and then call
`orchestrator.resumeWorkflow(workflowId)`.

Each approval emits two telemetry events: `approval.requested` and
`approval.completed`, plus matching timeline entries.

## Recovery with retry

Agent execution is wrapped in a try/catch. On failure the engine records a
`recovery_attempted` timeline entry and **retries the task once**. The retried
result has `retries: 1`. If the retry also fails, the task is recorded with
`status: 'failed'` and an `agent.failed` telemetry event is emitted. A failed
task whose dependents cannot proceed causes the workflow to transition to
`failed`; otherwise the workflow continues with the remaining tasks.

## Timeline tracking

Every significant transition is appended to the workflow timeline:

| Timeline type | When |
|---------------|------|
| `workflow_started` | Execution begins |
| `task_started` | An agent starts a task |
| `task_completed` | An agent completes a task |
| `task_failed` | A task fails permanently |
| `approval_requested` | An approval is requested |
| `approval_completed` | An approval is decided |
| `recovery_attempted` | A retry is attempted |
| `checkpoint` | Parallelization or resume checkpoint |
| `workflow_completed` | Workflow finishes successfully |
| `workflow_cancelled` | Workflow is cancelled |

Retrieve it with `orchestrator.getWorkflowTimeline(workflowId)`. You can also
snapshot progress with `orchestrator.getCheckpoint(workflowId)`, which returns
completed and pending task ids plus current results.

## Workflow states

```
pending → running ─┬─→ completed
                   ├─→ paused ──→ running (resume)
                   ├─→ failed ──→ running (resume)
                   └─→ cancelled
```

- **`paused`** — ready queue is empty but tasks remain (awaiting approvals).
- **`failed`** — one or more tasks failed and dependents are blocked.
- **`cancelled`** — `cancel(workflowId)` was called mid-execution.

`resume(workflowId)` re-enters `running` and continues from where the workflow
paused or failed.

## Telemetry events

| Event | Emitted by the execution engine |
|-------|--------------------------------|
| `planner.generated` | At the start of execution, carrying task count & cost |
| `workflow.parallelized` | When a batch of >1 tasks runs concurrently |
| `agent.started` | When an agent begins a task |
| `agent.completed` | When an agent completes a task (incl. recovered) |
| `agent.failed` | When a task fails permanently after retry |
| `approval.requested` | When an approval is requested |
| `approval.completed` | When an approval is decided |
| `workflow.completed` | When the whole workflow succeeds |

Query events with `orchestrator.telemetry.getEvents()`,
`getEventsByType(type)`, or `getEventsByAgent(agentId)`.

## Code example

```typescript
import {
  MultiAgentOrchestrator,
  createDefaultPolicies,
  MockAgentExecutor,
} from '@compilerai/multi-agent';

const orchestrator = new MultiAgentOrchestrator({
  organizationId: 'org-1',
  policies: createDefaultPolicies(),
  executor: new MockAgentExecutor(),
});

const result = await orchestrator.executeWorkflow('Deploy to production');

console.log(result.state);            // 'completed'
console.log(result.success);          // true
console.log(result.results.length);   // 3
console.log(result.totalCost);
console.log(result.timeline.length);  // full lifecycle entries

// Inspect telemetry
const started = orchestrator.telemetry.getEventsByType('agent.started');
console.log(started.length);

// Cancel a running workflow
// (in practice you would hold the promise and cancel concurrently)
const plan = orchestrator.generatePlan('Deploy to production');
console.log(orchestrator.getExecutionStatus(plan.id));

// Snapshot progress
const checkpoint = orchestrator.getCheckpoint(plan.id);
console.log(checkpoint?.completedTaskIds);
```

## See also

- [Approvals](approvals.md) — the approval lifecycle in detail.
- [Simulation](simulation.md) — dry-run a plan before executing.
- [Planner](planner.md) — how an `ExecutionPlan` is produced.
