# Scheduler

## Overview

The `AgentScheduler` selects which agent should handle a given task. It is replaceable via the `IScheduler` interface, allowing custom scheduling policies without modifying the runtime.

## Interface

```typescript
interface IScheduler {
  selectAgent(task: AgentTask, candidates: Agent[]): Agent | null;
  getPolicy(): SchedulerPolicy;
  setPolicy(policy: SchedulerPolicy): void;
}
```

## Built-in Policies

### capability_based (default)

Selects the agent whose capabilities best match the task's required capabilities. Scoring:
- Score = (matching capabilities / total required capabilities)
- Ties broken by lowest load

```typescript
runtime.setSchedulerPolicy('capability_based');
```

### priority

Selects the highest-priority agent. Priority weights:
- `critical`: 5, `high`: 4, `normal`: 3, `low`: 2, `background`: 1
- Ties broken by lowest load

```typescript
runtime.setSchedulerPolicy('priority');
```

### round_robin

Cycles through available agents in order. Maintains an internal index that increments on each selection.

```typescript
runtime.setSchedulerPolicy('round_robin');
```

### least_loaded

Selects the agent with the lowest `load` value (fewest active assignments).

```typescript
runtime.setSchedulerPolicy('least_loaded');
```

## Custom Scheduler

Implement the `IScheduler` interface and inject it:

```typescript
class CustomScheduler implements IScheduler {
  selectAgent(task: AgentTask, candidates: Agent[]): Agent | null {
    // Custom logic
  }
  getPolicy(): SchedulerPolicy { return 'capability_based'; }
  setPolicy(_p: SchedulerPolicy): void { /* no-op */ }
}
```

## Selection Process

1. Filter candidates to `idle` agents only
2. Apply the configured policy to select one agent
3. If no agent matches, return `null` (task will be queued or fail)
4. For `capability_based`, if no agent has any matching capability, a `SchedulerError` is thrown

## Eligibility

Before scheduling, the dispatcher also checks:
- Agent is `idle` (not already running a task)
- Agent belongs to the same `organizationId` as the task
- Agent is healthy (via `AgentHealthMonitor`)
- Agent has required permissions (via `AgentPolicyEngine`)
