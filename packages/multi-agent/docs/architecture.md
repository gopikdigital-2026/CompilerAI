# Architecture

The Multi-Agent Orchestrator is built as a set of collaborating, single-purpose
modules wired together by a top-level orchestrator facade. Every external
integration is expressed as a **port** (interface), and each concrete module is
an **adapter** implementing that port — the classic port-and-adapter
(hexagonal) pattern. This keeps the core domain logic isolated and makes every
subsystem mockable for testing.

## System diagram

```
                       ┌─────────────────────────────────────────────┐
                       │              User Request (EN/ES)            │
                       └───────────────────────┬─────────────────────┘
                                               │
                                               ▼
                       ┌─────────────────────────────────────────────┐
                       │            IntelligentPlanner                │
                       │  detect language → match pattern → plan     │
                       └───────────────────────┬─────────────────────┘
                                               │  ExecutionPlan
                                               ▼
                       ┌─────────────────────────────────────────────┐
                       │              AgentRegistry                   │
                       │  register / findBestAgent / list             │
                       └───────────────────────┬─────────────────────┘
                                               │  AgentDeclaration
                                               ▼
          ┌──────────────────────┐   ┌────────────────────────────────────────┐
          │     PolicyEngine     │◄──┤          ExecutionEngine                 │
          │  validatePlan/Agent  │   │  topological sort → parallel batches    │
          └──────────────────────┘   │  approval pause → retry recovery        │
                                     └───────────┬──────────────┬──────────────┘
                                                 │              │
                            ┌────────────────────┘              └───────────────────┐
                            ▼                                                      ▼
          ┌──────────────────────────────┐                      ┌──────────────────────────────┐
          │        IAgentExecutor        │                      │       IApprovalEngine         │
          │  (MockAgentExecutor / custom)│                      │   request/approve/reject      │
          └──────────────┬───────────────┘                      └──────────────────────────────┘
                         │ execute(agentId, task, memory)
                         ▼
          ┌──────────────────────────────────────────────────────────────────────┐
          │                              Agents (10)                              │
          │  ceo · sales · finance · support · developer · devops · marketing ·  │
          │  document · research · compliance                                    │
          └──────────────┬─────────────────────────────────┬────────────────────┘
                         │                                 │
                         ▼                                 ▼
          ┌──────────────────────────────┐   ┌──────────────────────────────┐
          │        ISharedMemory         │   │     ICommunicationBus        │
          │  set/get/list · decisions    │   │  publish/subscribe/broadcast │
          └──────────────────────────────┘   └──────────────────────────────┘
                         │
                         ▼
          ┌──────────────────────────────┐   ┌──────────────────────────────┐
          │      TelemetryEngine         │   │       AnalyticsEngine        │
          │  9 event types · queryable   │   │  agent metrics · workflow    │
          └──────────────────────────────┘   └──────────────────────────────┘
                         │
                         ▼
                       ┌─────────────────────────────────────────────┐
                       │              ExecutionResult                 │
                       │  state · results · timeline · cost · success│
                       └─────────────────────────────────────────────┘
```

## The 13 modules

| Module | Port / Role |
|--------|-------------|
| `agents` | Declarations for the 10 built-in agents and a `MockAgentExecutor` for tests and dry runs. |
| `analytics` | `IAnalyticsEngine` — records results and produces `AgentMetrics` and `WorkflowAnalytics`. |
| `approvals` | `IApprovalEngine` — manages the approval lifecycle with 24 h timeout and expiry. |
| `communication` | `ICommunicationBus` — publish/subscribe messaging between agents and the orchestrator. |
| `execution` | `IExecutionEngine` — runs plans with topological scheduling, recovery, and checkpoints. |
| `memory` | `ISharedMemory` — typed entries plus an auditable decision history. |
| `orchestrator` | `MultiAgentOrchestrator` — the facade exposing the 10-method public API. |
| `planner` | `IPlanner` — `IntelligentPlanner` turns a request into a dependency-ordered `ExecutionPlan`. |
| `policies` | `IPolicyEngine` — validates plans, agents, and operations against a `PolicySet`. |
| `registry` | `IAgentRegistry` — registers, unregisters, looks up, and selects agents. |
| `scheduling` | Task scheduling slots and execution-window enforcement helpers. |
| `simulation` | `ISimulationEngine` — `DigitalTwinSimulator` dry-runs plans and predicts conflicts. |
| `telemetry` | `ITelemetryEngine` — emits and indexes nine lifecycle event types. |

## Port-and-adapter pattern

The three integration-critical interfaces are declared as ports in `models.ts`:

- **`IAgentExecutor`** — `execute(agentId, task, memory): Promise<TaskResult>`.
  The orchestrator never calls agents directly; it delegates to the executor.
  Swap `MockAgentExecutor` for an LLM-backed or tool-backed executor without
  touching core logic.
- **`ISharedMemory`** — `set / get / list / recordDecision / getDecisionHistory`.
  The default in-memory adapter is `SharedMemory`; a durable store can implement
  the same interface.
- **`ICommunicationBus`** — `publish / subscribe / getMessages`. The default
  `CommunicationBus` is in-process pub/sub; a distributed transport can drop in.

Because the execution engine, planner, simulator, and orchestrator depend only
on these interfaces, the entire package is testable without any real agents,
network, or storage.

## Data flow

1. A user request enters `executeWorkflow(request)`.
2. The **planner** detects language, matches a pattern, and emits an
   `ExecutionPlan` with dependency-ordered `PlannedTask`s. Each task is bound to
   an agent selected by the **registry** via `findBestAgent`.
3. The **execution engine** schedules tasks using a topological sort. Tasks
   whose dependencies are satisfied run in parallel batches up to
   `maxConcurrency`. Parallelization emits a `workflow.parallelized` event.
4. Before a risky task runs, the **approval engine** creates a request. The
   workflow pauses until the approval is decided.
5. Each task is delegated to `IAgentExecutor.execute`. Results are written to
   **shared memory** and the **communication bus** carries request/response
   messages between orchestrator and agent.
6. Every state transition is recorded as a **timeline** entry and a **telemetry**
   event. On failure the engine retries once before recording a permanent
   failure.
7. The completed `ExecutionResult` is handed to **analytics** and returned to
   the caller.

## Design decisions

- **Interface-first integration.** All external touch points are ports, keeping
  the domain pure and fully mockable — hence the 98.56% coverage.
- **Dependency-ordered parallelism.** Kahn's topological sort respects
  `finish_to_start` dependencies while running independent tasks concurrently.
- **Human-in-the-loop by default.** Risky actions (payment, deployment,
  contract, campaign launch) pause for approval rather than executing silently.
- **Simulation before execution.** The Digital Twin lets operators predict
  conflicts and success probability without spending agent cost or taking risk.
- **Zero runtime dependencies.** The package ships only TypeScript; consumers
  provide the executor and adapters.
- **Bilingual by design.** Planner patterns and language detection handle
  English and Spanish natively, not as an afterthought.
