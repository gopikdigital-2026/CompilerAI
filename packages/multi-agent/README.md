# @compilerai/multi-agent

**Version 2.0.0** · Enterprise Multi-Agent Orchestrator

The Multi-Agent Orchestrator is an Enterprise AI Team in which ten specialized
agents — CEO, Sales, Finance, Support, Developer, DevOps, Marketing, Document,
Research, and Compliance — collaborate like a human team to resolve complete
business processes end to end. Given a natural-language request in English or
Spanish, an intelligent planner decomposes it into a dependency-ordered
execution plan, the execution engine runs tasks in parallel with concurrency
limits, agents share context through a memory bus and communicate over a
publish/subscribe bus, risky actions pause for human approval, and a Digital
Twin simulator lets you dry-run any plan to predict conflicts and success
probability before executing for real.

## Key features

- **10 specialized agents** with declared capabilities, connectors, cost, and
  confidence — collaboratively selected per task.
- **Bilingual planner (EN/ES)** — rule-based pattern matching detects language
  and generates localized objectives and task names.
- **Parallel execution** — dependency-aware scheduling with Kahn's topological
  sort and configurable concurrency limiting.
- **Shared memory** — typed entries (context, document, variable, result,
  reference, decision) plus an auditable decision history.
- **Human approvals** — actions flagged as risky pause for approval with a 24 h
  default timeout and pending/approved/rejected/expired lifecycle.
- **Digital Twin simulation** — dry-run any plan to surface resource,
  dependency, policy, and approval conflicts with a success probability.
- **Policy enforcement** — cost, duration, authorized agents/connectors,
  restricted operations, execution windows, and approval-for rules.
- **Telemetry** — nine queryable event types covering the full lifecycle.
- **Analytics** — per-agent metrics and aggregate workflow analytics.
- **Port-and-adapter architecture** — every integration (`IAgentExecutor`,
  `ISharedMemory`, `ICommunicationBus`) is an interface, fully mockable.

## Quick start

```typescript
import { MultiAgentOrchestrator, createDefaultPolicies, MockAgentExecutor } from '@compilerai/multi-agent';

const orchestrator = new MultiAgentOrchestrator({
  organizationId: 'org-1',
  policies: createDefaultPolicies(),
  executor: new MockAgentExecutor(),
});

const result = await orchestrator.executeWorkflow('Manage all critical incidents received today');
console.log(result.state, result.results.length);

const simulation = orchestrator.simulateWorkflow('Deploy to production');
console.log(simulation.success, simulation.overallSuccessProbability);
```

## Module overview

| # | Module | Description |
|---|--------|-------------|
| 1 | `agents` | Declarations for all 10 built-in agents plus a `MockAgentExecutor`. |
| 2 | `analytics` | Aggregates per-agent metrics and workflow-level analytics. |
| 3 | `approvals` | Human-in-the-loop approval engine with 24 h timeout and lifecycle. |
| 4 | `communication` | Publish/subscribe message bus for inter-agent communication. |
| 5 | `execution` | Parallel/sequential execution with recovery, checkpoints, and timeline. |
| 6 | `memory` | Shared memory store: context, documents, variables, results, decisions. |
| 7 | `orchestrator` | Top-level facade wiring every subsystem behind a clean public API. |
| 8 | `planner` | Bilingual (EN/ES) rule-based planner generating dependency-ordered plans. |
| 9 | `policies` | Policy engine validating cost, duration, agents, connectors, operations. |
| 10 | `registry` | Agent registration, lookup, and best-agent selection algorithm. |
| 11 | `scheduling` | Task scheduling slots and execution-window enforcement. |
| 12 | `simulation` | Digital Twin Simulator with conflict detection and probability scoring. |
| 13 | `telemetry` | Queryable event sink emitting nine lifecycle event types. |

## Stats

| Metric | Value |
|--------|-------|
| Source files | 14 |
| Test files | 10 |
| Tests | 128 |
| Line coverage | 98.56% |
| Agents | 10 |
| Modules | 13 |

## Documentation

- [Architecture](docs/architecture.md) — system diagram, modules, ports & adapters.
- [Agents](docs/agents.md) — the 10 agents, selection algorithm, custom registration.
- [Planner](docs/planner.md) — bilingual pattern matching and plan structure.
- [Execution](docs/execution.md) — parallel scheduling, approvals, recovery, telemetry.
- [Simulation](docs/simulation.md) — Digital Twin conflict types and probability.
- [Approvals](docs/approvals.md) — approval lifecycle and actions requiring approval.
- [Examples](docs/examples.md) — 14 complete runnable code examples.
- [Validation Report](VALIDATION_REPORT.md) — full build, test, and coverage results.

## License

Proprietary © CompilerAI. All rights reserved.
