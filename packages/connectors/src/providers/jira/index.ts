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
  id: 'jira',
  displayName: 'Jira',
  description: 'Connect to Jira for issue tracking, projects, and sprint management',
  category: 'project_management',
  icon: 'jira',
  vendor: 'Atlassian',
  documentationUrl: 'https://developer.atlassian.com/cloud/jira/platform/rest/v3/',
  version: '1.0.0',
  tags: ['jira', 'atlassian', 'issues', 'projects', 'sprints', 'agile'],
};

const CAPABILITIES: ConnectorCapability[] = [
  {
    name: 'create_issue',
    method: 'create',
    description: 'Create a Jira issue',
    inputSchema: { projectKey: 'string', issueType: 'string', summary: 'string', description: 'string' },
    outputSchema: { issueKey: 'string', issueId: 'string' },
    requiredScopes: ['write:jira-work'],
  },
  {
    name: 'list_issues',
    method: 'list',
    description: 'List issues using JQL',
    inputSchema: { jql: 'string', maxResults: 'number' },
    outputSchema: { issues: 'array' },
    requiredScopes: ['read:jira-work'],
  },
  {
    name: 'update_issue',
    method: 'update',
    description: 'Update a Jira issue',
    inputSchema: { issueKey: 'string', fields: 'object' },
    outputSchema: { updated: 'boolean' },
    requiredScopes: ['write:jira-work'],
  },
  {
    name: 'transition_issue',
    method: 'execute',
    description: 'Transition an issue to a new status',
    inputSchema: { issueKey: 'string', transitionId: 'string' },
    outputSchema: { transitioned: 'boolean' },
    requiredScopes: ['write:jira-work'],
  },
  {
    name: 'list_projects',
    method: 'list',
    description: 'List all accessible projects',
    inputSchema: {},
    outputSchema: { projects: 'array' },
    requiredScopes: ['read:jira-work'],
  },
  {
    name: 'add_comment',
    method: 'create',
    description: 'Add a comment to an issue',
    inputSchema: { issueKey: 'string', body: 'string' },
    outputSchema: { commentId: 'string' },
    requiredScopes: ['write:jira-work'],
  },
];

const AUTH_REQUIREMENTS: ConnectorAuthRequirements = {
  scheme: 'oauth2',
  requiredFields: ['clientId', 'clientSecret', 'cloudId'],
  optionalFields: ['apiToken', 'siteUrl'],
  scopes: ['read:jira-work', 'write:jira-work', 'read:jira-user', 'write:jira-user'],
  tokenEndpoint: 'https://api.atlassian.com/oauth/token',
  authorizationEndpoint: 'https://auth.atlassian.com/authorize',
  refreshSupported: true,
};

class JiraConnector extends BaseConnector {
  protected async onInitialize(): Promise<void> {}
  protected async onExecute(_capability: string, _input: Record<string, unknown>): Promise<unknown> {
    return { placeholder: true };
  }
}

export class JiraProvider implements ConnectorProvider {
  readonly providerId = 'jira';

  createConnector(config: ConnectorProviderConfig): Connector {
    void config;
    return new JiraConnector(METADATA, CAPABILITIES, AUTH_REQUIREMENTS);
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
