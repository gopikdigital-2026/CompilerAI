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
  id: 'google_workspace',
  displayName: 'Google Workspace',
  description: 'Connect to Google Workspace services: Gmail, Drive, Calendar, Sheets',
  category: 'productivity',
  icon: 'google',
  vendor: 'Google',
  documentationUrl: 'https://developers.google.com/workspace',
  version: '1.0.0',
  tags: ['google', 'gmail', 'drive', 'calendar', 'sheets', 'workspace'],
};

const CAPABILITIES: ConnectorCapability[] = [
  {
    name: 'send_email',
    method: 'execute',
    description: 'Send an email via Gmail',
    inputSchema: { to: 'string', subject: 'string', body: 'string' },
    outputSchema: { messageId: 'string' },
    requiredScopes: ['https://www.googleapis.com/auth/gmail.send'],
  },
  {
    name: 'read_emails',
    method: 'list',
    description: 'List emails from Gmail',
    inputSchema: { label: 'string', maxResults: 'number' },
    outputSchema: { messages: 'array' },
    requiredScopes: ['https://www.googleapis.com/auth/gmail.readonly'],
  },
  {
    name: 'list_files',
    method: 'list',
    description: 'List files from Google Drive',
    inputSchema: { query: 'string' },
    outputSchema: { files: 'array' },
    requiredScopes: ['https://www.googleapis.com/auth/drive.readonly'],
  },
  {
    name: 'create_event',
    method: 'create',
    description: 'Create a Google Calendar event',
    inputSchema: { summary: 'string', start: 'string', end: 'string' },
    outputSchema: { eventId: 'string' },
    requiredScopes: ['https://www.googleapis.com/auth/calendar'],
  },
  {
    name: 'append_sheet_row',
    method: 'create',
    description: 'Append a row to a Google Sheet',
    inputSchema: { spreadsheetId: 'string', range: 'string', values: 'array' },
    outputSchema: { updatedCells: 'number' },
    requiredScopes: ['https://www.googleapis.com/auth/spreadsheets'],
  },
];

const AUTH_REQUIREMENTS: ConnectorAuthRequirements = {
  scheme: 'oauth2',
  requiredFields: ['clientId', 'clientSecret'],
  optionalFields: ['redirectUri'],
  scopes: [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/spreadsheets',
  ],
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  refreshSupported: true,
};

class GoogleWorkspaceConnector extends BaseConnector {
  protected async onInitialize(): Promise<void> {}
  protected async onExecute(_capability: string, _input: Record<string, unknown>): Promise<unknown> {
    return { placeholder: true };
  }
}

export class GoogleWorkspaceProvider implements ConnectorProvider {
  readonly providerId = 'google_workspace';

  createConnector(config: ConnectorProviderConfig): Connector {
    void config;
    return new GoogleWorkspaceConnector(METADATA, CAPABILITIES, AUTH_REQUIREMENTS);
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
