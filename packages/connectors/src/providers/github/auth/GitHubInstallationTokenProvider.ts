import type { GitHubAppCredentials, GitHubAppInstallationToken } from './GitHubAppAuthContracts';
import type { GitHubAppJwtProvider, Clock } from './GitHubAppJwtProvider';
import type { IGitHubInstallationTokenCache, InstallationTokenKey } from './GitHubInstallationTokenCache';
import type { FetchLike } from '../GitHubOperationsFactory';

const GITHUB_API_BASE = 'https://api.github.com';
const DEFAULT_REFRESH_THRESHOLD_MS = 5 * 60 * 1000;

export interface GitHubInstallationTokenProviderOptions {
  readonly refreshThresholdMs?: number;
  readonly apiBaseUrl?: string;
}

interface InFlightToken {
  readonly promise: Promise<GitHubAppInstallationToken>;
}

export class GitHubInstallationTokenProvider {
  private readonly inFlight: Map<string, InFlightToken> = new Map();
  private readonly refreshThresholdMs: number;
  private readonly apiBaseUrl: string;

  constructor(
    private readonly jwtProvider: GitHubAppJwtProvider,
    private readonly cache: IGitHubInstallationTokenCache,
    private readonly clock: Clock,
    options: GitHubInstallationTokenProviderOptions = {},
  ) {
    this.refreshThresholdMs = options.refreshThresholdMs ?? DEFAULT_REFRESH_THRESHOLD_MS;
    this.apiBaseUrl = options.apiBaseUrl ?? GITHUB_API_BASE;
  }

  async getToken(
    credentials: GitHubAppCredentials,
    organizationId: string,
    installationId: number,
    transport?: FetchLike,
  ): Promise<GitHubAppInstallationToken> {
    const key: InstallationTokenKey = { organizationId, installationId };
    const cached = this.cache.get(key);

    if (cached && !this.needsRefresh(cached)) {
      return cached;
    }

    return this.refreshToken(credentials, key, transport);
  }

  getCachedToken(key: InstallationTokenKey): GitHubAppInstallationToken | null {
    return this.cache.get(key);
  }

  isTokenExpired(token: GitHubAppInstallationToken): boolean {
    const now = this.clock.now().getTime();
    const expiresAt = new Date(token.expiresAt).getTime();
    return now >= expiresAt;
  }

  needsRefresh(token: GitHubAppInstallationToken): boolean {
    const now = this.clock.now().getTime();
    const expiresAt = new Date(token.expiresAt).getTime();
    return (expiresAt - now) <= this.refreshThresholdMs;
  }

  invalidateCache(key: InstallationTokenKey): void {
    this.cache.delete(key);
    this.inFlight.delete(this.dedupeKey(key));
  }

  private async refreshToken(
    credentials: GitHubAppCredentials,
    key: InstallationTokenKey,
    transport?: FetchLike,
  ): Promise<GitHubAppInstallationToken> {
    const dedupeKey = this.dedupeKey(key);
    const existing = this.inFlight.get(dedupeKey);
    if (existing) {
      return existing.promise;
    }

    const promise = this.doTokenExchange(credentials, key.installationId, transport)
      .then((token) => {
        this.cache.set(key, token);
        this.inFlight.delete(dedupeKey);
        return token;
      })
      .catch((err) => {
        this.inFlight.delete(dedupeKey);
        throw err;
      });

    this.inFlight.set(dedupeKey, { promise });
    return promise;
  }

  private async doTokenExchange(
    credentials: GitHubAppCredentials,
    installationId: number,
    transport?: FetchLike,
  ): Promise<GitHubAppInstallationToken> {
    const { jwt } = this.jwtProvider.generateJwt(credentials);

    const fetchFn = transport ?? fetch;
    const url = `${this.apiBaseUrl}/app/installations/${installationId}/access_tokens`;

    const response = await fetchFn(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: '{}',
    });

    if (!response.ok) {
      const sanitizedStatus = response.status;
      throw new Error(`Failed to exchange installation token (HTTP ${sanitizedStatus})`);
    }

    const data = await response.json() as {
      readonly token: string;
      readonly expires_at: string;
      readonly permissions?: Readonly<Record<string, string>>;
      readonly repository_selection?: string;
    };

    if (!data.token || typeof data.token !== 'string') {
      throw new Error('Installation token response missing token field');
    }

    const permissions: Record<string, 'read' | 'write' | 'admin'> = {};
    if (data.permissions) {
      for (const [key, value] of Object.entries(data.permissions)) {
        if (value === 'read' || value === 'write' || value === 'admin') {
          permissions[key] = value;
        }
      }
    }

    return Object.freeze({
      token: data.token,
      expiresAt: data.expires_at,
      permissions: Object.freeze(permissions),
      repositorySelection: (data.repository_selection === 'selected' ? 'selected' : 'all') as 'all' | 'selected',
    });
  }

  private dedupeKey(key: InstallationTokenKey): string {
    return `${key.organizationId}:${key.installationId}`;
  }
}
