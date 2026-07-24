import type { GitHubAppInstallationToken } from './GitHubAppAuthContracts';
import type { Clock } from './GitHubAppJwtProvider';

export interface InstallationTokenKey {
  readonly organizationId: string;
  readonly installationId: number;
}

export interface IGitHubInstallationTokenCache {
  get(key: InstallationTokenKey): GitHubAppInstallationToken | null;
  set(key: InstallationTokenKey, token: GitHubAppInstallationToken): void;
  delete(key: InstallationTokenKey): void;
  clear(): void;
  size(): number;
}

export interface CachedTokenEntry {
  readonly key: InstallationTokenKey;
  readonly token: GitHubAppInstallationToken;
  readonly cachedAt: number;
}

export class GitHubInstallationTokenCache implements IGitHubInstallationTokenCache {
  private readonly entries: InstallationTokenKey[] = [];
  private readonly values: GitHubAppInstallationToken[] = [];
  private readonly timestamps: number[] = [];
  private readonly clock: Clock;

  constructor(clock: Clock = new SystemClockAdapter()) {
    this.clock = clock;
  }

  get(key: InstallationTokenKey): GitHubAppInstallationToken | null {
    const idx = this.findIndex(key);
    if (idx < 0) return null;
    return this.values[idx];
  }

  set(key: InstallationTokenKey, token: GitHubAppInstallationToken): void {
    const idx = this.findIndex(key);
    if (idx >= 0) {
      this.values[idx] = token;
      this.timestamps[idx] = Math.floor(this.clock.now().getTime() / 1000);
    } else {
      this.entries.push(key);
      this.values.push(token);
      this.timestamps.push(Math.floor(this.clock.now().getTime() / 1000));
    }
  }

  delete(key: InstallationTokenKey): void {
    const idx = this.findIndex(key);
    if (idx >= 0) {
      this.entries.splice(idx, 1);
      this.values.splice(idx, 1);
      this.timestamps.splice(idx, 1);
    }
  }

  clear(): void {
    this.entries.length = 0;
    this.values.length = 0;
    this.timestamps.length = 0;
  }

  size(): number {
    return this.entries.length;
  }

  getEntries(): CachedTokenEntry[] {
    return this.entries.map((key, i) => ({
      key,
      token: this.values[i],
      cachedAt: this.timestamps[i],
    }));
  }

  private findIndex(key: InstallationTokenKey): number {
    return this.entries.findIndex(
      (e) => e.organizationId === key.organizationId && e.installationId === key.installationId,
    );
  }
}

class SystemClockAdapter implements Clock {
  now(): Date {
    return new Date();
  }
}
