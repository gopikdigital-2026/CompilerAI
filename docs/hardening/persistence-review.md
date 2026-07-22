# Persistence Review

## Repository Interface Compliance

| Interface | In-Memory Impl | Postgres Impl | RLS | Multitenant | Transactions |
|-----------|---------------|---------------|-----|-------------|-------------|
| IRuntimeRepository | InMemoryRuntimeRepository | PostgresRuntimeRepository | Yes | Yes | Via TransactionManager |
| IWorkflowRepository | InMemoryWorkflowRepository | PostgresWorkflowRepository | Yes | Yes | Via TransactionManager |
| IApprovalRepository | InMemoryApprovalRepository | PostgresApprovalRepository | Yes | Yes | Via TransactionManager |
| ICheckpointStore | InMemoryCheckpointStore | PostgresCheckpointStore | Yes | Yes | Via TransactionManager |
| IMemoryRepository | InMemoryMemoryRepository | PostgresMemoryRepository | Yes | Yes | Via TransactionManager |
| ILearningRepository | InMemoryLearningRepository | (not implemented) | N/A | Yes | N/A |
| IOutboxRepository | InMemoryOutboxRepository | (not implemented) | N/A | Yes | N/A |
| Identity repos (8) | InMemoryRepositories | (via Supabase client) | Yes | Yes | Via Supabase |

## Findings

### Multitenancy (PASS)
- All tables have `organization_id` column
- RLS policies enforce org membership via `is_org_member()` helper
- `IOrgScopedRepository<T>` provides `findByOrganization(orgId)`
- Identity layer enforces org scoping in all services

### Transactions (PASS)
- `TransactionManager` / `UnitOfWork` pattern in infrastructure
- No `BEGIN`/`COMMIT` in migrations (Supabase MCP handles)
- `DO $$ ... END $$` blocks used for PL/pgSQL (allowed)

### Optimistic Versioning (PASS)
- `version` column on versioned tables (workflows, plans)
- `nextVersion()` utility for semver increments
- Checkpoint references specific workflow version

### Idempotency (PASS)
- `IdempotencyService` at API layer with `InMemoryIdempotencyRepository`
- Runtime layer: `idempotencyKey` field on `RuntimeRequest`
- `IdempotencyDuplicateError` on duplicate keys

### Outbox (PASS)
- `OutboxManager` persists events atomically with domain state
- `OutboxProcessor` processes asynchronously
- At-least-once delivery; consumers must be idempotent

### Locks (PASS)
- `DistributedLocks` in infrastructure
- Used for: concurrent execution prevention, resume token consumption

### Cache (PASS)
- `CacheManager` with TTL-based caching
- Used for: session validation, rate limiting

### Retention (PASS)
- `DataRetention` policy engine
- Configurable per-table TTL
- Soft-delete pattern

### Health Checks (PASS)
- `HealthChecks` module with 6 health checks
- Database, cache, queue, outbox, secrets, storage

## In-Memory Repositories (Maintained for Tests)

All in-memory repositories are maintained and used by:
- `createTestApplication()` in bootstrap
- All unit and integration tests
- E2E pipeline test

No external services are required for testing.

## Postgres Repositories

`PostgresRepositories.ts` (625 lines) implements 10 repository classes using `SupabaseDatabaseClient`. Domain mappers (`DomainMappers.ts`) convert between schema rows and domain entities.

### Schema Types

`SchemaTypes.ts` defines row types for all 13 tables matching the Supabase schema.

## Recommendations

1. **Implement Postgres repositories for Learning and Outbox** — currently in-memory only
2. **Add optimistic concurrency control** — `version` column check on update for all versioned entities
3. **Add connection pooling** — Supabase client handles this, but monitor pool exhaustion
4. **Add read replicas** — for telemetry queries that don't need write consistency
