import type { UUID, ISOString } from '../../../types/index';
import type { GitHubRepository } from '../types/GitHubRepository';
import type { ConnectorRuntime } from '../../../runtime/ConnectorRuntime';
import type { ConnectorTelemetry } from '../../../observability/ConnectorTelemetry';
import type { Clock } from '../auth/GitHubAppJwtProvider';
import type { FetchLike } from '../GitHubOperationsFactory';
import type { GitHubAppCredentialResolver } from '../auth/GitHubAppCredentialResolver';
import type { IGitHubSyncCheckpointStore } from './GitHubSyncCheckpointStore';
import type {
  IGitHubRepositorySyncStore,
  IGitHubIssueSyncStore,
  IGitHubPullRequestSyncStore,
  IGitHubWorkflowRunSyncStore,
  UpsertResult,
} from './GitHubSyncRepository';
import type {
  GitHubSyncResult,
  GitHubSyncRequest,
  GitHubSyncCheckpoint,
  GitHubSyncResourceType,
} from './GitHubSyncResult';
import { createSyncId } from './GitHubSyncResult';
import { SystemClock } from '../auth/GitHubAppJwtProvider';
import { GITHUB_CONNECTOR_ID } from '../GitHubOperationsFactory';

export interface GitHubSyncEngineOptions {
  readonly runtime: ConnectorRuntime;
  readonly telemetry: ConnectorTelemetry;
  readonly appCredentialResolver: GitHubAppCredentialResolver;
  readonly checkpointStore: IGitHubSyncCheckpointStore;
  readonly repositoryStore: IGitHubRepositorySyncStore;
  readonly issueStore: IGitHubIssueSyncStore;
  readonly pullRequestStore: IGitHubPullRequestSyncStore;
  readonly workflowRunStore: IGitHubWorkflowRunSyncStore;
  readonly clock?: Clock;
  readonly transport?: FetchLike;
  readonly maxPagesDefault?: number;
}

export class GitHubSyncEngine {
  private readonly clock: Clock;
  private readonly maxPagesDefault: number;
  private readonly activeSyncs: Map<string, AbortController> = new Map();

  constructor(private readonly options: GitHubSyncEngineOptions) {
    this.clock = options.clock ?? new SystemClock();
    this.maxPagesDefault = options.maxPagesDefault ?? 10;
  }

  async sync(request: GitHubSyncRequest): Promise<GitHubSyncResult> {
    const syncId = createSyncId();
    const controller = new AbortController();
    this.activeSyncs.set(syncId, controller);

    const startedAt = this.clock.now().toISOString();
    let checkpoint = request.resumeFromCheckpoint ?? null;
    let processedItems = 0;
    let createdItems = 0;
    let updatedItems = 0;
    let skippedItems = 0;
    let failedItems = 0;
    let state: GitHubSyncResult['state'] = 'RUNNING';

    this.emitEvent('connector.github.sync.started', {
      syncId,
      organizationId: request.organizationId,
      installationId: request.installationId,
      repository: request.repository,
      resourceType: request.resourceType,
      mode: request.mode,
    });

    try {
      if (request.mode === 'incremental' && !request.since && !checkpoint) {
        const loaded = await this.options.checkpointStore.load(
          request.organizationId, request.installationId, request.repository, request.resourceType,
        );
        checkpoint = loaded;
      }

      const result = await this.syncResource(request, syncId, checkpoint, controller.signal);

      processedItems = result.processedItems;
      createdItems = result.createdItems;
      updatedItems = result.updatedItems;
      skippedItems = result.skippedItems;
      failedItems = result.failedItems;
      checkpoint = result.checkpoint;

      if (controller.signal.aborted) {
        state = 'CANCELLED';
        this.emitEvent('connector.github.sync.checkpoint', {
          syncId, checkpoint: this.serializeCheckpoint(checkpoint),
        });
      } else {
        state = 'COMPLETED';
        if (checkpoint) {
          await this.options.checkpointStore.save(
            request.organizationId, request.installationId, request.repository, request.resourceType, checkpoint,
          );
        }
        this.emitEvent('connector.github.sync.completed', {
          syncId, processedItems, createdItems, updatedItems, skippedItems, failedItems,
        });
      }
    } catch (err) {
      state = 'FAILED';
      failedItems++;
      const sanitizedError = this.sanitizeError(err);
      this.emitEvent('connector.github.sync.failed', {
        syncId, error: sanitizedError,
      });
      return this.buildResult(syncId, request, state, startedAt, processedItems, createdItems, updatedItems, skippedItems, failedItems, checkpoint, sanitizedError);
    } finally {
      this.activeSyncs.delete(syncId);
    }

    return this.buildResult(syncId, request, state, startedAt, processedItems, createdItems, updatedItems, skippedItems, failedItems, checkpoint, null);
  }

  cancel(syncId: string): boolean {
    const controller = this.activeSyncs.get(syncId);
    if (controller) {
      controller.abort();
      return true;
    }
    return false;
  }

  async resume(syncId: string, request: GitHubSyncRequest): Promise<GitHubSyncResult> {
    const checkpoint = await this.options.checkpointStore.load(
      request.organizationId, request.installationId, request.repository, request.resourceType,
    );
    this.emitEvent('connector.github.sync.resumed', { syncId, checkpoint: this.serializeCheckpoint(checkpoint) });
    return this.sync({ ...request, resumeFromCheckpoint: checkpoint ?? undefined, mode: 'incremental' });
  }

  private async syncResource(
    request: GitHubSyncRequest,
    syncId: string,
    checkpoint: GitHubSyncCheckpoint | null,
    signal: AbortSignal,
  ): Promise<{
    readonly processedItems: number;
    readonly createdItems: number;
    readonly updatedItems: number;
    readonly skippedItems: number;
    readonly failedItems: number;
    readonly checkpoint: GitHubSyncCheckpoint | null;
  }> {
    switch (request.resourceType) {
      case 'repositories':
        return this.syncRepositories(request, syncId, checkpoint, signal);
      case 'issues':
        return this.syncIssues(request, syncId, checkpoint, signal);
      case 'pull_requests':
        return this.syncPullRequests(request, syncId, checkpoint, signal);
      case 'workflow_runs':
        return this.syncWorkflowRuns(request, syncId, checkpoint, signal);
    }
  }

  private async syncRepositories(
    request: GitHubSyncRequest,
    syncId: string,
    checkpoint: GitHubSyncCheckpoint | null,
    signal: AbortSignal,
  ) {
    let processed = 0, created = 0, updated = 0, skipped = 0, failed = 0;
    let page = checkpoint?.page ?? 1;
    let cursor = checkpoint?.cursor ?? null;
    const maxPages = request.maxPages ?? this.maxPagesDefault;

    while (page <= maxPages) {
      if (signal.aborted) break;

      const result = await this.executeOperation('github.listRepositories', {
        organizationId: request.organizationId,
        perPage: 100,
        page,
        sort: 'updated',
        direction: 'desc',
      }, signal);

      if (!result.success || !result.data) {
        failed++;
        break;
      }

      const repos = (result.data as { repositories: GitHubRepository[] }).repositories;
      const upsertResults = await this.options.repositoryStore.upsertBatch(
        request.organizationId, request.installationId, repos,
      );

      for (const r of upsertResults) {
        processed++;
        if (r.action === 'created') created++;
        else if (r.action === 'updated') updated++;
        else skipped++;
      }

      if (repos.length === 0) break;

      cursor = repos.length > 0 ? String(repos[repos.length - 1].id) : cursor;
      checkpoint = { resourceType: 'repositories', cursor, lastUpdatedAt: this.clock.now().toISOString(), page, processedItems: processed };
      this.emitEvent('connector.github.sync.checkpoint', {
        syncId, checkpoint: this.serializeCheckpoint(checkpoint),
      });

      if (repos.length < 100) break;
      page++;
    }

    return { processedItems: processed, createdItems: created, updatedItems: updated, skippedItems: skipped, failedItems: failed, checkpoint };
  }

  private async syncIssues(
    request: GitHubSyncRequest,
    syncId: string,
    checkpoint: GitHubSyncCheckpoint | null,
    signal: AbortSignal,
  ) {
    return this.syncPaginatedEntity(request, syncId, checkpoint, signal, 'issues', 'github.listIssues', this.options.issueStore, 'issues');
  }

  private async syncPullRequests(
    request: GitHubSyncRequest,
    syncId: string,
    checkpoint: GitHubSyncCheckpoint | null,
    signal: AbortSignal,
  ) {
    return this.syncPaginatedEntity(request, syncId, checkpoint, signal, 'pull_requests', 'github.listPullRequests', this.options.pullRequestStore, 'pullRequests');
  }

  private async syncWorkflowRuns(
    request: GitHubSyncRequest,
    syncId: string,
    checkpoint: GitHubSyncCheckpoint | null,
    signal: AbortSignal,
  ) {
    return this.syncPaginatedEntity(request, syncId, checkpoint, signal, 'workflow_runs', 'github.listWorkflowRuns', this.options.workflowRunStore, 'workflowRuns');
  }

  private async syncPaginatedEntity<T extends { readonly id: number }>(
    request: GitHubSyncRequest,
    syncId: string,
    checkpoint: GitHubSyncCheckpoint | null,
    signal: AbortSignal,
    resourceType: GitHubSyncResourceType,
    operationName: string,
    store: { upsertBatch: (orgId: UUID, instId: number, items: readonly T[]) => Promise<UpsertResult[]> },
    dataKey: 'issues' | 'pullRequests' | 'workflowRuns',
  ) {
    let processed = 0, created = 0, updated = 0, skipped = 0, failed = 0;
    let page = checkpoint?.page ?? 1;
    let cursor = checkpoint?.cursor ?? null;
    const maxPages = request.maxPages ?? this.maxPagesDefault;
    const [owner, repo] = request.repository.split('/');

    while (page <= maxPages) {
      if (signal.aborted) break;

      const input: Record<string, unknown> = {
        organizationId: request.organizationId,
        owner,
        repo,
        perPage: 100,
        page,
        sort: 'updated',
        direction: 'desc',
      };
      if (request.mode === 'incremental') {
        const since = request.since ?? checkpoint?.lastUpdatedAt;
        if (since) input['since'] = since;
      }

      const result = await this.executeOperation(operationName, input, signal);
      if (!result.success || !result.data) {
        failed++;
        break;
      }

      const data = result.data as Record<string, T[]>;
      const items = data[dataKey] ?? [];
      if (items.length === 0) break;

      const upsertResults = await store.upsertBatch(request.organizationId, request.installationId, items);
      for (const r of upsertResults) {
        processed++;
        if (r.action === 'created') created++;
        else if (r.action === 'updated') updated++;
        else skipped++;
      }

      cursor = String((items[items.length - 1] as { id: number }).id);
      checkpoint = { resourceType, cursor, lastUpdatedAt: this.clock.now().toISOString(), page, processedItems: processed };
      this.emitEvent('connector.github.sync.checkpoint', {
        syncId, checkpoint: this.serializeCheckpoint(checkpoint),
      });

      if (items.length < 100) break;
      page++;
    }

    return { processedItems: processed, createdItems: created, updatedItems: updated, skippedItems: skipped, failedItems: failed, checkpoint };
  }

  private async executeOperation(operation: string, input: Record<string, unknown>, signal: AbortSignal) {
    return this.options.runtime.execute({
      connectorId: GITHUB_CONNECTOR_ID,
      operation,
      input,
      context: {
        organizationId: input['organizationId'] as UUID,
        userId: null,
        requestId: `sync_${Date.now()}`,
        correlationId: `sync_${Date.now()}`,
        traceId: `sync_${Date.now()}`,
        metadata: {},
      },
      abortSignal: signal,
    });
  }

  private emitEvent(type: string, metadata: Record<string, unknown>): void {
    this.options.telemetry.emit({
      type: type as never,
      connectorId: GITHUB_CONNECTOR_ID,
      organizationId: metadata['organizationId'] as UUID ?? 'unknown',
      operation: 'sync',
      executionId: metadata['syncId'] as string,
      timestamp: this.clock.now().toISOString(),
      metadata,
    });
  }

  private serializeCheckpoint(checkpoint: GitHubSyncCheckpoint | null): Record<string, unknown> {
    if (!checkpoint) return {};
    return {
      resourceType: checkpoint.resourceType,
      cursor: checkpoint.cursor,
      lastUpdatedAt: checkpoint.lastUpdatedAt,
      page: checkpoint.page,
      processedItems: checkpoint.processedItems,
    };
  }

  private sanitizeError(err: unknown): string {
    if (err instanceof Error) {
      return err.message.replace(/token|key|secret|password|bearer/gi, '[REDACTED]');
    }
    return 'Unknown error';
  }

  private buildResult(
    syncId: string,
    request: GitHubSyncRequest,
    state: GitHubSyncResult['state'],
    startedAt: ISOString,
    processedItems: number,
    createdItems: number,
    updatedItems: number,
    skippedItems: number,
    failedItems: number,
    checkpoint: GitHubSyncCheckpoint | null,
    sanitizedError: string | null,
  ): GitHubSyncResult {
    return Object.freeze({
      syncId,
      organizationId: request.organizationId,
      installationId: request.installationId,
      repository: request.repository,
      resourceType: request.resourceType,
      mode: request.mode,
      state,
      startedAt,
      completedAt: this.clock.now().toISOString(),
      processedItems,
      createdItems,
      updatedItems,
      skippedItems,
      failedItems,
      checkpoint,
      sanitizedError,
    });
  }
}
