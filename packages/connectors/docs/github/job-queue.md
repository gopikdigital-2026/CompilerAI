# Job Queue

## Overview

The sync job queue manages background synchronization tasks with priority,
retry, backoff, deduplication, and dead-letter handling.

## Components

### InMemoryGitHubSyncJobRepository

In-memory implementation of the job repository. Supports:

- **Priority-based dequeue**: Higher priority jobs are processed first
- **Deduplication**: Jobs with the same `dedupKey` are not enqueued if an
  active job already exists
- **Dead-letter tracking**: Jobs that exceed `maxAttempts` are moved to
  dead-letter state
- **Recovery**: All job state is queryable for recovery after restart

### GitHubSyncWorker

Polls the job queue and processes jobs via the sync engine.

- Configurable poll interval (default 1s)
- Exponential backoff on failure (1s → 2s → 4s → ... → 30s max)
- Concurrent job locking: prevents processing equivalent jobs simultaneously
- Dead-letter on max attempts exceeded

## Job Lifecycle

```
queued → running → completed
                  → failed (retry with backoff)
                  → dead_letter (after maxAttempts)
```

## Creating Jobs

```ts
import { createSyncJob } from '@compilerai/connectors';

const job = createSyncJob('org-1', 123, 'owner/repo', 'issues', {
  mode: 'incremental',
  priority: 5,
  maxAttempts: 3,
  maxPages: 10,
});
```

## Deduplication Key

```
{organizationId}:{installationId}:{repository}:{resourceType}
```

Jobs with the same dedup key are not enqueued while an active job exists.
After completion or dead-letter, a new job with the same key can be enqueued.

## Dead Letter

Jobs that fail `maxAttempts` times are moved to `dead_letter` state with the
sanitized last error. They can be inspected via `getDeadLetterJobs()`.
