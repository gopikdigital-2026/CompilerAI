# Data Retention

## Policies

| Table | Retention | Field | Hard Delete |
|-------|-----------|-------|-------------|
| telemetry_events | 30 days | created_at | yes |
| execution_traces | 30 days | created_at | yes |
| idempotency_records | 1 day | expires_at | yes |
| outbox_events | 7 days | created_at | yes |
| workflow_step_executions | 90 days | created_at | no |
| runtime_executions | 180 days | created_at | no |
| tool_executions | 90 days | created_at | yes |
| audit_logs | no default | — | — |

## ExpiredDataCleaner

Takes a list of policies and a cleanup function. The cleanup function receives `(tableName, cleanupField, cutoffDate, hardDelete)` and returns the number of deleted rows.

```typescript
const cleaner = new ExpiredDataCleaner(DEFAULT_RETENTION_POLICIES, async (table, field, cutoff, hard) => {
  // Execute DELETE FROM table WHERE field < cutoff
  return deletedCount;
});
const results = await cleaner.runAll();
```

## RetentionJob

Wraps the cleaner with a periodic scheduler:

```typescript
const job = new RetentionJob(cleaner, 24 * 60 * 60 * 1000); // daily
job.start();
// or run once:
const results = await job.runOnce();
```

## Audit Logs

Audit logs have no default retention policy — they require an explicit organizational policy due to compliance requirements.
