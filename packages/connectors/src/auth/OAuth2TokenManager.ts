import type { OAuth2Token } from '../auth/index';
import type { ITokenRefreshProvider } from './TokenRefreshProvider';
import type { ICredentialStore } from '../credentials/CredentialStore';
import type { ICredentialEncryptionProvider } from '../credentials/CredentialEncryptionProvider';
import type { ConnectorId, UUID } from '../types/index';
import { ConnectorAuthenticationError } from '../errors/ConnectorAuthenticationError';
import { isExpired } from '../utils/index';

export interface OAuth2TokenManagerOptions {
  refreshThresholdMs: number;
}

const DEFAULT_OPTIONS: OAuth2TokenManagerOptions = {
  refreshThresholdMs: 60_000,
};

export class OAuth2TokenManager {
  private refreshLocks = new Map<string, Promise<OAuth2Token>>();
  private cachedTokens = new Map<string, OAuth2Token>();

  constructor(
    private readonly credentialStore: ICredentialStore,
    private readonly encryption: ICredentialEncryptionProvider,
    private readonly refreshProvider: ITokenRefreshProvider,
    private readonly options: OAuth2TokenManagerOptions = DEFAULT_OPTIONS,
  ) {}

  async getValidToken(connectorId: ConnectorId, organizationId: UUID, userId?: UUID | null): Promise<OAuth2Token> {
    const token = await this.readToken(connectorId, organizationId, userId);

    if (!token) {
      throw new ConnectorAuthenticationError(
        connectorId, 'getValidToken', 'unknown',
        `No OAuth2 token found for ${connectorId}:${organizationId}`,
      );
    }

    if (!this.needsRefresh(token)) {
      return token;
    }

    if (!token.refreshToken) {
      throw new ConnectorAuthenticationError(
        connectorId, 'getValidToken', 'unknown',
        `Token expired and no refresh token available for ${connectorId}:${organizationId}`,
      );
    }

    return this.refreshTokenIfNeeded(connectorId, organizationId, userId, token);
  }

  isTokenExpired(token: OAuth2Token): boolean {
    return isExpired(token.expiresAt);
  }

  needsRefresh(token: OAuth2Token): boolean {
    if (isExpired(token.expiresAt)) return true;
    const expiry = new Date(token.expiresAt).getTime();
    const threshold = Date.now() + this.options.refreshThresholdMs;
    return expiry < threshold;
  }

  async refresh(connectorId: ConnectorId, organizationId: UUID, userId?: UUID | null): Promise<OAuth2Token> {
    const token = await this.readToken(connectorId, organizationId, userId);
    if (!token || !token.refreshToken) {
      throw new ConnectorAuthenticationError(
        connectorId, 'refresh', 'unknown',
        `No refresh token available for ${connectorId}:${organizationId}`,
      );
    }
    return this.refreshTokenIfNeeded(connectorId, organizationId, userId, token);
  }

  clearCache(connectorId?: ConnectorId, organizationId?: UUID): void {
    if (connectorId && organizationId) {
      const key = this.cacheKey(connectorId, organizationId);
      this.cachedTokens.delete(key);
      this.refreshLocks.delete(key);
    } else {
      this.cachedTokens.clear();
      this.refreshLocks.clear();
    }
  }

  private async refreshTokenIfNeeded(
    connectorId: ConnectorId,
    organizationId: UUID,
    userId: UUID | null | undefined,
    currentToken: OAuth2Token,
  ): Promise<OAuth2Token> {
    const lockKey = this.cacheKey(connectorId, organizationId);
    const existing = this.refreshLocks.get(lockKey);

    if (existing) {
      return existing;
    }

    const refreshPromise = this.doRefresh(connectorId, organizationId, userId, currentToken);
    this.refreshLocks.set(lockKey, refreshPromise);

    try {
      const newToken = await refreshPromise;
      this.cachedTokens.set(lockKey, newToken);
      await this.persistToken(connectorId, organizationId, userId, newToken);
      return newToken;
    } finally {
      this.refreshLocks.delete(lockKey);
    }
  }

  private async doRefresh(
    connectorId: ConnectorId,
    _organizationId: UUID,
    _userId: UUID | null | undefined,
    currentToken: OAuth2Token,
  ): Promise<OAuth2Token> {
    try {
      const refreshed = await this.refreshProvider.refresh(currentToken.refreshToken!, connectorId);
      return refreshed;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      throw new ConnectorAuthenticationError(
        connectorId, 'refresh', 'unknown',
        `Token refresh failed: ${message}`,
        e instanceof Error ? e : undefined,
      );
    }
  }

  private async readToken(connectorId: ConnectorId, organizationId: UUID, userId?: UUID | null): Promise<OAuth2Token | null> {
    const cacheKey = this.cacheKey(connectorId, organizationId);
    const cached = this.cachedTokens.get(cacheKey);
    if (cached) return cached;

    const record = await this.credentialStore.get(connectorId, organizationId, userId ?? null);
    if (!record) return null;

    try {
      const decrypted = this.encryption.decrypt(record.encryptedData);
      const token = JSON.parse(decrypted) as OAuth2Token;
      this.cachedTokens.set(cacheKey, token);
      return token;
    } catch {
      return null;
    }
  }

  private async persistToken(
    connectorId: ConnectorId,
    organizationId: UUID,
    userId: UUID | null | undefined,
    token: OAuth2Token,
  ): Promise<void> {
    const encrypted = this.encryption.encrypt(JSON.stringify(token));
    await this.credentialStore.save({
      connectorId,
      organizationId,
      userId: userId ?? null,
      credentialType: 'oauth2',
      encryptedData: encrypted,
      expiresAt: token.expiresAt,
      scopes: token.scope ? token.scope.split(' ') : [],
    });
  }

  private cacheKey(connectorId: ConnectorId, organizationId: UUID): string {
    return `${connectorId}:${organizationId}`;
  }
}
