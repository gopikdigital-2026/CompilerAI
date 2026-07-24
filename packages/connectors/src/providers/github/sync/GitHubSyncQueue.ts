import type { UUID, ISOString } from '../../../types/index';
import type { GitHubSyncJobRecord } from './GitHubSyncJob';
import { createSyncJobDedupKey, createJobId } from './GitHubSyncJob';

export interface GitHubSyncJobRepository {
  enqueue(job: GitHubSyncJobRecord): void;
  dequeue(): GitHubSyncJobRecord | null;
  findById(id: string): GitHubSyncJobRecord | null;
  update(job: GitHubSyncJobRecord): void;
  findByDedupKey(dedupKey: string): GitHubSyncJobRecord | null;
  getDeadLetterJobs(): GitHubSyncJobRecord[];
  getAll(): GitHubSyncJobRecord[];
  count(): number;
  clear(): void;
}

export class InMemoryGitHubSyncJobRepository implements GitHubSyncJobRepository {
  private readonly jobs: Map<string, GitHubSyncJobRecord> = new Map();
  private readonly dedupIndex: Map<string, string> = new Map();
  private order: string[] = [];

  enqueue(job: GitHubSyncJobRecord): void {
    if (this.dedupIndex.has(job.dedupKey)) {
      const existingId = this.dedupIndex.get(job.dedupKey)!;
      const existing = this.jobs.get(existingId);
      if (existing && existing.state !== 'completed' && existing.state !== 'dead_letter') {
        return;
      }
    }
    this.jobs.set(job.id, job);
    this.dedupIndex.set(job.dedupKey, job.id);
    this.order.push(job.id);
    this.sortByPriority();
  }

  dequeue(): GitHubSyncJobRecord | null {
    for (const id of this.order) {
      const job = this.jobs.get(id);
      if (job && job.state === 'queued') {
        return job;
      }
    }
    return null;
  }

  findById(id: string): GitHubSyncJobRecord | null {
    return this.jobs.get(id) ?? null;
  }

  update(job: GitHubSyncJobRecord): void {
    if (this.jobs.has(job.id)) {
      this.jobs.set(job.id, job);
    }
  }

  findByDedupKey(dedupKey: string): GitHubSyncJobRecord | null {
    const id = this.dedupIndex.get(dedupKey);
    return id ? this.jobs.get(id) ?? null : null;
  }

  getDeadLetterJobs(): GitHubSyncJobRecord[] {
    return [...this.jobs.values()].filter((j) => j.state === 'dead_letter');
  }

  getAll(): GitHubSyncJobRecord[] {
    return [...this.jobs.values()];
  }

  count(): number {
    return this.jobs.size;
  }

  clear(): void {
    this.jobs.clear();
    this.dedupIndex.clear();
    this.order = [];
  }

  private sortByPriority(): void {
    this.order.sort((a, b) => {
      const jobA = this.jobs.get(a);
      const jobB = this.jobs.get(b);
      if (!jobA || !jobB) return 0;
      if (jobA.priority !== jobB.priority) return jobB.priority - jobA.priority;
      return jobA.createdAt.localeCompare(jobB.createdAt);
    });
  }
}

export function createSyncJob(
  organizationId: UUID,
  installationId: number,
  repository: string,
  resourceType: GitHubSyncJobRecord['resourceType'],
  options?: {
    readonly mode?: GitHubSyncJobRecord['mode'];
    readonly priority?: number;
    readonly maxAttempts?: number;
    readonly maxPages?: number;
    readonly since?: ISOString;
  },
): GitHubSyncJobRecord {
  const now = new Date().toISOString();
  return {
    id: createJobId(),
    organizationId,
    installationId,
    repository,
    resourceType,
    mode: options?.mode ?? 'incremental',
    state: 'queued',
    priority: options?.priority ?? 0,
    attempts: 0,
    maxAttempts: options?.maxAttempts ?? 3,
    maxPages: options?.maxPages ?? 10,
    since: options?.since ?? null,
    checkpoint: null,
    createdAt: now,
    startedAt: null,
    completedAt: null,
    lastError: null,
    dedupKey: createSyncJobDedupKey(organizationId, installationId, repository, resourceType),
  };
}
