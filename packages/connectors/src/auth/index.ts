import type { ConnectorId, UUID, ISOString } from '../types/index';

export interface OAuth2Config {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  authorizationEndpoint: string;
  tokenEndpoint: string;
  refreshEndpoint: string | null;
}

export interface OAuth2Token {
  accessToken: string;
  refreshToken: string | null;
  tokenType: string;
  expiresAt: ISOString;
  scope: string;
}

export interface OAuth2AuthorizationParams {
  state: string;
  codeChallenge: string | null;
  additionalParams: Record<string, string>;
}

export interface OAuth2AuthorizationUrlResult {
  url: string;
  state: string;
}

export interface IOAuth2Flow {
  buildAuthorizationUrl(params: OAuth2AuthorizationParams): OAuth2AuthorizationUrlResult;
  exchangeCodeForToken(code: string, config: OAuth2Config): Promise<OAuth2Token>;
  refreshToken(refreshToken: string, config: OAuth2Config): Promise<OAuth2Token>;
  validateToken(token: OAuth2Token): boolean;
  revokeToken(token: OAuth2Token, config: OAuth2Config): Promise<void>;
}

export interface ApiKeyConfig {
  apiKey: string;
  headerName: string;
  headerPrefix: string | null;
}

export interface IApiKeyAuth {
  validateApiKey(apiKey: string): boolean;
  buildAuthHeader(config: ApiKeyConfig): Record<string, string>;
}

export interface BearerTokenConfig {
  token: string;
  prefix: string;
}

export interface IBearerAuth {
  validateToken(token: string): boolean;
  buildAuthHeader(config: BearerTokenConfig): Record<string, string>;
}

export interface RefreshTokenConfig {
  refreshToken: string;
  tokenEndpoint: string;
  clientId: string;
  clientSecret: string;
}

export interface IRefreshTokenFlow {
  refresh(config: RefreshTokenConfig): Promise<OAuth2Token>;
  isRefreshNeeded(expiresAt: ISOString): boolean;
}

export interface ICredentialStore {
  store(connectorId: ConnectorId, organizationId: UUID, credentials: StoredCredentials): Promise<void>;
  retrieve(connectorId: ConnectorId, organizationId: UUID): Promise<StoredCredentials | null>;
  delete(connectorId: ConnectorId, organizationId: UUID): Promise<boolean>;
  listByOrganization(organizationId: UUID): Promise<StoredCredentials[]>;
}

export interface StoredCredentials {
  connectorId: ConnectorId;
  organizationId: UUID;
  scheme: 'oauth2' | 'api_key' | 'bearer' | 'basic';
  encryptedData: string;
  expiresAt: ISOString | null;
  createdAt: ISOString;
  updatedAt: ISOString;
}

// Runtime auth implementations
export type { ITokenRefreshProvider } from './TokenRefreshProvider';
export { TestTokenRefreshProvider, FailingTokenRefreshProvider } from './TokenRefreshProvider';
export type { OAuth2TokenManagerOptions } from './OAuth2TokenManager';
export { OAuth2TokenManager } from './OAuth2TokenManager';
export type { ApiKeyAuthConfig } from './ApiKeyAuthProvider';
export { ApiKeyAuthProvider } from './ApiKeyAuthProvider';
export type { BearerTokenAuthConfig } from './BearerTokenAuthProvider';
export { BearerTokenAuthProvider } from './BearerTokenAuthProvider';
