# System Overview — CompilerAI Enterprise v1.0 RC1

## What CompilerAI Enterprise Is

CompilerAI Enterprise is an enterprise-grade AI orchestration platform that translates natural language and visual designs into production-ready, multi-agent business workflows. It provides a unified environment for designing, executing, monitoring, and governing AI-driven processes across an organization — with built-in security, observability, resilience, and disaster recovery.

The platform is delivered as a Vite + React single-page application backed by Supabase (PostgreSQL, Auth, Edge Functions) and a monorepo of 16 independently-buildable TypeScript packages. It is currently at **Release Candidate 1** (v1.0.0-rc1), ready for private beta.

---

## Key Capabilities

### Multi-Agent Orchestration
The `@compilerai/multi-agent` package (v2.0) coordinates teams of specialized AI agents that collaborate on complex tasks. Agents communicate through a structured messaging protocol, share state via the knowledge graph, and are scheduled by the `@compilerai/agent-runtime` with support for parallel execution, cancellation, checkpointing, and failure recovery.

### Knowledge Graph
The `@compilerai/knowledge-graph` package provides persistent memory that all agents share across sessions and executions. It stores entities, relationships, and contextual facts that the RAG engine retrieves for augmented generation.

### Enterprise RAG
The `@compilerai/enterprise-rag` package retrieves contextual knowledge from the knowledge graph, ranking and filtering results to ground agent outputs in organizational data rather than generic model knowledge.

### Skills Marketplace
The `@compilerai/skills-marketplace` package lets organizations register, install, update, and execute reusable AI skills in a sandboxed environment. Skills are permission-scoped and telemetry-tracked.

### Security & Governance
The `@compilerai/security-governance` and `@compilerai/identity-platform` packages provide enterprise multi-tenant IAM: email/password and API key authentication, JWT sessions, RBAC with 6 system roles and 18 permissions, Row Level Security on every table, brute-force protection, append-only audit logging, and automatic sensitive-field redaction in logs.

### Observability & AIOps
The `@compilerai/observability` package provides a unified metrics engine (10 metric types), distributed tracing with parent-child span linking, structured JSON logging with automatic redaction, 8 pre-built health checks, an alert engine (7 alert types, 4 severities), an AIOps engine with 7 anomaly detection types, 8 dashboard types, and exporters for JSON, Prometheus, and OpenTelemetry.

### Resilience & Disaster Recovery
The `@compilerai/resilience` package provides circuit breakers (3-state: closed/open/half-open), a smart retry engine (3 backoff strategies with jitter), failover management (3 load-balancing strategies), replication (4 targets with conflict detection), backup & restore (full/incremental snapshots with integrity validation), chaos testing (6 scenario types), queue recovery (idempotent processing), and disaster recovery with configurable RPO/RTO.

---

## System Components and Their Roles

| Component | Package | Role |
|-----------|---------|------|
| Frontend SPA | Root app (`src/`) | React UI for workflow design, execution monitoring, dashboards |
| Platform API | `src/platform/api/` | REST API at `/api/v1` — controllers, DTOs, auth, rate limiting, idempotency |
| Identity & Access | `@compilerai/identity-platform` | Multi-tenant IAM — auth, RBAC, orgs, users, API keys, sessions |
| Security & Governance | `@compilerai/security-governance` | Audit logging, secret management, policy enforcement |
| Compiler Runtime | `src/compiler/runtime/` | Workflow execution engine, coordinator, scheduler |
| Intelligence Pipeline | `src/compiler/core/intelligence/` | Context → Intent → Planning → Decision → Confidence |
| Agent Runtime | `@compilerai/agent-runtime` | Distributed multi-agent execution with checkpointing |
| Multi-Agent Orchestrator | `@compilerai/multi-agent` | Collaborative AI agent teams |
| Automation Studio | `@compilerai/automation-studio` | Visual workflow designer and simulator |
| Workflow Copilot | `@compilerai/copilot` | Natural-language to workflow transformation |
| Connectors | `@compilerai/connectors` | External service integrations (GitHub, Slack, Jira, Notion, Google, Salesforce, HubSpot, Microsoft 365) |
| Knowledge Graph | `@compilerai/knowledge-graph` | Persistent shared memory for agents |
| Enterprise RAG | `@compilerai/enterprise-rag` | Contextual knowledge retrieval |
| Skills Marketplace | `@compilerai/skills-marketplace` | Reusable AI skill registration and execution |
| Tool Marketplace | `@compilerai/marketplace` | Tool registration, discovery, and management |
| Observability | `@compilerai/observability` | Metrics, tracing, logging, health, alerts, AIOps, dashboards |
| Resilience | `@compilerai/resilience` | Circuit breakers, retry, failover, replication, backup, DR |
| SDK | `@compilerai/sdk-typescript` | Official TypeScript client SDK for the Platform API |
| CLI | `@compilerai/cli` | Terminal-based workflow compilation |
| Dashboard | `@compilerai/dashboard` | Real-time monitoring and debugging UI |
| Infrastructure | `src/infrastructure/` | Supabase DB client, cache, queue, outbox, secrets, health |

---

## Target Users and Use Cases

### Target Users

| User | Primary Need |
|------|-------------|
| **Business analysts** | Design and simulate workflows visually without writing code |
| **Operations teams** | Monitor executions, manage approvals, troubleshoot failures |
| **Developers** | Extend the platform with custom connectors, skills, and tools |
| **AI/ML engineers** | Configure multi-agent teams and RAG pipelines |
| **Security administrators** | Manage roles, API keys, audit logs, and compliance |
| **Platform SREs** | Ensure availability, manage failover, and execute disaster recovery |

### Use Cases

- **Automated sales analysis** — A workflow ingests CRM data via the Salesforce connector, analyzes it with a multi-agent team, generates recommendations, and requires manager approval before publishing.
- **Intelligent ticket triage** — Incoming support tickets are classified by the copilot, routed by the multi-agent orchestrator, and escalated via the Jira connector with human-in-the-loop approval gates.
- **Knowledge-grounded Q&A** — Employees ask questions; the RAG engine retrieves context from the knowledge graph, and a multi-agent team synthesizes an answer with citations.
- **Compliance auditing** — Every workflow execution, approval decision, API key creation, and permission change is recorded in the append-only audit log for regulatory review.

---

## Architecture Diagram

```
                         ┌──────────────────────────┐
                         │     Users / Clients       │
                         │  Browser · CLI · SDK · API│
                         └─────────────┬────────────┘
                                       │
                    ┌──────────────────▼──────────────────┐
                    │         Frontend (React SPA)        │
                    │   Vite 5 · Tailwind 3 · AuthContext │
                    └──────────────────┬──────────────────┘
                                       │ REST /api/v1
                    ┌──────────────────▼──────────────────┐
                    │          Platform API               │
                    │  Controllers · DTOs · Rate Limit    │
                    │  Auth Middleware · Idempotency      │
                    └──────────────────┬──────────────────┘
                                       │
          ┌────────────────────────────┼────────────────────────────┐
          │                            │                            │
┌─────────▼─────────┐     ┌───────────▼───────────┐    ┌───────────▼──────────┐
│   Identity &       │     │   Compiler Runtime    │    │   Connectors         │
│   Security          │     │   Workflow Engine     │    │   GitHub · Slack     │
│   RBAC · Audit      │     │   Approvals · Checkp. │    │   Jira · Notion ...  │
└─────────┬─────────┘     └───────────┬───────────┘    └───────────┬──────────┘
          │                            │                            │
          │              ┌─────────────▼─────────────┐             │
          │              │    Intelligence Pipeline   │             │
          │              │  Context→Intent→Planning   │             │
          │              │  →Decision→Confidence      │             │
          │              └─────────────┬─────────────┘             │
          │                            │                            │
┌─────────▼────────────────────────────▼────────────────────────────▼──────┐
│                        Cross-Cutting Engines                               │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐     │
│  │ Multi-Agent  │ │ Knowledge    │ │ Enterprise   │ │ Skills       │     │
│  │ Orchestrator │ │ Graph        │ │ RAG          │ │ Marketplace  │     │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘     │
│  ┌──────────────┐ ┌──────────────┐                                 │     │
│  │ Observability│ │ Resilience   │                                 │     │
│  │ & AIOps      │ │ & DR         │                                 │     │
│  └──────────────┘ └──────────────┘                                 │     │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │       Infrastructure        │
                    │  Supabase (Postgres + Auth) │
                    │  Cache · Queue · Outbox     │
                    │  Secrets · Audit · Health   │
                    └─────────────────────────────┘
```

All 16 backend packages plug into the cross-cutting engines layer. The infrastructure layer persists everything to Supabase PostgreSQL with Row Level Security enforcing multi-tenant isolation on every table.
