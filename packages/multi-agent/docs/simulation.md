# Simulation — Digital Twin

The `DigitalTwinSimulator` is the orchestrator's "what-if" engine. Instead of
spending real agent cost and taking real actions, it executes a plan against a
virtual model of the team and predicts whether it will succeed, what it will
cost, how long it will take, and — critically — what **conflicts** would arise.
This lets operators validate plans before running them for real.

Call it through the orchestrator:

```typescript
const simulation = orchestrator.simulateWorkflow('Deploy to production');
```

## How it works

1. The orchestrator generates an `ExecutionPlan` for the request (same planner
   used for real execution).
2. The simulator walks each task, looks up the bound agent in the registry, and
   derives a per-task `successProbability` from the agent's declared
   `confidence`, the task's priority, and whether the task requires approval.
3. It checks for **conflicts** (see below) and attaches them to the task and to
   the overall result.
4. It aggregates per-task estimates into total cost, total duration, an overall
   success probability, and a human-readable `workflowTrace`.

## Conflict types (4)

| Conflict type | Description | Severity |
|---------------|-------------|----------|
| `resource_conflict` | Two tasks target the same agent and run in the same parallel batch, contending for the agent's capacity. | `warning` |
| `dependency_conflict` | A task depends on another task that is not scheduled to complete first, or a dependency is missing/unresolved. | `error` |
| `policy_violation` | A task or agent violates the active `PolicySet` (cost cap, unauthorized agent/connector, restricted operation, out-of-window execution). | `error` |
| `approval_blocked` | A task requires approval but the simulated approval cannot be granted, blocking downstream tasks. | `warning` |

Each `SimulationConflict` carries a `type`, `taskId`, human-readable
`description`, and a `severity` of `warning` or `error`.

## Success probability computation

The overall `overallSuccessProbability` is the product of per-task success
probabilities, reduced by the impact of any conflicts:

- Per-task probability starts from the agent's `confidence`, adjusted by task
  priority (`critical` tasks get a small boost; `low` tasks a small penalty)
  and an approval penalty for tasks that require approval.
- `error`-severity conflicts materially reduce the probability; `warning`
  conflicts apply a smaller reduction.
- The workflow `success` flag is `false` when any `error` conflict is present,
  otherwise `true` (a plan can succeed with only `warning` conflicts).

The result also reports `totalEstimatedCost` and `totalEstimatedDurationMs`
summed across tasks — useful for budgeting before you commit.

## SimulationResult structure

```typescript
interface SimulationResult {
  workflowId: string;
  success: boolean;
  overallSuccessProbability: number;
  totalEstimatedCost: number;
  totalEstimatedDurationMs: number;
  taskResults: SimulationTaskResult[];  // one per task
  conflicts: SimulationConflict[];      // all conflicts, flattened
  workflowTrace: string[];              // human-readable step trace
}
```

Each `SimulationTaskResult` contains `taskId`, `agentId`, `estimatedCost`,
`estimatedDurationMs`, `successProbability`, and that task's `conflicts`.

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

const simulation = orchestrator.simulateWorkflow('Deploy to production');

console.log(simulation.success);                    // true
console.log(simulation.overallSuccessProbability);  // e.g. 0.82
console.log(simulation.totalEstimatedCost);
console.log(simulation.totalEstimatedDurationMs);

for (const task of simulation.taskResults) {
  console.log(task.taskId, task.agentId, task.successProbability, task.conflicts.length);
}

for (const conflict of simulation.conflicts) {
  console.log(conflict.type, conflict.taskId, conflict.severity, conflict.description);
}

for (const line of simulation.workflowTrace) {
  console.log(line);
}
```

Because simulation never calls the real executor or approval engine, it is
free, instant, and safe to run as many times as you like.

## See also

- [Execution](execution.md) — run the plan for real after simulating.
- [Approvals](approvals.md) — the `approval_blocked` conflict source.
- [Architecture](architecture.md) — where the simulator fits in the system.
