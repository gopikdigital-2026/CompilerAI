# System Context

## External Actors

| Actor | Interaction | Auth Method |
|-------|-------------|-------------|
| End User | Browser SPA → Platform API | JWT (email/password) |
| API Client | Programmatic → Platform API | API Key (X-API-Key header) |
| Admin | Browser SPA → Platform API | JWT + PLATFORM_ADMIN role |
| External Tool | Execution Engine → Tool API | Tool-specific credentials |

## System Boundaries

```
                    ┌─────────────────┐
 End User ────────→ │   Frontend SPA  │
                    │  (React/Vite)   │
                    └────────┬────────┘
                             │ HTTPS
                    ┌────────▼────────┐
                    │  Platform API   │
                    │  (InMemory HTTP)│
                    └────────┬────────┘
                             │
           ┌─────────────────┼─────────────────┐
           │                 │                 │
  ┌────────▼───────┐ ┌──────▼──────┐ ┌───────▼───────┐
  │ Identity Layer │ │  Runtime    │ │ Infrastructure│
  │ (Auth, RBAC)   │ │ (Compiler)  │ │ (Supabase)    │
  └────────────────┘ └──────┬──────┘ └───────────────┘
                            │
               ┌────────────┼────────────┐
               │            │            │
    ┌──────────▼──┐ ┌──────▼─────┐ ┌────▼─────┐
    │ Intelligence│ │ Telemetry  │ │ Memory   │
    │ Pipeline    │ │ Engine     │ │ Engine   │
    └─────────────┘ └────────────┘ └──────────┘
```

## Data Stores

| Store | Technology | Purpose |
|-------|-----------|---------|
| Primary DB | Supabase (Postgres) | Orgs, users, roles, workflows, executions, approvals, memory, telemetry |
| Cache | In-memory (Map) | Session cache, rate limiting, idempotency |
| Event Store | In-memory (array) | Runtime events, telemetry events |
| File Storage | Supabase Storage | Logos, attachments (via StorageProvider) |
