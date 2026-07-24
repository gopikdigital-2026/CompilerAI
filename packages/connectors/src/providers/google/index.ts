export { GoogleApiClient, DEFAULT_GOOGLE_CONFIG } from './GoogleApiClient';
export type { GoogleApiClientConfig, GoogleResponse, GoogleRequestOptions, FetchLike, GoogleService } from './GoogleApiClient';
export { GoogleRequestBuilder } from './GoogleRequestBuilder';
export { GoogleErrorMapper } from './GoogleErrorMapper';
export { GoogleRateLimitMapper } from './GoogleRateLimitMapper';
export type { GoogleRateLimitInfo } from './GoogleRateLimitMapper';
export { isGoogleRateLimitReason } from './GoogleRateLimitMapper';
export { GooglePagination } from './GooglePagination';

export { GoogleOAuth2Adapter } from './auth/GoogleOAuth2Adapter';
export { GoogleTokenRefreshProvider, TestTokenRefreshProvider, FailingTokenRefreshProvider } from './auth/GoogleTokenRefreshProvider';
export type { IGoogleTokenRefreshProvider, GoogleTokenRefreshResponse } from './auth/GoogleTokenRefreshProvider';
export {
  GOOGLE_DRIVE_SCOPES,
  GOOGLE_GMAIL_SCOPES,
  GOOGLE_CALENDAR_SCOPES,
  DEFAULT_GOOGLE_SCOPES,
  GOOGLE_TOKEN_ENDPOINT,
  GOOGLE_AUTHORIZATION_ENDPOINT,
  GOOGLE_SERVICE_ACCOUNT_NOT_IMPLEMENTED,
} from './auth/GoogleOAuth2Scopes';
export type { GoogleServiceAccountCredentials, GoogleServiceAccountConfig } from './auth/GoogleOAuth2Scopes';

export { GoogleWorkspaceConnector } from './GoogleWorkspaceConnector';
export { GoogleWorkspaceConnectorProvider } from './GoogleWorkspaceConnectorProvider';
export { GoogleWorkspaceConnectorProvider as GoogleWorkspaceProvider } from './GoogleWorkspaceConnectorProvider';
export {
  GOOGLE_CONNECTOR_ID,
  createGoogleWorkspaceOperations,
  registerGoogleWorkspaceOperations,
  registerGoogleConnector,
  GOOGLE_OPERATION_NAMES,
} from './GoogleWorkspaceOperationsFactory';
export type { RegisterGoogleConnectorOptions } from './GoogleWorkspaceOperationsFactory';

// Drive types
export type { GoogleDriveFile, GoogleDriveOwner, GoogleDriveFolder, GoogleDriveFileResponse, GoogleDriveFileListResponse } from './drive/types/GoogleDriveTypes';
// Drive mapper
export { GoogleDriveMapper } from './drive/mappers/GoogleDriveMapper';

// Gmail types
export type {
  GoogleGmailMessage,
  GoogleGmailAttachment,
  GoogleGmailLabel,
  GoogleGmailMessageResponse,
  GoogleGmailMessagePart,
  GoogleGmailMessageListResponse,
  GoogleGmailLabelListResponse,
} from './gmail/types/GoogleGmailTypes';
// Gmail mapper
export { GoogleGmailMapper } from './gmail/mappers/GoogleGmailMapper';

// Calendar types
export type {
  GoogleCalendarInfo,
  GoogleCalendarEvent,
  GoogleCalendarEventTime,
  GoogleCalendarEventAttendee,
  GoogleCalendarEventReminders,
  GoogleFreeBusyResult,
  GoogleFreeBusyCalendar,
  GoogleCalendarListResponse,
  GoogleCalendarInfoResponse,
  GoogleCalendarEventListResponse,
  GoogleCalendarEventResponse,
  GoogleFreeBusyRequestResponse,
} from './calendar/types/GoogleCalendarTypes';
// Calendar mapper
export { GoogleCalendarMapper } from './calendar/mappers/GoogleCalendarMapper';

// Pagination types
export type { GooglePageResult, GooglePaginationConfig } from './types/GooglePagination';
export { DEFAULT_GOOGLE_PAGINATION_CONFIG } from './types/GooglePagination';

// Drive operation input/output types
export type { ListFilesInput, ListFilesOutput } from './drive/operations/ListFilesOperation';
export type { GetFileInput, GetFileOutput } from './drive/operations/GetFileOperation';
export type { SearchFilesInput, SearchFilesOutput } from './drive/operations/SearchFilesOperation';
export type { CreateFolderInput, CreateFolderOutput } from './drive/operations/CreateFolderOperation';
export type { UploadFileInput, UploadFileOutput } from './drive/operations/UploadFileOperation';
export type { UpdateFileMetadataInput, UpdateFileMetadataOutput } from './drive/operations/UpdateFileMetadataOperation';

// Gmail operation input/output types
export type { ListMessagesInput, ListMessagesOutput } from './gmail/operations/ListMessagesOperation';
export type { GetMessageInput, GetMessageOutput } from './gmail/operations/GetMessageOperation';
export type { ListLabelsInput, ListLabelsOutput } from './gmail/operations/ListLabelsOperation';
export type { SendMessageInput, SendMessageOutput } from './gmail/operations/SendMessageOperation';
export type { CreateDraftInput, CreateDraftOutput } from './gmail/operations/CreateDraftOperation';

// Calendar operation input/output types
export type { ListCalendarsInput, ListCalendarsOutput } from './calendar/operations/ListCalendarsOperation';
export type { GetCalendarInput, GetCalendarOutput } from './calendar/operations/GetCalendarOperation';
export type { ListEventsInput, ListEventsOutput } from './calendar/operations/ListEventsOperation';
export type { GetEventInput, GetEventOutput } from './calendar/operations/GetEventOperation';
export type { CreateEventInput, CreateEventOutput } from './calendar/operations/CreateEventOperation';
export type { UpdateEventInput, UpdateEventOutput } from './calendar/operations/UpdateEventOperation';
export type { QueryFreeBusyInput, QueryFreeBusyOutput } from './calendar/operations/QueryFreeBusyOperation';
