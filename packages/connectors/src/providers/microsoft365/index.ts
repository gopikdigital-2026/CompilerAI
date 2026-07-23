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
  id: 'microsoft365',
  displayName: 'Microsoft 365',
  description: 'Connect to Microsoft 365 services: Outlook, Teams, SharePoint, OneDrive',
  category: 'productivity',
  icon: 'microsoft',
  vendor: 'Microsoft',
  documentationUrl: 'https://learn.microsoft.com/en-us/graph/',
  version: '1.0.0',
  tags: ['microsoft', 'office365', 'outlook', 'teams', 'sharepoint', 'onedrive'],
};

const CAPABILITIES: ConnectorCapability[] = [
  {
    name: 'send_email',
    method: 'execute',
    description: 'Send an email via Outlook',
    inputSchema: { to: 'string', subject: 'string', body: 'string' },
    outputSchema: { messageId: 'string' },
    requiredScopes: ['Mail.Send'],
  },
  {
    name: 'read_emails',
    method: 'list',
    description: 'List emails from the inbox',
    inputSchema: { folder: 'string', top: 'number' },
    outputSchema: { messages: 'array' },
    requiredScopes: ['Mail.Read'],
  },
  {
    name: 'send_chat_message',
    method: 'execute',
    description: 'Send a message in a Teams channel',
    inputSchema: { channelId: 'string', message: 'string' },
    outputSchema: { messageId: 'string' },
    requiredScopes: ['ChannelMessage.Send'],
  },
  {
    name: 'list_files',
    method: 'list',
    description: 'List files from OneDrive',
    inputSchema: { path: 'string' },
    outputSchema: { files: 'array' },
    requiredScopes: ['Files.Read'],
  },
  {
    name: 'create_event',
    method: 'create',
    description: 'Create a calendar event',
    inputSchema: { subject: 'string', start: 'string', end: 'string' },
    outputSchema: { eventId: 'string' },
    requiredScopes: ['Calendars.ReadWrite'],
  },
];

const AUTH_REQUIREMENTS: ConnectorAuthRequirements = {
  scheme: 'oauth2',
  requiredFields: ['clientId', 'clientSecret', 'tenantId'],
  optionalFields: ['redirectUri'],
  scopes: ['Mail.Send', 'Mail.Read', 'ChannelMessage.Send', 'Files.Read', 'Calendars.ReadWrite'],
  tokenEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
  authorizationEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
  refreshSupported: true,
};

class Microsoft365Connector extends BaseConnector {
  protected async onInitialize(): Promise<void> {}
  protected async onExecute(_capability: string, _input: Record<string, unknown>): Promise<unknown> {
    return { placeholder: true };
  }
}

export class Microsoft365Provider implements ConnectorProvider {
  readonly providerId = 'microsoft365';

  createConnector(config: ConnectorProviderConfig): Connector {
    void config;
    return new Microsoft365Connector(METADATA, CAPABILITIES, AUTH_REQUIREMENTS);
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
