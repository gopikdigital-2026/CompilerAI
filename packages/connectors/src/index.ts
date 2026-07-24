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
  ConnectorAuthenticationError as CoreConnectorAuthenticationError,
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
export { GitHubConnectorProvider } from './providers/github';
export { JiraProvider } from './providers/jira';
export { NotionProvider } from './providers/notion';
export { SalesforceProvider } from './providers/salesforce';
export { HubSpotProvider } from './providers/hubspot';
export { ALL_PROVIDERS, createDefaultRegistry } from './providers/index';
export {
  TEST_CONNECTOR_ID,
  TEST_OPERATIONS,
  getTestOperation,
  resetUnstableState,
} from './providers/test';
export type { TestConnectorId } from './providers/test';

// Runtime errors
export { ConnectorRuntimeError } from './errors/ConnectorRuntimeError';
export type { ConnectorErrorCode, SanitizedDetails } from './errors/ConnectorRuntimeError';
export { ConnectorAuthenticationError } from './errors/ConnectorAuthenticationError';
export { ConnectorRateLimitError } from './errors/ConnectorRateLimitError';
export type { RateLimitDetails } from './errors/ConnectorRateLimitError';
export { ConnectorTimeoutError } from './errors/ConnectorTimeoutError';
export type { CircuitOpenDetails } from './errors/ConnectorCircuitOpenError';
export { ConnectorCircuitOpenError } from './errors/ConnectorCircuitOpenError';

// Credentials
export type { ICredentialStore as IRuntimeCredentialStore, CredentialRecord, SaveCredentialRequest, CredentialType } from './credentials/CredentialStore';
export { InMemoryCredentialStore } from './credentials/InMemoryCredentialStore';
export type { ICredentialEncryptionProvider } from './credentials/CredentialEncryptionProvider';
export { DevelopmentCredentialEncryptionProvider } from './credentials/CredentialEncryptionProvider';
export type { ResolvedCredentials } from './credentials/CredentialResolver';
export { CredentialResolver } from './credentials/CredentialResolver';

// Auth providers
export type { ITokenRefreshProvider } from './auth/TokenRefreshProvider';
export { TestTokenRefreshProvider, FailingTokenRefreshProvider } from './auth/TokenRefreshProvider';
export type { OAuth2TokenManagerOptions } from './auth/OAuth2TokenManager';
export { OAuth2TokenManager } from './auth/OAuth2TokenManager';
export type { ApiKeyAuthConfig } from './auth/ApiKeyAuthProvider';
export { ApiKeyAuthProvider } from './auth/ApiKeyAuthProvider';
export type { BearerTokenAuthConfig } from './auth/BearerTokenAuthProvider';
export { BearerTokenAuthProvider } from './auth/BearerTokenAuthProvider';

// Resilience
export type { RetryPolicyConfig, RetryDecision } from './resilience/RetryPolicy';
export { RetryPolicy, DEFAULT_RETRY_CONFIG } from './resilience/RetryPolicy';
export type { ExponentialBackoffConfig } from './resilience/ExponentialBackoff';
export { ExponentialBackoff, DEFAULT_BACKOFF_CONFIG } from './resilience/ExponentialBackoff';
export type { TimeoutPolicyConfig } from './resilience/TimeoutPolicy';
export { TimeoutPolicy, DEFAULT_TIMEOUT_CONFIG } from './resilience/TimeoutPolicy';
export type { CircuitState, CircuitBreakerConfig } from './resilience/CircuitBreaker';
export { CircuitBreaker, DEFAULT_CIRCUIT_CONFIG } from './resilience/CircuitBreaker';
export type { RateLimitConfig, RateLimitResult } from './resilience/RateLimiter';
export { RateLimiter } from './resilience/RateLimiter';

// Observability
export { sanitizeMetadata } from './observability/sanitize';
export type { TelemetryEventType, TelemetryEvent, IConnectorTelemetry } from './observability/ConnectorTelemetry';
export { ConnectorTelemetry } from './observability/ConnectorTelemetry';
export type { MetricKey, MetricSnapshot, IConnectorMetrics } from './observability/ConnectorMetrics';
export { ConnectorMetrics } from './observability/ConnectorMetrics';
export type { TraceSpan, IConnectorTrace } from './observability/ConnectorTrace';
export { ConnectorTrace } from './observability/ConnectorTrace';
export type { AuditEventType, AuditOutcome, ConnectorAuditEvent } from './observability/ConnectorAuditEvent';
export { createAuditEvent, AuditLog } from './observability/ConnectorAuditEvent';

// Runtime
export { ConnectorRuntime } from './runtime/ConnectorRuntime';
export type { ConnectorRuntimeConfig } from './runtime/ConnectorRuntime';
export type {
  ConnectorOperation,
  ConnectorOperationRequest,
  ConnectorOperationResult,
  ConnectorExecutionContext,
} from './runtime/ConnectorExecutionResult';
export { createExecutionContext } from './runtime/ConnectorExecutionContext';
export { ConnectorOperationExecutor, OperationRegistry } from './runtime/ConnectorOperationExecutor';
export type { IOperationRegistry } from './runtime/ConnectorOperationExecutor';
export { ConnectorExecutionPipeline } from './runtime/ConnectorExecutionPipeline';
export type { PipelineConfig } from './runtime/ConnectorExecutionPipeline';
export { DEFAULT_PIPELINE_CONFIG } from './runtime/ConnectorExecutionPipeline';

// GitHub connector
export { GitHubApiClient, DEFAULT_GITHUB_CONFIG } from './providers/github';
export type { GitHubApiClientConfig, GitHubResponse, GitHubRequestOptions, FetchLike } from './providers/github';
export { GitHubRequestBuilder, ALLOWED_HOSTS } from './providers/github';
export { GitHubErrorMapper } from './providers/github';
export { GitHubRateLimitMapper } from './providers/github';
export type { GitHubRateLimitHeaders } from './providers/github';
export { GitHubResponseMapper } from './providers/github';
export { GitHubPagination } from './providers/github';
export { GitHubTokenAuthAdapter } from './providers/github';
export type {
  GitHubAppCredentials,
  GitHubAppJwtClaims,
  GitHubAppInstallationToken,
  IGitHubAppAuthProvider,
  GitHubAppAuthConfig,
} from './providers/github';
export { GITHUB_APP_AUTH_NOT_IMPLEMENTED } from './providers/github';
export { GitHubConnector } from './providers/github';
export {
  GITHUB_CONNECTOR_ID,
  createGitHubOperations,
  registerGitHubOperations,
  GITHUB_OPERATION_NAMES,
} from './providers/github';
export { GitHubWebhookVerifier } from './providers/github';
export type { WebhookVerificationResult } from './providers/github';
export { GitHubWebhookParser } from './providers/github';
export { GitHubWebhookEventMapper } from './providers/github';
export type { GitHubUser, GitHubUserResponse } from './providers/github';
export type { GitHubRepository, GitHubRepositoryOwner, GitHubRepositoryResponse } from './providers/github';
export type { GitHubIssue, GitHubIssueLabel, GitHubIssueUser, GitHubIssueMilestone, GitHubIssueResponse } from './providers/github';
export type { GitHubPullRequest, GitHubPullRequestUser, GitHubPullRequestBranch, GitHubPullRequestResponse } from './providers/github';
export type { GitHubWorkflowRun, GitHubWorkflowRunUser, GitHubWorkflowRunResponse, GitHubWorkflowRunsListResponse } from './providers/github';
export type { GitHubPaginationResult, GitHubPaginationLinks, GitHubPaginationConfig } from './providers/github';
export { DEFAULT_PAGINATION_CONFIG } from './providers/github';
export type { GitHubWebhookEvent, GitHubWebhookHeaders } from './providers/github';
export { SUPPORTED_WEBHOOK_EVENTS } from './providers/github';
