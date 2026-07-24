import type { GitHubSyncJobRepository } from './GitHubSyncQueue';
import type { GitHubSyncJobRecord } from './GitHubSyncJob';
import type { GitHubSyncEngine } from './GitHubSyncEngine';
import type { GitHubSyncRequest } from './GitHubSyncResult';
import type { ConnectorTelemetry } from '../../../observability/ConnectorTelemetry';
import type { UUID } from '../../../types/index';
import { GITHUB_CONNECTOR_ID } from '../GitHubOperationsFactory';

const BACKOFF_BASE_MS = 1000;
const BACKOFF_MAX_MS = 30_000;

export interface GitHubSyncWorkerOptions {
  readonly repository: GitHubSyncJobRepository;
  readonly engine: GitHubSyncEngine;
  readonly telemetry: ConnectorTelemetry;
  readonly pollIntervalMs?: number;
}

export class GitHubSyncWorker {
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly pollIntervalMs: number;
  private running = false;
  private readonly activeJobs: Set<string> = new Set();

  constructor(private readonly options: GitHubSyncWorkerOptions) {
    this.pollIntervalMs = options.pollIntervalMs ?? 1000;
  }

  start(): void {
    if (this.timer) return;
    this.running = true;
    this.timer = setInterval(() => {
      void this.poll();
    }, this.pollIntervalMs);
  }

  stop(): void {
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  isRunning(): boolean {
    return this.running;
  }

  async poll(): Promise<void> {
    const job = this.options.repository.dequeue();
    if (!job) return;

    if (this.activeJobs.has(job.dedupKey)) return;

    this.activeJobs.add(job.dedupKey);
    try {
      await this.processJob(job);
    } finally {
      this.activeJobs.delete(job.dedupKey);
    }
  }

  async processJob(job: GitHubSyncJobRecord): Promise<GitHubSyncJobRecord> {
    const attempts = job.attempts + 1;
    const startedAt = new Date().toISOString();
    const updatedJob: GitHubSyncJobRecord = {
      ...job,
      state: 'running',
      attempts,
      startedAt,
    };
    this.options.repository.update(updatedJob);

    const request: GitHubSyncRequest = {
      organizationId: job.organizationId as UUID,
      installationId: job.installationId,
      repository: job.repository,
      resourceType: job.resourceType,
      mode: job.mode,
      maxPages: job.maxPages,
      since: job.since ?? undefined,
      resumeFromCheckpoint: job.checkpoint ?? undefined,
    };

    try {
      const result = await this.options.engine.sync(request);

      if (result.state === 'COMPLETED') {
        const completedJob: GitHubSyncJobRecord = {
          ...updatedJob,
          state: 'completed',
          completedAt: new Date().toISOString(),
          checkpoint: result.checkpoint,
          lastError: null,
        };
        this.options.repository.update(completedJob);
        this.emitEvent('connector.github.sync.completed', job.organizationId, {
          jobId: job.id,
          syncId: result.syncId,
          processedItems: result.processedItems,
        });
        return completedJob;
      }

      if (result.state === 'CANCELLED') {
        const cancelledJob: GitHubSyncJobRecord = {
          ...updatedJob,
          state: 'queued',
          checkpoint: result.checkpoint,
        };
        this.options.repository.update(cancelledJob);
        return cancelledJob;
      }

      return await this.handleFailure(updatedJob, result.sanitizedError ?? 'Unknown error');
    } catch (err) {
      const sanitizedError = this.sanitizeError(err);
      return await this.handleFailure(updatedJob, sanitizedError);
    }
  }

  private async handleFailure(job: GitHubSyncJobRecord, error: string): Promise<GitHubSyncJobRecord> {
    if (job.attempts >= job.maxAttempts) {
      const deadJob: GitHubSyncJobRecord = {
        ...job,
        state: 'dead_letter',
        completedAt: new Date().toISOString(),
        lastError: error,
      };
      this.options.repository.update(deadJob);
      this.emitEvent('connector.github.sync.failed', job.organizationId, {
        jobId: job.id,
        error,
        deadLetter: true,
      });
      return deadJob;
    }

    const backoffMs = Math.min(
      BACKOFF_BASE_MS * Math.pow(2, job.attempts - 1),
      BACKOFF_MAX_MS,
    );

    const retriedJob: GitHubSyncJobRecord = {
      ...job,
      state: 'queued',
      lastError: error,
    };
    this.options.repository.update(retriedJob);

    setTimeout(() => {
      void this.poll();
    }, backoffMs);

    return retriedJob;
  }

  private emitEvent(type: string, organizationId: string, metadata: Record<string, unknown>): void {
    this.options.telemetry.emit({
      type: type as never,
      connectorId: GITHUB_CONNECTOR_ID,
      organizationId: organizationId as UUID,
      operation: 'sync_worker',
      executionId: metadata['jobId'] as string,
      timestamp: new Date().toISOString(),
      metadata,
    });
  }

  private sanitizeError(err: unknown): string {
    if (err instanceof Error) {
      return err.message.replace(/token|key|secret|password|bearer/gi, '[REDACTED]');
    }
    return 'Unknown error';
  }
}
