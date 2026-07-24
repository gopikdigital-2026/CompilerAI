import type { ConnectorProvider, ConnectorMetadata, ConnectorCapability, ConnectorAuthRequirements, Connector, ConnectorProviderConfig } from '../../types/index';
import { GitHubConnector } from './GitHubConnector';
import { GitHubApiClient, DEFAULT_GITHUB_CONFIG } from './GitHubApiClient';
import { GitHubTokenAuthAdapter } from './auth/GitHubTokenAuthAdapter';
import type { CredentialResolver } from '../../credentials/CredentialResolver';
import type { GitHubApiClientConfig } from './GitHubApiClient';

const METADATA: ConnectorMetadata = {
  id: 'github',
  displayName: 'GitHub',
  description: 'GitHub developer platform connector for repositories, issues, pull requests, and Actions',
  category: 'development',
  version: '1.0.0',
  documentationUrl: 'https://docs.github.com',
  vendor: 'GitHub, Inc.',
  icon: 'github',
  tags: ['git', 'ci-cd', 'issues', 'pull-requests', 'workflows', 'developer-tools'],
};

const CAPABILITIES: ConnectorCapability[] = [
  {
    name: 'identity.read',
    method: 'read',
    description: 'Get the authenticated GitHub user',
    inputSchema: { organizationId: 'string' },
    outputSchema: { user: 'GitHubUser' },
    requiredScopes: [],
  },
  {
    name: 'repositories.read',
    method: 'list',
    description: 'List and get GitHub repositories',
    inputSchema: { owner: 'string', repository: 'string' },
    outputSchema: { repository: 'GitHubRepository' },
    requiredScopes: ['repo'],
  },
  {
    name: 'issues.read',
    method: 'list',
    description: 'List and get GitHub issues',
    inputSchema: { owner: 'string', repository: 'string' },
    outputSchema: { issue: 'GitHubIssue' },
    requiredScopes: ['repo'],
  },
  {
    name: 'issues.write',
    method: 'create',
    description: 'Create issues and add comments',
    inputSchema: { owner: 'string', repository: 'string', title: 'string' },
    outputSchema: { issue: 'GitHubIssue' },
    requiredScopes: ['repo'],
  },
  {
    name: 'pull_requests.read',
    method: 'list',
    description: 'List and get GitHub pull requests',
    inputSchema: { owner: 'string', repository: 'string' },
    outputSchema: { pullRequest: 'GitHubPullRequest' },
    requiredScopes: ['repo'],
  },
  {
    name: 'actions.read',
    method: 'list',
    description: 'List GitHub Actions workflow runs',
    inputSchema: { owner: 'string', repository: 'string' },
    outputSchema: { runs: 'GitHubWorkflowRun[]' },
    requiredScopes: ['repo'],
  },
  {
    name: 'actions.trigger',
    method: 'execute',
    description: 'Trigger a GitHub Actions workflow dispatch',
    inputSchema: { owner: 'string', repository: 'string', workflowId: 'string', ref: 'string' },
    outputSchema: { accepted: 'boolean' },
    requiredScopes: ['repo'],
  },
  {
    name: 'webhooks.verify',
    method: 'webhook',
    description: 'Verify GitHub webhook signatures using HMAC-SHA256',
    inputSchema: { signature: 'string', payload: 'string' },
    outputSchema: { verified: 'boolean' },
    requiredScopes: [],
  },
  {
    name: 'pagination',
    method: 'list',
    description: 'Supports GitHub pagination via Link header',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: [],
  },
  {
    name: 'rate_limit.aware',
    method: 'read',
    description: 'Interprets GitHub rate limit headers and normalizes rate limit errors',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: [],
  },
];

const AUTH_REQUIREMENTS: ConnectorAuthRequirements = {
  scheme: 'oauth2',
  requiredFields: ['accessToken'],
  optionalFields: ['webhookSecret'],
  scopes: ['repo', 'repo:status', 'read:org', 'workflow'],
  refreshSupported: false,
  tokenEndpoint: null,
  authorizationEndpoint: null,
};

export class GitHubConnectorProvider implements ConnectorProvider {
  readonly providerId = 'github';

  constructor(
    private readonly credentialResolver: CredentialResolver,
    private readonly apiClientConfig?: GitHubApiClientConfig,
  ) {}

  getMetadata(): ConnectorMetadata {
    return METADATA;
  }

  getCapabilities(): ConnectorCapability[] {
    return CAPABILITIES;
  }

  getAuthRequirements(): ConnectorAuthRequirements {
    return AUTH_REQUIREMENTS;
  }

  createConnector(_config: ConnectorProviderConfig): Connector {
    const client = new GitHubApiClient(this.apiClientConfig ?? DEFAULT_GITHUB_CONFIG);
    const authAdapter = new GitHubTokenAuthAdapter(this.credentialResolver);
    return new GitHubConnector(client, authAdapter);
  }

  getApiClient(): GitHubApiClient {
    return new GitHubApiClient(this.apiClientConfig ?? DEFAULT_GITHUB_CONFIG);
  }

  getAuthAdapter(): GitHubTokenAuthAdapter {
    return new GitHubTokenAuthAdapter(this.credentialResolver);
  }
}
