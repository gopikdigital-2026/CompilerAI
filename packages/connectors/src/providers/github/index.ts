export { GitHubApiClient, DEFAULT_GITHUB_CONFIG } from './GitHubApiClient';
export type { GitHubApiClientConfig, GitHubResponse, GitHubRequestOptions, FetchLike } from './GitHubApiClient';
export { GitHubRequestBuilder, ALLOWED_HOSTS } from './GitHubRequestBuilder';
export { GitHubErrorMapper } from './GitHubErrorMapper';
export { GitHubRateLimitMapper } from './GitHubRateLimitMapper';
export type { GitHubRateLimitHeaders } from './GitHubRateLimitMapper';
export { GitHubResponseMapper } from './GitHubResponseMapper';
export { GitHubPagination } from './GitHubPagination';

export { GitHubTokenAuthAdapter } from './auth/GitHubTokenAuthAdapter';
export type {
  GitHubAppCredentials,
  GitHubAppJwtClaims,
  GitHubAppInstallationToken,
  IGitHubAppAuthProvider,
  GitHubAppAuthConfig,
} from './auth/GitHubAppAuthContracts';
export { GITHUB_APP_AUTH_NOT_IMPLEMENTED } from './auth/GitHubAppAuthContracts';

export { GitHubConnector } from './GitHubConnector';
export { GitHubConnectorProvider } from './GitHubConnectorProvider';
export {
  GITHUB_CONNECTOR_ID,
  createGitHubOperations,
  registerGitHubOperations,
  registerGitHubConnector,
  GITHUB_OPERATION_NAMES,
} from './GitHubOperationsFactory';
export type { RegisterGitHubConnectorOptions } from './GitHubOperationsFactory';

export { GitHubWebhookVerifier } from './webhooks/GitHubWebhookVerifier';
export type { WebhookVerificationResult } from './webhooks/GitHubWebhookVerifier';
export { GitHubWebhookParser } from './webhooks/GitHubWebhookParser';
export { GitHubWebhookEventMapper } from './webhooks/GitHubWebhookEventMapper';

// Sprint 25: GitHub App Authentication
export { GitHubAppJwtProvider, SystemClock } from './auth/GitHubAppJwtProvider';
export type { GitHubAppJwtResult, Clock } from './auth/GitHubAppJwtProvider';
export { GitHubInstallationTokenCache } from './auth/GitHubInstallationTokenCache';
export type { IGitHubInstallationTokenCache, InstallationTokenKey, CachedTokenEntry } from './auth/GitHubInstallationTokenCache';
export { GitHubInstallationTokenProvider } from './auth/GitHubInstallationTokenProvider';
export type { GitHubInstallationTokenProviderOptions } from './auth/GitHubInstallationTokenProvider';
export { GitHubAppCredentialResolver } from './auth/GitHubAppCredentialResolver';

// Sprint 25: Sync Engine
export type {
  GitHubSyncResourceType,
  GitHubSyncState,
  GitHubSyncMode,
  GitHubSyncCheckpoint,
  GitHubSyncResult,
  GitHubSyncProgress,
  GitHubSyncRequest,
} from './sync/GitHubSyncResult';
export { createSyncId } from './sync/GitHubSyncResult';
export type { GitHubSyncJobRecord } from './sync/GitHubSyncJob';
export { createSyncJobDedupKey, createJobId } from './sync/GitHubSyncJob';
export type { IGitHubSyncCheckpointStore } from './sync/GitHubSyncCheckpointStore';
export { InMemoryGitHubSyncCheckpointStore } from './sync/InMemoryGitHubSyncCheckpointStore';
export type {
  IGitHubRepositorySyncStore,
  IGitHubIssueSyncStore,
  IGitHubPullRequestSyncStore,
  IGitHubWorkflowRunSyncStore,
  GitHubSyncStore,
  UpsertResult,
} from './sync/GitHubSyncRepository';
export {
  InMemoryRepositorySyncStore,
  InMemoryIssueSyncStore,
  InMemoryPullRequestSyncStore,
  InMemoryWorkflowRunSyncStore,
} from './sync/InMemoryGitHubSyncStores';
export { GitHubSyncEngine } from './sync/GitHubSyncEngine';
export type { GitHubSyncEngineOptions } from './sync/GitHubSyncEngine';
export { GitHubSyncScheduler } from './sync/GitHubSyncScheduler';
export type { GitHubSyncSchedulerOptions, ScheduledSyncConfig } from './sync/GitHubSyncScheduler';
export { InMemoryGitHubSyncJobRepository, createSyncJob } from './sync/GitHubSyncQueue';
export type { GitHubSyncJobRepository } from './sync/GitHubSyncQueue';
export { GitHubSyncWorker } from './sync/GitHubSyncWorker';
export type { GitHubSyncWorkerOptions } from './sync/GitHubSyncWorker';

// Sprint 25: Webhook Receiver Core
export type {
  GitHubWebhookEnvelope,
  WebhookReceiveInput,
  WebhookReceiveResult,
  WebhookProcessResult,
  WebhookDeliveryRecord,
} from './webhooks/GitHubWebhookEnvelope';
export type { IGitHubWebhookDeliveryStore } from './webhooks/InMemoryGitHubWebhookDeliveryStore';
export { InMemoryGitHubWebhookDeliveryStore } from './webhooks/InMemoryGitHubWebhookDeliveryStore';
export { GitHubWebhookHandlerRegistry } from './webhooks/GitHubWebhookHandlerRegistry';
export type { GitHubWebhookHandler } from './webhooks/GitHubWebhookHandlerRegistry';
export { GitHubWebhookDispatcher } from './webhooks/GitHubWebhookDispatcher';
export type { WebhookDispatchResult } from './webhooks/GitHubWebhookDispatcher';
export { GitHubWebhookReceiver } from './webhooks/GitHubWebhookReceiver';
export type { GitHubWebhookReceiverOptions } from './webhooks/GitHubWebhookReceiver';
export {
  createAllWebhookHandlers,
  createInstallationHandler,
  createInstallationRepositoriesHandler,
  createRepositoryHandler,
  createIssuesHandler,
  createIssueCommentHandler,
  createPullRequestHandler,
  createPushHandler,
  createWorkflowRunHandler,
  createWorkflowDispatchHandler,
  ALL_SUPPORTED_WEBHOOK_EVENTS,
} from './webhooks/GitHubWebhookHandlers';
export type { GitHubWebhookHandlerOptions } from './webhooks/GitHubWebhookHandlers';

export type { GitHubUser, GitHubUserResponse } from './types/GitHubUser';
export type { GitHubRepository, GitHubRepositoryOwner, GitHubRepositoryResponse } from './types/GitHubRepository';
export type { GitHubIssue, GitHubIssueLabel, GitHubIssueUser, GitHubIssueMilestone, GitHubIssueResponse } from './types/GitHubIssue';
export type { GitHubPullRequest, GitHubPullRequestUser, GitHubPullRequestBranch, GitHubPullRequestResponse } from './types/GitHubPullRequest';
export type { GitHubWorkflowRun, GitHubWorkflowRunUser, GitHubWorkflowRunResponse, GitHubWorkflowRunsListResponse } from './types/GitHubWorkflowRun';
export type { GitHubPaginationResult, GitHubPaginationLinks, GitHubPaginationConfig } from './types/GitHubPaginationResult';
export { DEFAULT_PAGINATION_CONFIG } from './types/GitHubPaginationResult';
export type { GitHubWebhookEvent, GitHubWebhookHeaders } from './types/GitHubWebhookEvent';
export { SUPPORTED_WEBHOOK_EVENTS } from './types/GitHubWebhookEvent';

export type {
  GetAuthenticatedUserInput,
  GetAuthenticatedUserOutput,
} from './operations/GetAuthenticatedUserOperation';
export type { ListRepositoriesInput, ListRepositoriesOutput } from './operations/ListRepositoriesOperation';
export type { GetRepositoryInput, GetRepositoryOutput } from './operations/GetRepositoryOperation';
export type { ListIssuesInput, ListIssuesOutput } from './operations/ListIssuesOperation';
export type { GetIssueInput, GetIssueOutput } from './operations/GetIssueOperation';
export type { CreateIssueInput, CreateIssueOutput } from './operations/CreateIssueOperation';
export type { AddIssueCommentInput, AddIssueCommentOutput } from './operations/AddIssueCommentOperation';
export type { ListPullRequestsInput, ListPullRequestsOutput } from './operations/ListPullRequestsOperation';
export type { GetPullRequestInput, GetPullRequestOutput } from './operations/GetPullRequestOperation';
export type { ListWorkflowRunsInput, ListWorkflowRunsOutput } from './operations/ListWorkflowRunsOperation';
export type { TriggerWorkflowDispatchInput, TriggerWorkflowDispatchOutput } from './operations/TriggerWorkflowDispatchOperation';
