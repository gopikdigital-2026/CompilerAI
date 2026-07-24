export const GOOGLE_DRIVE_SCOPES = {
  METADATA_READONLY: 'https://www.googleapis.com/auth/drive.metadata.readonly',
  FILE: 'https://www.googleapis.com/auth/drive.file',
  READONLY: 'https://www.googleapis.com/auth/drive.readonly',
} as const;

export const GOOGLE_GMAIL_SCOPES = {
  READONLY: 'https://www.googleapis.com/auth/gmail.readonly',
  SEND: 'https://www.googleapis.com/auth/gmail.send',
  LABELS: 'https://www.googleapis.com/auth/gmail.labels',
} as const;

export const GOOGLE_CALENDAR_SCOPES = {
  READONLY: 'https://www.googleapis.com/auth/calendar.readonly',
  EVENTS: 'https://www.googleapis.com/auth/calendar.events',
} as const;

export const DEFAULT_GOOGLE_SCOPES: readonly string[] = [
  GOOGLE_DRIVE_SCOPES.METADATA_READONLY,
  GOOGLE_DRIVE_SCOPES.FILE,
  GOOGLE_GMAIL_SCOPES.READONLY,
  GOOGLE_GMAIL_SCOPES.SEND,
  GOOGLE_CALENDAR_SCOPES.READONLY,
  GOOGLE_CALENDAR_SCOPES.EVENTS,
];

export interface GoogleServiceAccountCredentials {
  readonly type: 'service_account';
  readonly projectId: string;
  readonly privateKeyId: string;
  readonly privateKey: string;
  readonly clientEmail: string;
  readonly clientId: string;
  readonly authUri: string;
  readonly tokenUri: string;
  readonly authProviderX509CertUrl: string;
  readonly clientX509CertUrl: string;
}

export interface GoogleServiceAccountConfig {
  readonly credentials: GoogleServiceAccountCredentials;
  readonly delegatedUser: string | null;
  readonly scopes: readonly string[];
}

export const GOOGLE_SERVICE_ACCOUNT_NOT_IMPLEMENTED =
  'Google Service Account authentication (domain-wide delegation) is not yet implemented. ' +
  'Use OAuth2 authentication in the meantime.';

export const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
export const GOOGLE_AUTHORIZATION_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
