import type { UUID, ISOString } from '../../../types/index';

export type GitHubSyncResourceType =
  | 'repositories'
  | 'issues'
  | 'pull_requests'
  | 'workflow_runs';

export type GitHubSyncState =
  | 'PENDING'
  | 'RUNNING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type GitHubSyncMode = 'full' | 'incremental';

export interface GitHubSyncCheckpoint {
  readonly resourceType: GitHubSyncResourceType;
  readonly cursor: string | null;
  readonly lastUpdatedAt: ISOString | null;
  readonly page: number;
  readonly processedItems: number;
}

export interface GitHubSyncResult {
  readonly syncId: string;
  readonly organizationId: UUID;
  readonly installationId: number;
  readonly repository: string;
  readonly resourceType: GitHubSyncResourceType;
  readonly mode: GitHubSyncMode;
  readonly state: GitHubSyncState;
  readonly startedAt: ISOString;
  readonly completedAt: ISOString | null;
  readonly processedItems: number;
  readonly createdItems: number;
  readonly updatedItems: number;
  readonly skippedItems: number;
  readonly failedItems: number;
  readonly checkpoint: GitHubSyncCheckpoint | null;
  readonly sanitizedError: string | null;
}

export interface GitHubSyncProgress {
  readonly syncId: string;
  readonly state: GitHubSyncState;
  readonly processedItems: number;
  readonly createdItems: number;
  readonly updatedItems: number;
  readonly skippedItems: number;
  readonly failedItems: number;
  readonly checkpoint: GitHubSyncCheckpoint | null;
}

export interface GitHubSyncRequest {
  readonly organizationId: UUID;
  readonly installationId: number;
  readonly repository: string;
  readonly resourceType: GitHubSyncResourceType;
  readonly mode: GitHubSyncMode;
  readonly maxPages?: number;
  readonly since?: ISOString;
  readonly resumeFromCheckpoint?: GitHubSyncCheckpoint;
}

export function createSyncId(): string {
  return `sync_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
