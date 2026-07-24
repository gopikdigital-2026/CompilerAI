import type { UUID } from '../../../types/index';
import type { GitHubSyncRequest } from './GitHubSyncResult';
import type { GitHubSyncEngine } from './GitHubSyncEngine';
import type { GitHubSyncJobRepository } from './GitHubSyncQueue';

export interface GitHubSyncSchedulerOptions {
  readonly engine: GitHubSyncEngine;
  readonly queue: GitHubSyncJobRepository;
}

export interface ScheduledSyncConfig {
  readonly organizationId: UUID;
  readonly installationId: number;
  readonly repository: string;
  readonly intervalMs: number;
  readonly mode: 'full' | 'incremental';
  readonly resourceTypes: readonly ('repositories' | 'issues' | 'pull_requests' | 'workflow_runs')[];
}

export class GitHubSyncScheduler {
  private readonly timers: Map<string, ReturnType<typeof setInterval>> = new Map();
  private readonly configs: Map<string, ScheduledSyncConfig> = new Map();

  constructor(private readonly options: GitHubSyncSchedulerOptions) {}

  schedule(config: ScheduledSyncConfig): string {
    const scheduleId = `schedule_${config.organizationId}_${config.installationId}_${config.repository}`;
    this.unschedule(scheduleId);
    this.configs.set(scheduleId, config);

    const timer = setInterval(() => {
      void this.tick(config);
    }, config.intervalMs);

    this.timers.set(scheduleId, timer);
    return scheduleId;
  }

  unschedule(scheduleId: string): boolean {
    const timer = this.timers.get(scheduleId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(scheduleId);
      this.configs.delete(scheduleId);
      return true;
    }
    return false;
  }

  unscheduleAll(): void {
    for (const timer of this.timers.values()) {
      clearInterval(timer);
    }
    this.timers.clear();
    this.configs.clear();
  }

  getScheduledIds(): string[] {
    return [...this.timers.keys()];
  }

  private async tick(config: ScheduledSyncConfig): Promise<void> {
    for (const resourceType of config.resourceTypes) {
      const request: GitHubSyncRequest = {
        organizationId: config.organizationId,
        installationId: config.installationId,
        repository: config.repository,
        resourceType,
        mode: config.mode,
      };
      await this.options.engine.sync(request);
    }
  }
}
