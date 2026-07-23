import type {
  Connector,
  ConnectorProvider,
  ConnectorMetadata,
  ConnectorCapability,
  ConnectorAuthRequirements,
  ConnectorProviderConfig,
} from '../../types/index';
import { BaseConnector } from '../../core/BaseConnector';

const METADATA: ConnectorMetadata = {
  id: 'github',
  displayName: 'GitHub',
  description: 'Connect to GitHub for repositories, issues, pull requests, and CI/CD',
  category: 'development',
  icon: 'github',
  vendor: 'GitHub',
  documentationUrl: 'https://docs.github.com/en/rest',
  version: '1.0.0',
  tags: ['github', 'git', 'repositories', 'issues', 'pull-requests', 'ci-cd'],
};

const CAPABILITIES: ConnectorCapability[] = [
  {
    name: 'create_issue',
    method: 'create',
    description: 'Create an issue in a repository',
    inputSchema: { owner: 'string', repo: 'string', title: 'string', body: 'string' },
    outputSchema: { issueNumber: 'number', issueId: 'number' },
    requiredScopes: ['repo'],
  },
  {
    name: 'list_issues',
    method: 'list',
    description: 'List issues in a repository',
    inputSchema: { owner: 'string', repo: 'string', state: 'string' },
    outputSchema: { issues: 'array' },
    requiredScopes: ['repo'],
  },
  {
    name: 'create_pull_request',
    method: 'create',
    description: 'Create a pull request',
    inputSchema: { owner: 'string', repo: 'string', title: 'string', head: 'string', base: 'string' },
    outputSchema: { prNumber: 'number' },
    requiredScopes: ['repo'],
  },
  {
    name: 'list_repositories',
    method: 'list',
    description: 'List repositories for the authenticated user',
    inputSchema: { perPage: 'number' },
    outputSchema: { repositories: 'array' },
    requiredScopes: ['repo'],
  },
  {
    name: 'trigger_workflow',
    method: 'execute',
    description: 'Trigger a GitHub Actions workflow',
    inputSchema: { owner: 'string', repo: 'string', workflowId: 'string', ref: 'string' },
    outputSchema: { workflowRunId: 'number' },
    requiredScopes: ['repo'],
  },
  {
    name: 'webhook_receive',
    method: 'webhook',
    description: 'Receive GitHub webhook events',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: ['repo:webhook'],
  },
];

const AUTH_REQUIREMENTS: ConnectorAuthRequirements = {
  scheme: 'oauth2',
  requiredFields: ['clientId', 'clientSecret'],
  optionalFields: ['personalAccessToken', 'webhookSecret'],
  scopes: ['repo', 'repo:status', 'repo:webhook', 'read:org'],
  tokenEndpoint: 'https://github.com/login/oauth/access_token',
  authorizationEndpoint: 'https://github.com/login/oauth/authorize',
  refreshSupported: false,
};

class GitHubConnector extends BaseConnector {
  protected async onInitialize(): Promise<void> {}
  protected async onExecute(_capability: string, _input: Record<string, unknown>): Promise<unknown> {
    return { placeholder: true };
  }
}

export class GitHubProvider implements ConnectorProvider {
  readonly providerId = 'github';

  createConnector(config: ConnectorProviderConfig): Connector {
    void config;
    return new GitHubConnector(METADATA, CAPABILITIES, AUTH_REQUIREMENTS);
  }

  getMetadata(): ConnectorMetadata {
    return METADATA;
  }

  getCapabilities(): ConnectorCapability[] {
    return CAPABILITIES;
  }

  getAuthRequirements(): ConnectorAuthRequirements {
    return AUTH_REQUIREMENTS;
  }
}
