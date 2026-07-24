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
