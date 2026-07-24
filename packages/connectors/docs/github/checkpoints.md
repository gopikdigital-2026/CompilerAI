# Checkpoints

## Overview

Checkpoints enable resumable synchronization by recording progress after each
page of results. If a sync is interrupted (cancellation, failure, restart),
it can resume from the last checkpoint.

## Checkpoint Structure

```ts
interface GitHubSyncCheckpoint {
  resourceType: 'repositories' | 'issues' | 'pull_requests' | 'workflow_runs';
  cursor: string | null;       // Last entity ID processed
  lastUpdatedAt: string | null; // ISO timestamp of last update
  page: number;                 // Last page processed
  processedItems: number;       // Total items processed so far
}
```

## Checkpoint Store

The `IGitHubSyncCheckpointStore` interface defines:

- `save(orgId, installationId, repo, resourceType, checkpoint)`
- `load(orgId, installationId, repo, resourceType)`
- `clear(orgId, installationId, repo, resourceType)`

`InMemoryGitHubSyncCheckpointStore` provides an in-memory implementation for
development and testing.

## Checkpoint Lifecycle

1. **Before sync**: If `mode: 'incremental'`, the engine loads the checkpoint
   from the store
2. **During sync**: After each page, the engine saves the updated checkpoint
3. **On completion**: The final checkpoint is saved
4. **On cancellation**: The checkpoint is saved (enabling resume)
5. **On resume**: `engine.resume()` loads the checkpoint and continues

## Telemetry

Checkpoint saves emit `connector.github.sync.checkpoint` telemetry events
with the checkpoint metadata (no sensitive data).
