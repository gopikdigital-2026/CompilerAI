import type { ConnectorRuntime } from '../../runtime/ConnectorRuntime';
import type { ConnectorOperation } from '../../runtime/ConnectorExecutionResult';
import type { CredentialResolver } from '../../credentials/CredentialResolver';
import type { ConnectorTelemetry } from '../../observability/ConnectorTelemetry';
import type { GoogleApiClientConfig, FetchLike } from './GoogleApiClient';
import { GoogleApiClient, DEFAULT_GOOGLE_CONFIG } from './GoogleApiClient';
import { GoogleOAuth2Adapter } from './auth/GoogleOAuth2Adapter';
import { GoogleTokenRefreshProvider } from './auth/GoogleTokenRefreshProvider';
import type { IGoogleTokenRefreshProvider } from './auth/GoogleTokenRefreshProvider';

import { createListFilesOperation } from './drive/operations/ListFilesOperation';
import { createGetFileOperation } from './drive/operations/GetFileOperation';
import { createSearchFilesOperation } from './drive/operations/SearchFilesOperation';
import { createCreateFolderOperation } from './drive/operations/CreateFolderOperation';
import { createUploadFileOperation } from './drive/operations/UploadFileOperation';
import { createUpdateFileMetadataOperation } from './drive/operations/UpdateFileMetadataOperation';

import { createListMessagesOperation } from './gmail/operations/ListMessagesOperation';
import { createGetMessageOperation } from './gmail/operations/GetMessageOperation';
import { createListLabelsOperation } from './gmail/operations/ListLabelsOperation';
import { createSendMessageOperation } from './gmail/operations/SendMessageOperation';
import { createCreateDraftOperation } from './gmail/operations/CreateDraftOperation';

import { createListCalendarsOperation } from './calendar/operations/ListCalendarsOperation';
import { createGetCalendarOperation } from './calendar/operations/GetCalendarOperation';
import { createListEventsOperation } from './calendar/operations/ListEventsOperation';
import { createGetEventOperation } from './calendar/operations/GetEventOperation';
import { createCreateEventOperation } from './calendar/operations/CreateEventOperation';
import { createUpdateEventOperation } from './calendar/operations/UpdateEventOperation';
import { createQueryFreeBusyOperation } from './calendar/operations/QueryFreeBusyOperation';

export const GOOGLE_CONNECTOR_ID = 'google-workspace' as const;

export interface RegisterGoogleConnectorOptions {
  runtime: ConnectorRuntime;
  credentialResolver: CredentialResolver;
  apiClientConfig?: GoogleApiClientConfig;
  transport?: FetchLike;
  refreshProvider?: IGoogleTokenRefreshProvider;
  telemetry?: ConnectorTelemetry;
}

export function createGoogleWorkspaceOperations(
  client: GoogleApiClient,
  authAdapter: GoogleOAuth2Adapter,
): ConnectorOperation[] {
  return [
    createListFilesOperation(client, authAdapter),
    createGetFileOperation(client, authAdapter),
    createSearchFilesOperation(client, authAdapter),
    createCreateFolderOperation(client, authAdapter),
    createUploadFileOperation(client, authAdapter),
    createUpdateFileMetadataOperation(client, authAdapter),
    createListMessagesOperation(client, authAdapter),
    createGetMessageOperation(client, authAdapter),
    createListLabelsOperation(client, authAdapter),
    createSendMessageOperation(client, authAdapter),
    createCreateDraftOperation(client, authAdapter),
    createListCalendarsOperation(client, authAdapter),
    createGetCalendarOperation(client, authAdapter),
    createListEventsOperation(client, authAdapter),
    createGetEventOperation(client, authAdapter),
    createCreateEventOperation(client, authAdapter),
    createUpdateEventOperation(client, authAdapter),
    createQueryFreeBusyOperation(client, authAdapter),
  ];
}

export function registerGoogleWorkspaceOperations(
  runtime: ConnectorRuntime,
  client: GoogleApiClient,
  authAdapter: GoogleOAuth2Adapter,
): void {
  for (const op of createGoogleWorkspaceOperations(client, authAdapter)) {
    runtime.registerOperation(GOOGLE_CONNECTOR_ID, op);
  }
}

export function registerGoogleConnector(options: RegisterGoogleConnectorOptions): {
  client: GoogleApiClient;
  authAdapter: GoogleOAuth2Adapter;
} {
  const client = new GoogleApiClient(
    options.apiClientConfig ?? DEFAULT_GOOGLE_CONFIG,
    options.transport,
  );
  const refreshProvider = options.refreshProvider ?? new GoogleTokenRefreshProvider();
  const authAdapter = new GoogleOAuth2Adapter(options.credentialResolver, refreshProvider);

  for (const op of createGoogleWorkspaceOperations(client, authAdapter)) {
    if (runtime_hasOperation(options.runtime, op.name)) {
      throw new Error(`Duplicate operation registration: ${op.name}`);
    }
    options.runtime.registerOperation(GOOGLE_CONNECTOR_ID, op);
  }

  return { client, authAdapter };
}

function runtime_hasOperation(runtime: ConnectorRuntime, operationName: string): boolean {
  return runtime.hasOperation(GOOGLE_CONNECTOR_ID, operationName);
}

export const GOOGLE_OPERATION_NAMES: readonly string[] = [
  'google.drive.listFiles',
  'google.drive.getFile',
  'google.drive.searchFiles',
  'google.drive.createFolder',
  'google.drive.uploadFile',
  'google.drive.updateFileMetadata',
  'google.gmail.listMessages',
  'google.gmail.getMessage',
  'google.gmail.listLabels',
  'google.gmail.sendMessage',
  'google.gmail.createDraft',
  'google.calendar.listCalendars',
  'google.calendar.getCalendar',
  'google.calendar.listEvents',
  'google.calendar.getEvent',
  'google.calendar.createEvent',
  'google.calendar.updateEvent',
  'google.calendar.queryFreeBusy',
];
