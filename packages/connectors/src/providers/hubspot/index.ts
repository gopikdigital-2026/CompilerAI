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
  id: 'hubspot',
  displayName: 'HubSpot',
  description: 'Connect to HubSpot for contacts, deals, companies, and marketing automation',
  category: 'crm',
  icon: 'hubspot',
  vendor: 'HubSpot',
  documentationUrl: 'https://developers.hubspot.com/docs/overview',
  version: '1.0.0',
  tags: ['hubspot', 'crm', 'contacts', 'deals', 'marketing', 'companies'],
};

const CAPABILITIES: ConnectorCapability[] = [
  {
    name: 'create_contact',
    method: 'create',
    description: 'Create a new contact',
    inputSchema: { firstname: 'string', lastname: 'string', email: 'string', phone: 'string' },
    outputSchema: { contactId: 'string' },
    requiredScopes: ['crm.objects.contacts.write'],
  },
  {
    name: 'list_contacts',
    method: 'list',
    description: 'List contacts with pagination',
    inputSchema: { limit: 'number', after: 'string' },
    outputSchema: { contacts: 'array', paging: 'object' },
    requiredScopes: ['crm.objects.contacts.read'],
  },
  {
    name: 'create_deal',
    method: 'create',
    description: 'Create a new deal',
    inputSchema: { dealname: 'string', dealstage: 'string', amount: 'number', pipeline: 'string' },
    outputSchema: { dealId: 'string' },
    requiredScopes: ['crm.objects.deals.write'],
  },
  {
    name: 'update_contact',
    method: 'update',
    description: 'Update a contact by ID',
    inputSchema: { contactId: 'string', properties: 'object' },
    outputSchema: { success: 'boolean' },
    requiredScopes: ['crm.objects.contacts.write'],
  },
  {
    name: 'search_contacts',
    method: 'search',
    description: 'Search contacts with filters',
    inputSchema: { query: 'string', filterGroups: 'array' },
    outputSchema: { results: 'array', total: 'number' },
    requiredScopes: ['crm.objects.contacts.read'],
  },
  {
    name: 'create_company',
    method: 'create',
    description: 'Create a new company record',
    inputSchema: { name: 'string', domain: 'string', industry: 'string' },
    outputSchema: { companyId: 'string' },
    requiredScopes: ['crm.objects.companies.write'],
  },
];

const AUTH_REQUIREMENTS: ConnectorAuthRequirements = {
  scheme: 'oauth2',
  requiredFields: ['clientId', 'clientSecret'],
  optionalFields: ['apiKey', 'privateAppKey'],
  scopes: [
    'crm.objects.contacts.read',
    'crm.objects.contacts.write',
    'crm.objects.deals.write',
    'crm.objects.companies.write',
  ],
  tokenEndpoint: 'https://api.hubapi.com/oauth/v1/token',
  authorizationEndpoint: 'https://app.hubspot.com/oauth/authorize',
  refreshSupported: true,
};

class HubSpotConnector extends BaseConnector {
  protected async onInitialize(): Promise<void> {}
  protected async onExecute(_capability: string, _input: Record<string, unknown>): Promise<unknown> {
    return { placeholder: true };
  }
}

export class HubSpotProvider implements ConnectorProvider {
  readonly providerId = 'hubspot';

  createConnector(config: ConnectorProviderConfig): Connector {
    void config;
    return new HubSpotConnector(METADATA, CAPABILITIES, AUTH_REQUIREMENTS);
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
