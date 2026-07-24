import { BaseConnector } from '../../core/BaseConnector';
import type { ConnectorContext } from '../../types/index';
import type { GitHubApiClient } from './GitHubApiClient';
import type { GitHubTokenAuthAdapter } from './auth/GitHubTokenAuthAdapter';
import type { ConnectorMetadata, ConnectorCapability, ConnectorAuthRequirements } from '../../types/index';
import { GitHubResponseMapper } from './GitHubResponseMapper';

const METADATA: ConnectorMetadata = {
  id: 'github',
  displayName: 'GitHub',
  description: 'GitHub developer platform connector',
  category: 'development',
  version: '1.0.0',
  documentationUrl: 'https://docs.github.com',
  vendor: 'GitHub, Inc.',
  icon: 'github',
  tags: ['git', 'ci-cd', 'issues', 'pull-requests', 'workflows'],
};

const CAPABILITIES: ConnectorCapability[] = [
  {
    name: 'get_authenticated_user',
    method: 'read',
    description: 'Get the authenticated GitHub user',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: [],
  },
];

const AUTH_REQUIREMENTS: ConnectorAuthRequirements = {
  scheme: 'oauth2',
  requiredFields: ['accessToken'],
  optionalFields: ['webhookSecret'],
  scopes: ['repo'],
  refreshSupported: false,
  tokenEndpoint: null,
  authorizationEndpoint: null,
};

export class GitHubConnector extends BaseConnector {
  constructor(
    private readonly apiClient: GitHubApiClient,
    private readonly authAdapter: GitHubTokenAuthAdapter,
  ) {
    super(METADATA, CAPABILITIES, AUTH_REQUIREMENTS);
  }

  protected async onInitialize(): Promise<void> {
    // Token is resolved through the auth adapter at execution time
  }

  protected async onExecute(
    capability: string,
    _input: Record<string, unknown>,
    context: ConnectorContext,
  ): Promise<unknown> {
    const token = await this.authAdapter.getToken(context.organizationId, context.userId);

    switch (capability) {
      case 'get_authenticated_user': {
        const response = await this.apiClient.get<unknown>('user', {}, {
          token,
          signal: new AbortController().signal,
        });
        return GitHubResponseMapper.mapUser(response.data as never);
      }
      default:
        throw new Error(`Unsupported capability: ${capability}`);
    }
  }

  protected async onDisconnect(): Promise<void> {
    // No persistent resources to clean up
  }
}
