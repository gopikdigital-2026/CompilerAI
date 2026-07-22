# Local Development

## Running Tests

```bash
# Infrastructure layer tests (85 tests)
npx vite-node src/infrastructure/tests/InfrastructureLayer.test.ts

# All tests
npm test

# Type checking
npm run typecheck

# Linting
npm run lint

# Build
npm run build
```

## In-Memory Implementations

All infrastructure components have in-memory implementations for local development and testing. No external services are required:

- `InMemoryOutboxRepository` — Outbox event store
- `InMemoryJobQueue` — Job queue
- `InMemoryLock` — Distributed locks
- `InMemoryCache` / `TenantScopedCache` — Cache
- `InMemorySecretProvider` — Secret provider
- `InMemoryStorageProvider` — File storage
- `InMemoryAuditLogRepository` — Audit log
- `InMemoryRepositories` (in compiler/runtime) — Domain repositories

## Configuration

```typescript
const config = ConfigLoader.load(process.env);
ConfigValidator.validateOrThrow(config);
```

For local development, all config values have sensible defaults. Only `database.url` is required for production (provided by Supabase in `.env`).

## Health Checks

```typescript
const composite = new CompositeHealthCheck([
  new DatabaseHealthCheck(async () => true),
  new QueueHealthCheck(() => queue.getPending().length),
  new CacheHealthCheck(() => cache.stats()),
  new SecretProviderHealthCheck(async () => provider.validate()),
  new OutboxHealthCheck(
    async () => repo.countByStatus('PENDING'),
    async () => repo.countByStatus('DEAD_LETTER'),
  ),
]);
const { overall, checks } = await composite.checkAll();
```
