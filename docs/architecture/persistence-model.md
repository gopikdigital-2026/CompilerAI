# Persistence Model

## Database: Supabase (Postgres)

### Tables (by module)

| Table | Module | Org-scoped | RLS |
|-------|--------|-----------|-----|
| organizations | Identity | Self | Yes |
| profiles | Identity | Self | Yes |
| api_keys | Identity | Yes | Yes |
| roles | Identity | Yes (system roles: null) | Yes |
| permissions | Identity | No (static catalog) | Yes |
| role_permissions | Identity | Yes | Yes |
| user_roles | Identity | Yes | Yes |
| sessions | Identity | No (user-scoped) | Yes |
| invitations | Identity | Yes | Yes |
| login_attempts | Identity | No (user-scoped) | Yes |
| execution_runs | Runtime | Yes | Yes |
| workflow_definitions | Runtime | Yes | Yes |
| approval_requests | Runtime | Yes | Yes |
| checkpoints | Runtime | Yes | Yes |
| compiler_sessions | Compiler | Yes | Yes |
| cognitive_memory_entries | Memory | Yes | Yes |
| ai_brain_analyses | Brain | Yes | Yes |
| prompt_intelligence | Prompt | Yes | Yes |
| workflow_designs | Workflow | Yes | Yes |
| enterprise_metrics | Enterprise | Yes | Yes |

## Repository Pattern

```
IRepository<T> (shared/contracts)
    ├── IOrgScopedRepository<T> (adds findByOrganization)
    │     ├── InMemoryOrgScopedRepository<T> (base class)
    │     │     ├── InMemoryRuntimeRepository
    │     │     ├── InMemoryWorkflowRepository
    │     │     └── InMemoryApprovalRepository
    │     ├── InMemoryMemoryRepository
    │     ├── InMemoryLearningRepository
    │     └── PostgresRepositories (10 implementations)
    └── ICheckpointStore (specialized)
```

## Transaction Management

- `TransactionManager` / `UnitOfWork` pattern in infrastructure
- Optimistic versioning via `version` column
- No `BEGIN`/`COMMIT` in migrations (Supabase MCP handles)

## Outbox Pattern

- `OutboxManager` ensures events are persisted atomically with domain state
- `OutboxProcessor` processes events asynchronously
- At-least-once delivery; consumers must be idempotent

## Caching

- `CacheManager` provides TTL-based caching
- Used for: session validation, rate limiting, idempotency keys
- In-memory (Map) for testing, Redis-compatible interface for production

## Retention

- `DataRetention` policy engine
- Configurable per-table TTL
- Soft-delete pattern (status = DELETED, retained for audit)
