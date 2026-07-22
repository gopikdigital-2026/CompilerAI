# Architecture Overview

CompilerAI is a modular, layered platform for AI-powered business workflow compilation and execution.

## Layers

```
┌──────────────────────────────────────────┐
│           Frontend (React)               │
├──────────────────────────────────────────┤
│         Platform API (HTTP)              │
│  Routes, Controllers, DTOs, Auth         │
├──────────────────────────────────────────┤
│         Identity Layer                   │
│  Auth, RBAC, Orgs, Users, API Keys       │
├──────────────────────────────────────────┤
│         Bootstrap (Composition Root)     │
│  ApplicationContainer, DependencyRegistry│
├──────────────────────────────────────────┤
│         Compiler Runtime                 │
│  Coordinator, Workflow, Approvals        │
├──────────────────────────────────────────┤
│     Intelligence Pipeline (Orchestrator) │
│  Context → Intent → Planning → Decision  │
│  → Confidence                            │
├──────────────────────────────────────────┤
│    Cross-cutting Engines                 │
│  Telemetry, Memory, Tools, Execution,    │
│  Learning                                │
├──────────────────────────────────────────┤
│    Shared Contracts                      │
│  IdGenerator, Clock, DomainError,        │
│  EventPublisher, Repository              │
├──────────────────────────────────────────┤
│    Infrastructure                        │
│  DB, Cache, Queue, Locks, Outbox,        │
│  Secrets, Health, Audit                  │
└──────────────────────────────────────────┘
```

## Key Design Principles

1. **Interface-driven** — Every module exposes interfaces, not concrete classes
2. **Dependency injection** — Bootstrap layer wires all dependencies
3. **Domain decoupled** — Intelligence engines have no knowledge of HTTP, DB, or auth
4. **Multitenant** — All resources scoped by organizationId
5. **Deterministic testing** — Deterministic clock + IDs via `createTestApplication()`
6. **Fire-and-forget side effects** — Memory, tools, execution, learning don't block the pipeline
7. **No secrets in logs** — `sanitizeLogMessage()` redacts sensitive data
