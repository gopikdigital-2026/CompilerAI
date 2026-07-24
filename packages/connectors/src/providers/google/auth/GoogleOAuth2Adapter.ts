import type { CredentialResolver, ResolvedCredentials } from '../../../credentials/CredentialResolver';
import type { ConnectorId, UUID } from '../../../types/index';
import type { FetchLike } from '../GoogleApiClient';
import type { IGoogleTokenRefreshProvider, GoogleTokenRefreshResponse } from './GoogleTokenRefreshProvider';
import { ConnectorAuthenticationError } from '../../../errors/ConnectorAuthenticationError';
import { sanitizeMetadata } from '../../../observability/sanitize';

const GOOGLE_CONNECTOR_ID: ConnectorId = 'google-workspace';
const REFRESH_THRESHOLD_MS = 60_000;

interface CachedToken {
  readonly accessToken: string;
  readonly expiresAt: number;
  readonly refreshToken: string;
  readonly clientId: string;
  readonly clientSecret: string;
}

interface InFlightRefresh {
  readonly promise: Promise<string>;
}

export class GoogleOAuth2Adapter {
  private readonly cache: Map<string, CachedToken> = new Map();
  private readonly inFlight: Map<string, InFlightRefresh> = new Map();

  constructor(
    private readonly credentialResolver: CredentialResolver,
    private readonly refreshProvider: IGoogleTokenRefreshProvider,
  ) {}

  async getAccessToken(organizationId: UUID, userId?: UUID | null, transport?: FetchLike): Promise<string> {
    const cacheKey = this.cacheKey(organizationId, userId);
    const cached = this.cache.get(cacheKey);

    if (cached && !this.needsRefresh(cached)) {
      return cached.accessToken;
    }

    return this.refreshToken(organizationId, userId, transport, cacheKey);
  }

  async getAuthHeaders(organizationId: UUID, userId?: UUID | null, transport?: FetchLike): Promise<Record<string, string>> {
    const token = await this.getAccessToken(organizationId, userId, transport);
    return { 'Authorization': `Bearer ${token}` };
  }

  invalidateCache(organizationId: UUID, userId?: UUID | null): void {
    const key = this.cacheKey(organizationId, userId);
    this.cache.delete(key);
    this.inFlight.delete(key);
  }

  needsRefresh(token: CachedToken): boolean {
    const now = Date.now();
    return (token.expiresAt - now) <= REFRESH_THRESHOLD_MS;
  }

  isTokenExpired(token: CachedToken): boolean {
    return Date.now() >= token.expiresAt;
  }

  private async refreshToken(
    organizationId: UUID,
    userId: UUID | null | undefined,
    transport: FetchLike | undefined,
    cacheKey: string,
  ): Promise<string> {
    const existing = this.inFlight.get(cacheKey);
    if (existing) return existing.promise;

    const promise = this.doRefresh(organizationId, userId, transport, cacheKey);
    this.inFlight.set(cacheKey, { promise });
    return promise;
  }

  private async doRefresh(
    organizationId: UUID,
    userId: UUID | null | undefined,
    transport: FetchLike | undefined,
    cacheKey: string,
  ): Promise<string> {
    try {
      const resolved = await this.resolveCredentials(organizationId, userId);
      const response: GoogleTokenRefreshResponse = await this.refreshProvider.refresh(
        resolved.data['refreshToken'] as string,
        resolved.data['clientId'] as string,
        resolved.data['clientSecret'] as string,
        transport,
      );

      const accessToken = response.access_token;
      const refreshToken = response.refresh_token ?? resolved.data['refreshToken'] as string;
      const expiresAt = Date.now() + (response.expires_in ?? 3600) * 1000;

      const cached: CachedToken = {
        accessToken,
        expiresAt,
        refreshToken,
        clientId: resolved.data['clientId'] as string,
        clientSecret: resolved.data['clientSecret'] as string,
      };
      this.cache.set(cacheKey, cached);
      this.inFlight.delete(cacheKey);

      return accessToken;
    } catch (err) {
      this.inFlight.delete(cacheKey);
      const sanitized = sanitizeMetadata({ error: err instanceof Error ? err.message : String(err) });
      throw new ConnectorAuthenticationError(
        GOOGLE_CONNECTOR_ID, 'refreshToken', 'unknown',
        `Google OAuth2 token refresh failed: ${(sanitized as Record<string, unknown>)['error'] ?? 'unknown error'}`,
      );
    }
  }

  private async resolveCredentials(organizationId: UUID, userId?: UUID | null): Promise<ResolvedCredentials> {
    let resolved: ResolvedCredentials | null;
    try {
      resolved = await this.credentialResolver.resolve(GOOGLE_CONNECTOR_ID, organizationId, userId ?? null);
    } catch {
      resolved = null;
    }

    if (!resolved) {
      throw new ConnectorAuthenticationError(
        GOOGLE_CONNECTOR_ID, 'getAccessToken', 'unknown',
        `No Google Workspace credentials found for organization ${organizationId}`,
      );
    }

    const accessToken = resolved.data['accessToken'];
    const refreshToken = resolved.data['refreshToken'];
    const clientId = resolved.data['clientId'];
    const clientSecret = resolved.data['clientSecret'];

    if (typeof accessToken !== 'string' || typeof refreshToken !== 'string' ||
        typeof clientId !== 'string' || typeof clientSecret !== 'string') {
      throw new ConnectorAuthenticationError(
        GOOGLE_CONNECTOR_ID, 'getAccessToken', 'unknown',
        'Google credentials missing required fields (accessToken, refreshToken, clientId, clientSecret)',
      );
    }

    return resolved;
  }

  private cacheKey(organizationId: UUID, userId?: UUID | null): string {
    return `${organizationId}:${userId ?? '*'}`;
  }
}
