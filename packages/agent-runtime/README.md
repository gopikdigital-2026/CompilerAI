# @compilerai/agent-runtime

Distributed agent runtime for coordinated multi-agent execution in CompilerAI enterprise workflows.

## Overview

The Agent Runtime enables multiple specialized agents to collaborate on a single execution. Each agent declares its capabilities, permissions, cost, priority, and confidence level. The runtime handles scheduling, parallel execution, checkpointing, fault recovery, communication, and telemetry — all isolated by organization.

## Installation

```bash
npm install @compilerai/agent-runtime
```

## Quick Start

```typescript
import { AgentRuntime } from '@compilerai/agent-runtime';

const runtime = new AgentRuntime({
  idGenerator: () => crypto.randomUUID(),
  clock: () => new Date().toISOString(),
});

// Register specialized agents
runtime.registerAgent(researchProfile, 'org-123');
runtime.registerAgent(planningProfile, 'org-123');
runtime.registerAgent(executionProfile, 'org-123');

// Create a multi-task execution
const execution = runtime.createExecution({
  organizationId: 'org-123',
  triggeredBy: 'user-456',
  tasks: [
    { title: 'Research', requiredCapabilities: ['research'], ... },
    { title: 'Plan', requiredCapabilities: ['planning'], dependencies: ['task_1'], ... },
    { title: 'Execute', requiredCapabilities: ['execution'], dependencies: ['task_2'], ... },
  ],
  edges: [{ fromTaskId: 'task_1', toTaskId: 'task_2', type: 'data_flow' }],
});

// Run with a custom executor function
const result = await runtime.run(execution, async (agent, task, context) => {
  // Your agent logic here
  return { success: true, output: { ... }, ... };
});
```

## Core Services

| Service | Responsibility |
|---|---|
| `AgentRuntime` | Facade that wires all services together |
| `AgentRegistry` | Register, retrieve, and manage agents by organization |
| `AgentScheduler` | Select agents using pluggable policies (priority, round-robin, least-loaded, capability-based) |
| `AgentCoordinator` | Orchestrate execution lifecycle: plan → schedule → execute → checkpoint → aggregate |
| `AgentTaskDispatcher` | Dispatch tasks to agents, handle timeouts, manage parallel execution |
| `AgentCommunicationBus` | In-memory message bus with sanitization and typed subscriptions |
| `CapabilityRegistry` | Register and look up agent capabilities |
| `AgentHealthMonitor` | Track heartbeats, failures, and agent health states |
| `AgentLifecycleManager` | Manage agent state transitions with validation |
| `AgentCheckpointManager` | Save and retrieve execution checkpoints |
| `AgentRecoveryManager` | Recover failed agents, reassign tasks, compensate |
| `AgentPolicyEngine` | Validate permissions, capabilities, and organization isolation |

## Execution Flow

```
Request → Planner → Task Graph → Scheduler → Agent Selection →
Parallel Execution → Checkpoint → Result Aggregation →
Decision Validation → Telemetry → Persistence
```

## Scheduler Policies

The scheduler is replaceable via the `IScheduler` interface. Built-in policies:

- **capability_based** (default) — selects the agent with the most matching capabilities
- **priority** — selects the highest-priority agent
- **round_robin** — cycles through available agents
- **least_loaded** — selects the agent with the lowest load

Switch at runtime: `runtime.setSchedulerPolicy('round_robin')`

## Fault Tolerance

- **Retries**: Failed agents are retried up to `MAX_RECOVERY_ATTEMPTS` (2)
- **Timeouts**: Each task has a `timeoutMs`; timed-out tasks are marked and can be recovered
- **Checkpoints**: Intermediate state is saved after each task completion
- **Resume**: Execution can resume from the latest checkpoint
- **Compensation**: Completed tasks can be compensated if the execution fails
- **Isolation**: Defective agents are marked dead and excluded from scheduling

## Security

- All agents are isolated by `organizationId`
- Permissions are validated before task assignment
- Messages are sanitized — secrets (API keys, tokens) are redacted
- Dangerous permissions can be blocked via `blockedPermissions` config
- No secrets are transmitted between agents

See [docs/security.md](docs/security.md) for details.

## Integration Adapters

The runtime integrates with existing CompilerAI engines through adapter interfaces (no logic duplication):

- **Telemetry** — `ITelemetryAdapter` for event recording and stage metrics
- **Memory** — `IMemoryAdapter` for cross-agent shared state
- **Marketplace** — `IMarketplaceAdapter` for tool availability checks
- **Execution** — `IExecutionAdapter` for execution lifecycle notifications

All adapters have null implementations for standalone use.

## Documentation

- [Architecture](docs/architecture.md)
- [Scheduler](docs/scheduler.md)
- [Messaging](docs/messaging.md)
- [Recovery](docs/recovery.md)
- [Security](docs/security.md)
- [API Gaps](docs/api-gaps.md)

## Example

See `examples/three-agent-scenario.ts` for a complete scenario with ResearchAgent, PlanningAgent, and ExecutionAgent.

## Validation

```bash
npm run typecheck
npm run lint
npm test
npm run build
```
