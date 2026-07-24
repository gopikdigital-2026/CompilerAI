import type { CredentialResolver, ResolvedCredentials } from '../../../credentials/CredentialResolver';
import type { ConnectorId, UUID } from '../../../types/index';
import { ConnectorAuthenticationError } from '../../../errors/ConnectorAuthenticationError';

const GITHUB_CONNECTOR_ID: ConnectorId = 'github';

export class GitHubTokenAuthAdapter {
  constructor(
    private readonly credentialResolver: CredentialResolver,
  ) {}

  async getToken(organizationId: UUID, userId?: UUID | null): Promise<string> {
    const resolved = await this.credentialResolver.resolve(
      GITHUB_CONNECTOR_ID, organizationId, userId ?? null,
    );

    if (!resolved) {
      throw new ConnectorAuthenticationError(
        GITHUB_CONNECTOR_ID, 'getToken', 'unknown',
        `No GitHub credentials found for organization ${organizationId}`,
      );
    }

    const token = this.extractToken(resolved);

    if (!token || token.length === 0) {
      throw new ConnectorAuthenticationError(
        GITHUB_CONNECTOR_ID, 'getToken', 'unknown',
        'GitHub credential resolved but token is empty',
      );
    }

    return token;
  }

  async getAuthHeaders(organizationId: UUID, userId?: UUID | null): Promise<Record<string, string>> {
    const token = await this.getToken(organizationId, userId);
    return {
      'Authorization': `Bearer ${token}`,
    };
  }

  private extractToken(resolved: ResolvedCredentials): string | null {
    if (resolved.credentialType === 'oauth2') {
      const accessToken = resolved.data['accessToken'];
      if (typeof accessToken === 'string') return accessToken;
    }
    if (resolved.credentialType === 'api_key') {
      const apiKey = resolved.data['apiKey'];
      if (typeof apiKey === 'string') return apiKey;
    }
    if (resolved.credentialType === 'bearer') {
      const token = resolved.data['token'];
      if (typeof token === 'string') return token;
    }
    return null;
  }
}
