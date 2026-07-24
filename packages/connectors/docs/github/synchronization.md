# Synchronization

## Overview

The sync engine incrementally synchronizes GitHub entities (repositories, issues,
pull requests, workflow runs) into local stores. It supports checkpoints for
resumption, cancellation, and deduplication.

## Architecture

```
GitHubSyncEngine.sync(request)
  ↓
Load checkpoint (if incremental)
  ↓
Execute GitHub operations via ConnectorRuntime
  ↓
Paginate through results
  ↓
Upsert entities into sync stores
  ↓
Save checkpoint after each page
  ↓
Emit telemetry events
```

## Sync Modes

### Full Sync

Fetches all entities regardless of modification time. Used for initial sync
or when `mode: 'full'` is specified.

### Incremental Sync

Fetches only entities modified since the last checkpoint's `lastUpdatedAt`
timestamp. Uses the `since` parameter on GitHub API calls.

## Checkpoints

Checkpoints are saved after each page of results:

```ts
interface GitHubSyncCheckpoint {
  resourceType: 'repositories' | 'issues' | 'pull_requests' | 'workflow_runs';
  cursor: string | null;      // last entity ID
  lastUpdatedAt: string | null; // ISO timestamp
  page: number;
  processedItems: number;
}
```

Checkpoints allow:
- **Resumption**: Resume from the last saved page after interruption
- **Cancellation**: Save checkpoint on cancel, resume later
- **Incremental sync**: Use `lastUpdatedAt` as the `since` parameter

## Sync States

```
PENDING → RUNNING → COMPLETED
                → FAILED
                → CANCELLED
                → PAUSED
```

## Cancellation

Call `engine.cancel(syncId)` to abort an active sync. The engine saves a
checkpoint before returning the `CANCELLED` state.

## Result

```ts
interface GitHubSyncResult {
  syncId: string;
  state: 'COMPLETED' | 'FAILED' | 'CANCELLED' | ...;
  processedItems: number;
  createdItems: number;
  updatedItems: number;
  skippedItems: number;
  failedItems: number;
  checkpoint: GitHubSyncCheckpoint | null;
  sanitizedError: string | null;
}
```

## Scheduler

The `GitHubSyncScheduler` runs periodic syncs at configured intervals:

```ts
scheduler.schedule({
  organizationId: 'org-1',
  installationId: 123,
  repository: 'owner/repo',
  intervalMs: 60_000,
  mode: 'incremental',
  resourceTypes: ['issues', 'pull_requests'],
});
```

## All API calls go through ConnectorRuntime

The sync engine never makes HTTP calls directly. All data fetching is done
through registered GitHub operations executed by `ConnectorRuntime`.
