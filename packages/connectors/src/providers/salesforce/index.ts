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
  id: 'salesforce',
  displayName: 'Salesforce',
  description: 'Connect to Salesforce for CRM, leads, opportunities, and custom objects',
  category: 'crm',
  icon: 'salesforce',
  vendor: 'Salesforce',
  documentationUrl: 'https://developer.salesforce.com/docs/api/',
  version: '1.0.0',
  tags: ['salesforce', 'crm', 'leads', 'opportunities', 'sobjects'],
};

const CAPABILITIES: ConnectorCapability[] = [
  {
    name: 'create_lead',
    method: 'create',
    description: 'Create a new lead',
    inputSchema: { firstName: 'string', lastName: 'string', company: 'string', email: 'string' },
    outputSchema: { leadId: 'string', success: 'boolean' },
    requiredScopes: ['api'],
  },
  {
    name: 'query_records',
    method: 'search',
    description: 'Execute a SOQL query',
    inputSchema: { soql: 'string' },
    outputSchema: { records: 'array', totalSize: 'number' },
    requiredScopes: ['api'],
  },
  {
    name: 'update_record',
    method: 'update',
    description: 'Update a record by object type and ID',
    inputSchema: { objectType: 'string', recordId: 'string', fields: 'object' },
    outputSchema: { success: 'boolean' },
    requiredScopes: ['api'],
  },
  {
    name: 'create_opportunity',
    method: 'create',
    description: 'Create a new opportunity',
    inputSchema: { name: 'string', stageName: 'string', closeDate: 'string', amount: 'number' },
    outputSchema: { opportunityId: 'string' },
    requiredScopes: ['api'],
  },
  {
    name: 'list_objects',
    method: 'list',
    description: 'List all Salesforce object types',
    inputSchema: {},
    outputSchema: { sobjects: 'array' },
    requiredScopes: ['api'],
  },
  {
    name: 'get_record',
    method: 'read',
    description: 'Get a single record by ID',
    inputSchema: { objectType: 'string', recordId: 'string' },
    outputSchema: { record: 'object' },
    requiredScopes: ['api'],
  },
];

const AUTH_REQUIREMENTS: ConnectorAuthRequirements = {
  scheme: 'oauth2',
  requiredFields: ['clientId', 'clientSecret', 'instanceUrl'],
  optionalFields: ['username', 'password', 'securityToken'],
  scopes: ['api', 'refresh_token', 'offline_access'],
  tokenEndpoint: 'https://login.salesforce.com/services/oauth2/token',
  authorizationEndpoint: 'https://login.salesforce.com/services/oauth2/authorize',
  refreshSupported: true,
};

class SalesforceConnector extends BaseConnector {
  protected async onInitialize(): Promise<void> {}
  protected async onExecute(_capability: string, _input: Record<string, unknown>): Promise<unknown> {
    return { placeholder: true };
  }
}

export class SalesforceProvider implements ConnectorProvider {
  readonly providerId = 'salesforce';

  createConnector(config: ConnectorProviderConfig): Connector {
    void config;
    return new SalesforceConnector(METADATA, CAPABILITIES, AUTH_REQUIREMENTS);
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
