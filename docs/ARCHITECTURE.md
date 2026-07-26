# Architecture — CompilerAI Enterprise v1.0 RC1

CompilerAI Enterprise is a modular, layered AI orchestration platform built as an npm workspace monorepo. This document describes the high-level architecture, the 16 backend packages, the integration flow, the technology stack, and the design principles that govern the codebase.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend (Vite + React 18)                  │
│  SPA with Tailwind CSS, AuthContext, LanguageContext, Dashboard │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTPS (REST /api/v1)
┌───────────────────────────▼─────────────────────────────────────┐
│                     Platform API (HTTP)                         │
│  Routes · Controllers · DTOs · Auth · Rate Limit · Idempotency  │
├─────────────────────────────────────────────────────────────────┤
│                     Identity Layer                              │
│  Auth (JWT/API Key) · RBAC (6 roles, 18 perms) · Orgs · Users   │
├─────────────────────────────────────────────────────────────────┤
│               Bootstrap (Composition Root)                      │
│  ApplicationContainer · DependencyRegistry · DI wiring          │
├─────────────────────────────────────────────────────────────────┤
│                  Compiler Runtime                               │
│  RuntimeCoordinator · WorkflowEngine · Approvals · Checkpoints  │
├─────────────────────────────────────────────────────────────────┤
│             Intelligence Pipeline                               │
│  Context → Intent → Planning → Decision → Confidence            │
├─────────────────────────────────────────────────────────────────┤
│           Cross-cutting Engines                                 │
│  Telemetry · Memory · Tools · Execution · Learning              │
├─────────────────────────────────────────────────────────────────┤
│              Shared Contracts                                   │
│  IdGenerator · Clock · DomainError · EventPublisher · IRepository│
├─────────────────────────────────────────────────────────────────┤
│              Infrastructure                                     │
│  Supabase DB · Cache · Queue · Outbox · Secrets · Audit · Health│
└─────────────────────────────────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│              16 Backend Packages (npm workspaces)               │
└─────────────────────────────────────────────────────────────────┘
```

The frontend is a React SPA that communicates with the Platform API over REST. The Platform API is framework-agnostic (the in-memory `InMemoryHttpAdapter` is used for tests; production adapters for Express/Fastify/Hono can be plugged in without touching domain code). All data flows through Supabase (Postgres with RLS, Auth, and Edge Functions).

---

## Package Inventory

The monorepo contains 16 workspace packages, all scoped under `@compilerai/`. Each package is self-contained with its own `package.json`, `tsconfig.json`, `eslint.config.js`, `src/`, and `tests/`.

| # | Package | Version | Description | Test Files |
|---|---------|---------|-------------|------------|
| 1 | `@compilerai/agent-runtime` | 1.0.0 | Distributed agent runtime — coordinated multi-agent execution for enterprise workflows | 10 |
| 2 | `@compilerai/automation-studio` | 1.0.0 | Visual workflow designer, simulator, and publisher | 14 |
| 3 | `@compilerai/cli` | 1.0.0 | Official CLI — intelligent business workflow compilation from the terminal | 4 |
| 4 | `@compilerai/connectors` | 1.0.0 | Single integration point between CompilerAI and external services (GitHub, Google, Slack, Jira, Notion, Salesforce, HubSpot, Microsoft 365) | 39 |
| 5 | `@compilerai/copilot` | 1.0.0 | AI workflow copilot — transforms natural language into executable workflows | 9 |
| 6 | `@compilerai/dashboard` | 1.0.0 | Observability dashboard — real-time monitoring, analysis, and debugging | 5 |
| 7 | `@compilerai/enterprise-rag` | 1.0.0 | Enterprise RAG engine — contextual knowledge retrieval from the knowledge graph | 10 |
| 8 | `@compilerai/identity-platform` | 2.0.0 | Enterprise multi-tenant IAM — authentication, authorization, organizations, users | 9 |
| 9 | `@compilerai/knowledge-graph` | 1.0.0 | Enterprise knowledge graph — persistent memory shared across all agents | 9 |
| 10 | `@compilerai/marketplace` | 1.0.0 | Tool marketplace — register, validate, discover, install, update, and manage tools | 9 |
| 11 | `@compilerai/multi-agent` | 2.0.0 | Multi-agent orchestrator v2.0 — enterprise AI teams that collaborate on complex tasks | 11 |
| 12 | `@compilerai/sdk-typescript` | 1.0.0 | Official TypeScript SDK for the CompilerAI Platform API | 4 |
| 13 | `@compilerai/security-governance` | 1.0.0 | Enterprise security, identity & governance — auth, RBAC, audit, secrets | 9 |
| 14 | `@compilerai/skills-marketplace` | 1.0.0 | AI skills marketplace — register, install, update, and execute reusable skills | 9 |
| 15 | `@compilerai/observability` | 1.0.0 | Enterprise observability, monitoring & AIOps — metrics, tracing, logging, health, alerts | 9 |
| 16 | `@compilerai/resilience` | 1.0.0 | Enterprise resilience, HA & disaster recovery — circuit breakers, retry, failover, backups | 9 |

**Totals:** 16 packages · 169 test files · 2,134 tests · 388 package source files · 0 circular dependencies.

---

## Integration Flow

The 16 packages form a directed dependency graph with no cycles. Data and control flow through the system in this order:

```
Connectors → Automation Studio → Workflow Copilot → Multi-Agent
                                                          │
                     ┌────────────────────────────────────┘
                     ▼
              Knowledge Graph ←→ Enterprise RAG
                     │                    │
                     └────────┬───────────┘
                              ▼
                    Skills Marketplace
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
         Security       Observability     Resilience
       (Governance)      (AIOps)       (HA & DR)
              │               │               │
              └───────────────┼───────────────┘
                              ▼
                    Agent Runtime (execution)
                              │
                              ▼
                    Platform API (REST /api/v1)
                              │
                              ▼
                    SDK / CLI / Dashboard (clients)
```

1. **Connectors** provide the single integration point to external services (GitHub, Slack, Jira, etc.). They normalize external APIs into a uniform capability model.
2. **Automation Studio** lets users visually design, simulate, and publish workflows using nodes and edges.
3. **Workflow Copilot** transforms natural-language instructions into structured workflow definitions.
4. **Multi-Agent** orchestrates teams of specialized AI agents that collaborate on complex tasks.
5. **Knowledge Graph** stores persistent memory that all agents share across sessions.
6. **Enterprise RAG** retrieves contextual knowledge from the knowledge graph for augmented generation.
7. **Skills Marketplace** registers, installs, updates, and executes reusable AI skills in a sandbox.
8. **Security & Governance** enforces authentication, RBAC, and audit logging across every layer.
9. **Observability** collects metrics, traces, logs, health checks, and alerts with AIOps anomaly detection.
10. **Resilience** provides circuit breakers, retry engines, failover, replication, and disaster recovery.

---

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Language | TypeScript | 5.6 |
| Frontend framework | React | 18.3 |
| Build tool | Vite | 5.4 |
| CSS framework | Tailwind CSS | 3.4 |
| Backend (BaaS) | Supabase | 2.57 (client SDK) |
| Database | PostgreSQL (via Supabase) | 15 |
| Runtime | Node.js | 22 |
| Package manager | npm (workspaces) | 10+ |
| Test runner (packages) | `node:test` + `node:assert/strict` | — |
| Test runner (root) | Vitest | 2.1 |
| Linter | ESLint (flat config) | 9.12 |
| TypeScript ESLint | typescript-eslint | 8.8 |
| Icons | lucide-react | 0.344 |

### Monorepo structure

```
compileraI/
├── packages/              # 16 workspace packages (each self-contained)
│   ├── agent-runtime/
│   ├── automation-studio/
│   ├── cli/               # depends on @compilerai/sdk-typescript
│   ├── connectors/
│   ├── copilot/
│   ├── dashboard/
│   ├── enterprise-rag/
│   ├── identity-platform/
│   ├── knowledge-graph/
│   ├── marketplace/
│   ├── multi-agent/
│   ├── sdk-typescript/    # build first — CLI depends on it
│   ├── security-governance/
│   ├── skills-marketplace/
│   ├── observability/
│   └── resilience/
├── src/                   # Root application (Vite + React SPA)
│   ├── compiler/          # Intelligence pipeline + runtime
│   ├── platform/          # Platform API + identity
│   ├── infrastructure/    # Supabase, cache, queue, outbox, secrets
│   ├── bootstrap/         # Composition root (DI wiring)
│   ├── shared/            # Canonical contracts
│   ├── pages/             # React pages
│   └── components/        # React components
├── scripts/               # Build, test, audit, validate, quality-gates
├── supabase/              # 11 SQL migrations
├── tests/                 # Cross-module regression tests
└── docs/                  # Architecture, identity, infrastructure, platform-api
```

---

## Design Principles

1. **Modular architecture** — Every concern is a separate, self-contained package with its own `package.json`, `tsconfig.json`, and `eslint.config.js`. Packages can be built, tested, and published independently.

2. **Public API enforcement** — Packages export only through their `index.ts` barrel file. No cross-package import may reference `/src/` or `/dist/` paths directly. The dependency audit script (`scripts/audit-deps.mjs`) detects and fails on any internal-path bypass violation.

3. **No circular dependencies** — The cross-package import graph is acyclic. The audit script performs a DFS cycle detection and the quality gate fails the build if any cycle is found. Current state: 0 circular dependencies across all 16 packages.

4. **Workspace-based monorepo** — A single `npm install` from the root installs all dependencies for the root app and all 16 packages via npm workspace hoisting. Internal dependencies use the workspace protocol (`"*"`), e.g. the CLI declares `"@compilerai/sdk-typescript": "*"`.

5. **Interface-driven design** — Every module exposes interfaces (`IHttpAdapter`, `IRepository<T>`, `IHealthMonitor`, `IFailoverManager`), not concrete classes. The bootstrap layer wires concrete implementations at runtime.

6. **Dependency injection** — The `ApplicationContainer` and `DependencyRegistry` in `src/bootstrap/` compose all dependencies. `createTestApplication()` provides a deterministic clock and ID generator for reproducible tests.

7. **Domain decoupling** — Intelligence engines have zero knowledge of HTTP, databases, or authentication. The domain layer is pure TypeScript with no framework coupling.

8. **Multitenant isolation** — All resources are scoped by `organizationId`. Row Level Security, repository-layer org scoping, service-layer org checks, and API-layer organization context middleware enforce isolation at every layer.

9. **Deterministic testing** — All 2,134 tests run entirely offline with no network dependencies. Package tests use `node:test` and `node:assert/strict`; the root app uses Vitest. Injected clocks and ID generators make tests reproducible.

10. **No secrets in logs** — The `StructuredLogger` automatically redacts 14 sensitive field types (`password`, `secret`, `token`, `apiKey`, `api_key`, `privateKey`, `private_key`, `credential`, `authorization`, `cookie`, `session`, `accessToken`, `access_token`, `refreshToken`, `refresh_token`) from every log entry.
