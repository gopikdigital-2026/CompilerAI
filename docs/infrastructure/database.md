# Database Abstraction

## IDatabaseClient

The `IDatabaseClient` interface is the only database abstraction domain code sees. It wraps the Supabase JS client.

```typescript
interface IDatabaseClient {
  query<T>(sql: string, params?: unknown[]): Promise<IQueryResult<T>>;
  from(table: string): TableQueryBuilder;
  rpc<T>(fn: string, params?: Record<string, unknown>): Promise<IQueryResult<T>>;
  close(): Promise<void>;
}
```

## Query Builder

`TableQueryBuilder` provides a fluent chain: `select()`, `insert()`, `update()`, `delete()` → filter methods (`eq`, `neq`, `gt`, `lt`, `in`, `like`, etc.) → terminal methods (`single()`, `maybeSingle()`, or `then` for arrays).

## SupabaseDatabaseClient

The adapter creates a Supabase client with `persistSession: false` and `autoRefreshToken: false`. Error objects are normalized to `DatabaseError` with `code`, `message`, `details`, `hint`.

## Repository Pattern

Domain code uses async repository interfaces (`IAsyncRuntimeRepository`, `IAsyncWorkflowRepository`, etc.). Postgres adapters implement these using `IDatabaseClient`. In-memory implementations remain for testing.

## Mappers

8 mapper classes convert between domain models and database rows:
- `RuntimeExecutionMapper` — `RuntimeExecution` ↔ `runtime_executions`
- `WorkflowMapper` — `WorkflowDefinition` ↔ `workflows`
- `ApprovalMapper` — `ApprovalRequest` ↔ `approvals`
- `CheckpointMapper` — `RuntimeCheckpoint` ↔ `checkpoints`
- `TelemetryEventMapper` — `RuntimeEvent` ↔ `telemetry_events`
- `IdempotencyMapper` — `IdempotencyRecord` ↔ `idempotency_records`
- `OutboxEventMapper` — `OutboxEvent` ↔ `outbox_events`
- `AuditLogMapper` — `AuditLogEntry` ↔ `audit_logs`
