// Core types
export type {
  UUID,
  ISOString,
  Metadata,
  ConnectorId,
  ConnectorCategory,
  ConnectorStatus,
  CapabilityMethod,
  ConnectorCapability,
  ConnectorMetadata,
  ConnectorResult,
  ConnectorErrorCategory,
  ConnectorContext,
  ConnectorCredentials,
  AuthScheme,
  Connector,
  ConnectorAuthRequirements,
  ConnectorProvider,
  ConnectorProviderConfig,
} from './types/index';

// Core classes and errors
export { BaseConnector } from './core/BaseConnector';
export { BaseConnectorProvider } from './core/BaseConnectorProvider';
export {
  ConnectorError,
  ConnectorAlreadyRegisteredError,
  ConnectorNotFoundError,
  ConnectorValidationError,
  ConnectorAuthenticationError,
  ConnectorCapabilityError,
} from './core/ConnectorErrors';

// Registry
export { ConnectorRegistry } from './registry/ConnectorRegistry';

// Auth interfaces
export type {
  OAuth2Config,
  OAuth2Token,
  OAuth2AuthorizationParams,
  OAuth2AuthorizationUrlResult,
  IOAuth2Flow,
  ApiKeyConfig,
  IApiKeyAuth,
  BearerTokenConfig,
  IBearerAuth,
  RefreshTokenConfig,
  IRefreshTokenFlow,
  ICredentialStore,
  StoredCredentials,
} from './auth/index';

// Utils
export {
  generateRequestId,
  generateCorrelationId,
  generateState,
  makeContext,
  isExpired,
  sanitizeId,
  maskSecret,
  safeParseJson,
} from './utils/index';

// Providers
export { Microsoft365Provider } from './providers/microsoft365';
export { GoogleWorkspaceProvider } from './providers/google';
export { SlackProvider } from './providers/slack';
export { GitHubProvider } from './providers/github';
export { JiraProvider } from './providers/jira';
export { NotionProvider } from './providers/notion';
export { SalesforceProvider } from './providers/salesforce';
export { HubSpotProvider } from './providers/hubspot';
export { ALL_PROVIDERS, createDefaultRegistry } from './providers/index';
