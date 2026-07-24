import type { UUID, ISOString } from '../../../types/index';
import type {
  GitHubSyncResourceType,
  GitHubSyncMode,
  GitHubSyncCheckpoint,
} from './GitHubSyncResult';

export interface GitHubSyncJobRecord {
  readonly id: string;
  readonly organizationId: UUID;
  readonly installationId: number;
  readonly repository: string;
  readonly resourceType: GitHubSyncResourceType;
  readonly mode: GitHubSyncMode;
  readonly state: 'queued' | 'running' | 'completed' | 'failed' | 'dead_letter';
  readonly priority: number;
  readonly attempts: number;
  readonly maxAttempts: number;
  readonly maxPages: number;
  readonly since: ISOString | null;
  readonly checkpoint: GitHubSyncCheckpoint | null;
  readonly createdAt: ISOString;
  readonly startedAt: ISOString | null;
  readonly completedAt: ISOString | null;
  readonly lastError: string | null;
  readonly dedupKey: string;
}

export function createSyncJobDedupKey(
  organizationId: UUID,
  installationId: number,
  repository: string,
  resourceType: GitHubSyncResourceType,
): string {
  return `${organizationId}:${installationId}:${repository}:${resourceType}`;
}

export function createJobId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
