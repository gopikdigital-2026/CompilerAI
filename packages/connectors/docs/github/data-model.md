# Data Model

## Sync Entities

All entities follow the existing GitHub canonical types (camelCase, readonly).
The sync stores use a composite key for idempotent upserts:

```
{organizationId} + {installationId} + {githubEntityId}
```

## Sync Store Interfaces

### IGitHubRepositorySyncStore

| Method | Description |
|--------|-------------|
| `upsert(orgId, instId, repo)` | Create or update a repository |
| `upsertBatch(orgId, instId, repos)` | Batch upsert |
| `findByOrg(orgId, instId)` | List all repos for an org |
| `findByGithubId(orgId, instId, id)` | Find by GitHub entity ID |
| `count(orgId, instId)` | Count repos for an org |

### IGitHubIssueSyncStore

Same interface pattern. Issues are deduplicated by `id` and skipped when
`updatedAt` and `state` are unchanged.

### IGitHubPullRequestSyncStore

Same interface pattern. PRs are deduplicated by `id` and skipped when
`updatedAt` and `state` are unchanged.

### IGitHubWorkflowRunSyncStore

Same interface pattern. Workflow runs are deduplicated by `id` and skipped
when `updatedAt` and `status` are unchanged.

## Upsert Result

```ts
type UpsertResult = {
  action: 'created' | 'updated' | 'skipped';
};
```

- `created`: New entity inserted
- `updated`: Existing entity modified
- `skipped`: Entity unchanged (same `updatedAt` + state/status)

## Webhook Delivery Records

```ts
interface WebhookDeliveryRecord {
  deliveryId: string;
  organizationId: UUID;
  eventName: string;
  receivedAt: ISOString;
  status: 'accepted' | 'rejected' | 'duplicate' | 'processed' | 'failed';
  reason?: string;
  handlerName?: string;
}
```

## Sync Job Records

```ts
interface GitHubSyncJobRecord {
  id: string;
  organizationId: UUID;
  installationId: number;
  repository: string;
  resourceType: GitHubSyncResourceType;
  mode: 'full' | 'incremental';
  state: 'queued' | 'running' | 'completed' | 'failed' | 'dead_letter';
  priority: number;
  attempts: number;
  maxAttempts: number;
  checkpoint: GitHubSyncCheckpoint | null;
  // ... timestamps and error
}
```

## Persistence

Currently only in-memory implementations are provided. The interfaces are
designed for future Supabase or other database backends without changing
the sync engine or webhook receiver code.
