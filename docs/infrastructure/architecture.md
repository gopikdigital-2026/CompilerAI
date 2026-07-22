# Infrastructure Layer Architecture

## Overview

The infrastructure layer (`src/infrastructure/`) provides persistence, reliability, and operational concerns for the compiler platform. It sits below the domain layer and above the database/external services.

## Layered Design

```
┌─────────────────────────────────────────┐
│           Domain / Compiler             │
│    (runtime, intelligence, workflows)   │
├─────────────────────────────────────────┤
│         Infrastructure Layer            │
│  ┌───────────┐  ┌───────────┐          │
│  │ Repositories │  │  Outbox   │          │
│  │ (async)   │  │  Queue    │          │
│  ├───────────┤  ├───────────┤          │
│  │  Locks    │  │  Cache    │          │
│  ├───────────┤  ├───────────┤          │
│  │ Secrets   │  │  Audit    │          │
│  ├───────────┤  ├───────────┤          │
│  │ Health    │  │ Retention │          │
│  └───────────┘  └───────────┘          │
├─────────────────────────────────────────┤
│        Database (Supabase/PG)           │
└─────────────────────────────────────────┘
```

## Key Principles

1. **No direct domain→DB coupling** — Domain code uses async repository interfaces; Postgres adapters implement them.
2. **In-memory implementations preserved** — All components have in-memory implementations for testing and local development.
3. **Multitenancy everywhere** — Every table, cache key, and lock is scoped by `organization_id`.
4. **Safe by default** — RLS on all tables, secrets never logged, audit log is append-only.

## Module Index

| Module | Path | Purpose |
|--------|------|---------|
| Errors | `errors/InfrastructureErrors.ts` | 10 typed error classes + safe message mapping |
| Config | `config/ApplicationConfig.ts` | Typed config from env, fail-fast validation |
| Database | `database/DatabaseClient.ts` | `IDatabaseClient` abstraction over Supabase |
| Schemas | `database/schemas/SchemaTypes.ts` | Row type interfaces for 17 tables |
| Mappers | `database/mappers/DomainMappers.ts` | Domain ↔ row conversion (8 mappers) |
| Repositories | `database/repositories/PostgresRepositories.ts` | 10 Postgres repository adapters |
| Transactions | `database/transaction/TransactionManager.ts` | Unit-of-work, `ITransactionManager` |
| Outbox | `events/OutboxManager.ts` | Transactional outbox with 5-state machine |
| Queue | `queue/JobQueue.ts` | Job queue with 7 job types, timeout, retry |
| Locks | `locks/DistributedLocks.ts` | Distributed locks with TTL, renewal, `LockHelper` |
| Cache | `cache/CacheManager.ts` | Tenant-scoped cache, LRU eviction, `CacheKeyBuilder` |
| Secrets | `secrets/SecretManager.ts` | `ISecretProvider`, env + in-memory providers |
| Storage | `storage/StorageProvider.ts` | `IStorageProvider` for future blob storage |
| Audit | `observability/AuditLog.ts` | Append-only audit log, `AuditLogger` |
| Metrics | `observability/InfrastructureMetrics.ts` | Metrics collector, log sanitizer |
| Retention | `observability/DataRetention.ts` | 7 retention policies, `ExpiredDataCleaner` |
| Health | `health/HealthChecks.ts` | 5 health checks + `CompositeHealthCheck` |
