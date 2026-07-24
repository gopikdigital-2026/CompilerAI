import type { UUID } from '../../../types/index';
import type { GitHubSyncResourceType, GitHubSyncCheckpoint } from './GitHubSyncResult';
import type { IGitHubSyncCheckpointStore } from './GitHubSyncCheckpointStore';

interface CheckpointKey {
  readonly organizationId: UUID;
  readonly installationId: number;
  readonly repository: string;
  readonly resourceType: GitHubSyncResourceType;
}

function keyEquals(a: CheckpointKey, b: CheckpointKey): boolean {
  return a.organizationId === b.organizationId &&
    a.installationId === b.installationId &&
    a.repository === b.repository &&
    a.resourceType === b.resourceType;
}

export class InMemoryGitHubSyncCheckpointStore implements IGitHubSyncCheckpointStore {
  private readonly checkpoints: CheckpointKey[] = [];
  private readonly values: GitHubSyncCheckpoint[] = [];

  async save(
    organizationId: UUID,
    installationId: number,
    repository: string,
    resourceType: GitHubSyncResourceType,
    checkpoint: GitHubSyncCheckpoint,
  ): Promise<void> {
    const key: CheckpointKey = { organizationId, installationId, repository, resourceType };
    const idx = this.checkpoints.findIndex((c) => keyEquals(c, key));
    if (idx >= 0) {
      this.values[idx] = checkpoint;
    } else {
      this.checkpoints.push(key);
      this.values.push(checkpoint);
    }
  }

  async load(
    organizationId: UUID,
    installationId: number,
    repository: string,
    resourceType: GitHubSyncResourceType,
  ): Promise<GitHubSyncCheckpoint | null> {
    const key: CheckpointKey = { organizationId, installationId, repository, resourceType };
    const idx = this.checkpoints.findIndex((c) => keyEquals(c, key));
    return idx >= 0 ? this.values[idx] : null;
  }

  async clear(
    organizationId: UUID,
    installationId: number,
    repository: string,
    resourceType: GitHubSyncResourceType,
  ): Promise<void> {
    const key: CheckpointKey = { organizationId, installationId, repository, resourceType };
    const idx = this.checkpoints.findIndex((c) => keyEquals(c, key));
    if (idx >= 0) {
      this.checkpoints.splice(idx, 1);
      this.values.splice(idx, 1);
    }
  }
}
