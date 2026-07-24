import { BaseConnector } from '../../core/BaseConnector';
import type { ConnectorMetadata, ConnectorCapability, ConnectorAuthRequirements } from '../../types/index';
import { GOOGLE_DRIVE_SCOPES, GOOGLE_GMAIL_SCOPES, GOOGLE_CALENDAR_SCOPES, GOOGLE_TOKEN_ENDPOINT, GOOGLE_AUTHORIZATION_ENDPOINT } from './auth/GoogleOAuth2Scopes';

const METADATA: ConnectorMetadata = {
  id: 'google-workspace',
  displayName: 'Google Workspace',
  description: 'Google Workspace connector for Google Drive, Gmail, and Calendar',
  category: 'productivity',
  icon: 'google',
  vendor: 'Google LLC',
  documentationUrl: 'https://developers.google.com/workspace',
  version: '1.0.0',
  tags: ['google', 'gmail', 'drive', 'calendar', 'workspace', 'productivity'],
};

const CAPABILITIES: ConnectorCapability[] = [
  {
    name: 'drive.files.read',
    method: 'list',
    description: 'List and get Google Drive files',
    inputSchema: { organizationId: 'string', query: 'string?', pageToken: 'string?' },
    outputSchema: { items: 'GoogleDriveFile[]', nextPageToken: 'string?' },
    requiredScopes: [GOOGLE_DRIVE_SCOPES.METADATA_READONLY, GOOGLE_DRIVE_SCOPES.FILE],
  },
  {
    name: 'drive.search',
    method: 'search',
    description: 'Search Google Drive files by name, content, or metadata',
    inputSchema: { organizationId: 'string', name: 'string?', contentSearch: 'string?' },
    outputSchema: { items: 'GoogleDriveFile[]', nextPageToken: 'string?' },
    requiredScopes: [GOOGLE_DRIVE_SCOPES.METADATA_READONLY, GOOGLE_DRIVE_SCOPES.FILE],
  },
  {
    name: 'drive.files.write',
    method: 'create',
    description: 'Create folders, upload files, and update file metadata in Google Drive',
    inputSchema: { organizationId: 'string', name: 'string', parentFolderId: 'string?' },
    outputSchema: { fileId: 'string' },
    requiredScopes: [GOOGLE_DRIVE_SCOPES.FILE],
  },
  {
    name: 'gmail.messages.read',
    method: 'list',
    description: 'List and get Gmail messages',
    inputSchema: { organizationId: 'string', query: 'string?', pageToken: 'string?' },
    outputSchema: { messages: 'array', nextPageToken: 'string?' },
    requiredScopes: [GOOGLE_GMAIL_SCOPES.READONLY],
  },
  {
    name: 'gmail.labels.read',
    method: 'list',
    description: 'List Gmail labels',
    inputSchema: { organizationId: 'string' },
    outputSchema: { labels: 'GoogleGmailLabel[]' },
    requiredScopes: [GOOGLE_GMAIL_SCOPES.READONLY],
  },
  {
    name: 'gmail.messages.send',
    method: 'execute',
    description: 'Send Gmail messages and create drafts',
    inputSchema: { organizationId: 'string', to: 'string[]', subject: 'string' },
    outputSchema: { messageId: 'string', threadId: 'string' },
    requiredScopes: [GOOGLE_GMAIL_SCOPES.SEND],
  },
  {
    name: 'calendar.calendars.read',
    method: 'list',
    description: 'List and get Google Calendar calendars',
    inputSchema: { organizationId: 'string', pageToken: 'string?' },
    outputSchema: { calendars: 'GoogleCalendarInfo[]', nextPageToken: 'string?' },
    requiredScopes: [GOOGLE_CALENDAR_SCOPES.READONLY],
  },
  {
    name: 'calendar.events.read',
    method: 'list',
    description: 'List and get Google Calendar events, query free/busy',
    inputSchema: { organizationId: 'string', calendarId: 'string', pageToken: 'string?' },
    outputSchema: { events: 'GoogleCalendarEvent[]', nextPageToken: 'string?' },
    requiredScopes: [GOOGLE_CALENDAR_SCOPES.READONLY, GOOGLE_CALENDAR_SCOPES.EVENTS],
  },
  {
    name: 'calendar.events.write',
    method: 'create',
    description: 'Create and update Google Calendar events',
    inputSchema: { organizationId: 'string', calendarId: 'string', summary: 'string' },
    outputSchema: { event: 'GoogleCalendarEvent' },
    requiredScopes: [GOOGLE_CALENDAR_SCOPES.EVENTS],
  },
  {
    name: 'pagination',
    method: 'list',
    description: 'Supports Google token-based pagination via nextPageToken',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: [],
  },
  {
    name: 'rate_limit.aware',
    method: 'read',
    description: 'Interprets Google rate limit headers and normalizes rate limit errors',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: [],
  },
];

const AUTH_REQUIREMENTS: ConnectorAuthRequirements = {
  scheme: 'oauth2',
  requiredFields: ['clientId', 'clientSecret', 'refreshToken', 'accessToken'],
  optionalFields: ['redirectUri'],
  scopes: [
    GOOGLE_DRIVE_SCOPES.METADATA_READONLY,
    GOOGLE_DRIVE_SCOPES.FILE,
    GOOGLE_GMAIL_SCOPES.READONLY,
    GOOGLE_GMAIL_SCOPES.SEND,
    GOOGLE_GMAIL_SCOPES.LABELS,
    GOOGLE_CALENDAR_SCOPES.READONLY,
    GOOGLE_CALENDAR_SCOPES.EVENTS,
  ],
  tokenEndpoint: GOOGLE_TOKEN_ENDPOINT,
  authorizationEndpoint: GOOGLE_AUTHORIZATION_ENDPOINT,
  refreshSupported: true,
};

export class GoogleWorkspaceConnector extends BaseConnector {
  protected async onInitialize(): Promise<void> {}

  protected async onExecute(
    _capability: string,
    _input: Record<string, unknown>,
  ): Promise<unknown> {
    throw new Error(
      'GoogleWorkspaceConnector.onExecute is not supported. Use ConnectorRuntime.execute() with registered Google operations via registerGoogleConnector().',
    );
  }

  protected async onDisconnect(): Promise<void> {}

  static readonly metadata = METADATA;
  static readonly capabilities = CAPABILITIES;
  static readonly authRequirements = AUTH_REQUIREMENTS;
}

export { METADATA as GOOGLE_WORKSPACE_METADATA, CAPABILITIES as GOOGLE_WORKSPACE_CAPABILITIES, AUTH_REQUIREMENTS as GOOGLE_WORKSPACE_AUTH_REQUIREMENTS };
