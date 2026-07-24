import type { CredentialResolver, ResolvedCredentials } from '../../../credentials/CredentialResolver';
import type { ConnectorId, UUID } from '../../../types/index';
import type { GitHubAppCredentials } from './GitHubAppAuthContracts';
import type { GitHubAppJwtProvider, Clock } from './GitHubAppJwtProvider';
import type { GitHubInstallationTokenProvider } from './GitHubInstallationTokenProvider';
import type { InstallationTokenKey } from './GitHubInstallationTokenCache';
import type { FetchLike } from '../GitHubOperationsFactory';
import { ConnectorAuthenticationError } from '../../../errors/ConnectorAuthenticationError';

const GITHUB_CONNECTOR_ID: ConnectorId = 'github';

export class GitHubAppCredentialResolver {
  constructor(
    private readonly credentialResolver: CredentialResolver,
    private readonly tokenProvider: GitHubInstallationTokenProvider,
    _jwtProvider: GitHubAppJwtProvider,
    _clock: Clock,
  ) {}

  async getInstallationToken(
    organizationId: UUID,
    installationId: number,
    transport?: FetchLike,
  ): Promise<string> {
    const credentials = await this.resolveAppCredentials(organizationId);
    const token = await this.tokenProvider.getToken(
      credentials,
      organizationId,
      installationId,
      transport,
    );
    return token.token;
  }

  async getAuthHeaders(
    organizationId: UUID,
    installationId: number,
    transport?: FetchLike,
  ): Promise<Record<string, string>> {
    const token = await this.getInstallationToken(organizationId, installationId, transport);
    return {
      'Authorization': `Bearer ${token}`,
    };
  }

  getCachedToken(organizationId: UUID, installationId: number) {
    const key: InstallationTokenKey = { organizationId, installationId };
    return this.tokenProvider.getCachedToken(key);
  }

  isTokenExpired(organizationId: UUID, installationId: number): boolean {
    const token = this.getCachedToken(organizationId, installationId);
    if (!token) return true;
    return this.tokenProvider.isTokenExpired(token);
  }

  invalidateCache(organizationId: UUID, installationId: number): void {
    this.tokenProvider.invalidateCache({ organizationId, installationId });
  }

  private async resolveAppCredentials(organizationId: UUID): Promise<GitHubAppCredentials> {
    let resolved: ResolvedCredentials | null;
    try {
      resolved = await this.credentialResolver.resolve(GITHUB_CONNECTOR_ID, organizationId, null);
    } catch {
      resolved = null;
    }

    if (!resolved) {
      throw new ConnectorAuthenticationError(
        GITHUB_CONNECTOR_ID, 'getInstallationToken', 'unknown',
        `No GitHub App credentials found for organization ${organizationId}`,
      );
    }

    const appId = resolved.data['appId'];
    const privateKey = resolved.data['privateKey'];
    const installationIdRaw = resolved.data['installationId'];

    if (typeof appId !== 'number' || typeof privateKey !== 'string' || typeof installationIdRaw !== 'number') {
      throw new ConnectorAuthenticationError(
        GITHUB_CONNECTOR_ID, 'getInstallationToken', 'unknown',
        'GitHub App credentials missing required fields (appId, privateKey, installationId)',
      );
    }

    return {
      appId,
      privateKey,
      installationId: installationIdRaw,
      clientId: typeof resolved.data['clientId'] === 'string' ? resolved.data['clientId'] : undefined,
      clientSecret: typeof resolved.data['clientSecret'] === 'string' ? resolved.data['clientSecret'] : undefined,
    };
  }
}
