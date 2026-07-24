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
