import type { UUID } from '../../../types/index';
import type { GitHubSyncResourceType, GitHubSyncCheckpoint } from './GitHubSyncResult';

export interface IGitHubSyncCheckpointStore {
  save(organizationId: UUID, installationId: number, repository: string, resourceType: GitHubSyncResourceType, checkpoint: GitHubSyncCheckpoint): Promise<void>;
  load(organizationId: UUID, installationId: number, repository: string, resourceType: GitHubSyncResourceType): Promise<GitHubSyncCheckpoint | null>;
  clear(organizationId: UUID, installationId: number, repository: string, resourceType: GitHubSyncResourceType): Promise<void>;
}
