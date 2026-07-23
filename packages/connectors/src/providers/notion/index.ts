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
  id: 'notion',
  displayName: 'Notion',
  description: 'Connect to Notion for pages, databases, and workspace automation',
  category: 'knowledge',
  icon: 'notion',
  vendor: 'Notion',
  documentationUrl: 'https://developers.notion.com/',
  version: '1.0.0',
  tags: ['notion', 'pages', 'databases', 'knowledge', 'wiki'],
};

const CAPABILITIES: ConnectorCapability[] = [
  {
    name: 'create_page',
    method: 'create',
    description: 'Create a new page in a database or page',
    inputSchema: { parentId: 'string', properties: 'object', content: 'array' },
    outputSchema: { pageId: 'string', url: 'string' },
    requiredScopes: ['pages:write'],
  },
  {
    name: 'read_page',
    method: 'read',
    description: 'Read a page by ID',
    inputSchema: { pageId: 'string' },
    outputSchema: { page: 'object' },
    requiredScopes: ['pages:read'],
  },
  {
    name: 'query_database',
    method: 'search',
    description: 'Query a Notion database with filters',
    inputSchema: { databaseId: 'string', filter: 'object', sorts: 'array' },
    outputSchema: { results: 'array' },
    requiredScopes: ['databases:read'],
  },
  {
    name: 'create_database_entry',
    method: 'create',
    description: 'Add a new entry to a database',
    inputSchema: { databaseId: 'string', properties: 'object' },
    outputSchema: { pageId: 'string' },
    requiredScopes: ['databases:write'],
  },
  {
    name: 'search',
    method: 'search',
    description: 'Search across all accessible pages and databases',
    inputSchema: { query: 'string', filter: 'object' },
    outputSchema: { results: 'array' },
    requiredScopes: ['pages:read', 'databases:read'],
  },
  {
    name: 'update_page',
    method: 'update',
    description: 'Update page properties',
    inputSchema: { pageId: 'string', properties: 'object' },
    outputSchema: { updated: 'boolean' },
    requiredScopes: ['pages:write'],
  },
];

const AUTH_REQUIREMENTS: ConnectorAuthRequirements = {
  scheme: 'bearer',
  requiredFields: ['apiKey'],
  optionalFields: [],
  scopes: ['pages:read', 'pages:write', 'databases:read', 'databases:write'],
  tokenEndpoint: null,
  authorizationEndpoint: null,
  refreshSupported: false,
};

class NotionConnector extends BaseConnector {
  protected async onInitialize(): Promise<void> {}
  protected async onExecute(_capability: string, _input: Record<string, unknown>): Promise<unknown> {
    return { placeholder: true };
  }
}

export class NotionProvider implements ConnectorProvider {
  readonly providerId = 'notion';

  createConnector(config: ConnectorProviderConfig): Connector {
    void config;
    return new NotionConnector(METADATA, CAPABILITIES, AUTH_REQUIREMENTS);
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
