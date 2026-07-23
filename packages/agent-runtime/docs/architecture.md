# Architecture

## Package Structure

```
packages/agent-runtime/
├── src/
│   ├── models/
│   │   └── AgentModels.ts           # Domain types (Agent, Task, Execution, etc.)
│   ├── errors/
│   │   └── AgentErrors.ts           # Typed errors + message sanitization
│   ├── integrations/
│   │   └── IntegrationAdapters.ts   # Telemetry, Memory, Marketplace, Execution adapters
│   ├── services/
│   │   ├── AgentRuntime.ts          # Facade — wires all services
│   │   ├── AgentRegistry.ts         # Agent registration and lookup
│   │   ├── CapabilityRegistry.ts    # Capability registration
│   │   ├── AgentScheduler.ts        # Pluggable scheduling policies
│   │   ├── AgentCommunicationBus.ts # In-memory message bus
│   │   ├── AgentHealthMonitor.ts    # Heartbeat, failure, health tracking
│   │   ├── AgentLifecycleManager.ts # State transition management
│   │   ├── AgentCheckpointManager.ts# Checkpoint save/retrieve
│   │   ├── AgentRecoveryManager.ts  # Fault recovery and compensation
│   │   ├── AgentPolicyEngine.ts     # Permission, capability, isolation validation
│   │   ├── AgentTaskDispatcher.ts   # Task dispatch with timeout
│   │   └── AgentCoordinator.ts      # Execution orchestration
│   └── index.ts                     # Public exports
├── tests/                           # 10 test files
├── examples/                        # Three-agent scenario
└── docs/                            # 6 documentation files
```

## Design Principles

### 1. Dependency Injection

All services receive dependencies via constructor injection. The `AgentRuntimeDeps` struct provides `idGenerator`, `clock`, and optional engine adapters. No service calls `Date.now()` or `crypto.randomUUID()` directly.

### 2. Interface Segregation

Every collaborator is defined by an `I*` interface. The `AgentRuntime` facade wires concrete implementations but exposes interfaces, enabling testing and customization.

### 3. Organization Isolation

All agent state is keyed by `organizationId`. The `AgentPolicyEngine` enforces cross-org checks. The `AgentRegistry.getByOrganization()` method scopes all lookups.

### 4. No Logic Duplication

The runtime does not re-implement telemetry, memory, marketplace, or execution logic. It consumes these through adapter interfaces (`ITelemetryAdapter`, `IMemoryAdapter`, `IMarketplaceAdapter`, `IExecutionAdapter`). Null implementations are provided for standalone use.

### 5. In-Memory Communication

The `AgentCommunicationBus` uses in-memory adapters only — no real sockets. Messages are sanitized before publication to prevent secret leakage.

### 6. Facade Pattern

`AgentRuntime` is the single entry point. It composes all sub-services and delegates. Public methods are thin coordinators.

## Execution Flow

```
                    ┌──────────────────────────┐
                    │     AgentRuntime          │
                    │  (facade — public API)    │
                    └──────────┬───────────────  ┘
                               │
                    ┌──────────▼───────────────┐
                    │   AgentCoordinator        │
                    │  (execution lifecycle)    │
                    └──────────┬───────────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         ▼                     ▼                     ▼
  AgentTaskDispatcher   CheckpointManager    RecoveryManager
         │                     │                     │
    ┌────┼────┐                │                ┌────┴────┐
    ▼    ▼    ▼                │                ▼         ▼
 Scheduler CommBus HealthMon   │            Registry  HealthMon
    │    │     │               │
    ▼    ▼     ▼               ▼
 Registry  PolicyEngine   Persistence
```

## Data Flow

1. **Request** → `createExecution()` builds an `AgentExecution` with a `TaskGraph`
2. **Planner** → Tasks are ordered by dependencies in the graph
3. **Scheduler** → Ready tasks (dependencies satisfied) are assigned agents via the configured policy
4. **Parallel Execution** → Independent tasks dispatch concurrently via `dispatchParallel()`
5. **Checkpoint** → After each task completes, state is checkpointed
6. **Result Aggregation** → Results are collected and stored in the execution
7. **Recovery** → Failed tasks trigger agent recovery or compensation
8. **Telemetry** → Events are emitted at each stage via the telemetry adapter
9. **Persistence** → Execution state and results are written to the memory adapter
