# Recovery

## Overview

The `AgentRecoveryManager` handles agent failures during execution. It provides recovery (reassigning tasks to healthy agents) and compensation (rolling back completed work).

## Recovery Process

When a task fails:

1. **Mark agent unhealthy** — The failed agent is marked `dead` in the `AgentHealthMonitor`
2. **Complete the failed task** — The agent's lifecycle transitions to `failed`
3. **Find replacement** — Search for idle agents in the same organization with matching capabilities
4. **Restore from checkpoint** — If a checkpoint exists, the replacement agent resumes from the saved intermediate state
5. **Reassign task** — The task is reset to `pending` and assigned to the replacement agent

### Max Recovery Attempts

Each task has a maximum of `MAX_RECOVERY_ATTEMPTS` (2) recovery tries. After this limit, the task is permanently marked as failed.

```typescript
recoveryManager.resetAttempts(taskId); // Reset for a specific task
recoveryManager.resetAttempts();        // Reset all
```

## Checkpoint-Based Resume

The `AgentCheckpointManager` saves checkpoints after each successful task completion. Each checkpoint contains:

- `executionId`, `taskId`, `agentId`
- `taskStatus` at checkpoint time
- `intermediateState` — arbitrary state data
- `sequenceNumber` — ordering within the execution

When recovering, the latest checkpoint for a task is retrieved and its `intermediateState` is merged into the task input, allowing the replacement agent to resume from where the failed agent left off.

## Compensation

If an execution fails after some tasks have completed, the `compensate()` method generates compensation records for each completed task:

```typescript
const compensationResults = recoveryManager.compensate(
  executionId,
  completedTaskIds,
  originalResults,
);
```

Each compensation result is a new `AgentResult` with:
- `taskId` suffixed with `_compensation`
- `output: { compensated: true, originalTaskId }`
- `success: true`

## Health States

| State | Condition |
|---|---|
| `healthy` | Default, no failures |
| `degraded` | 1 consecutive failure |
| `unhealthy` | 2 consecutive failures |
| `dead` | 3+ consecutive failures (or explicitly marked) |

Dead agents are excluded from scheduling. A heartbeat resets the failure counter and restores health.

## Coordinator Integration

The `AgentCoordinator` integrates recovery into the execution loop:

1. After each batch of dispatched tasks, check for failures
2. Attempt recovery for failed tasks
3. If recovery succeeds, re-queue the task
4. If recovery fails, mark the task as permanently failed
5. If any task is permanently failed, the execution status becomes `failed`

## Resume From Checkpoint

Executions can be resumed from the latest checkpoint:

```typescript
const result = await runtime.resume(executionId, organizationId, executor);
```

This loads the execution state from memory, finds the latest checkpoint, and re-enters the execution loop.
