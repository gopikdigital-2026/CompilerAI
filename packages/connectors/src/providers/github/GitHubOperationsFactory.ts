import type { ConnectorRuntime } from '../../runtime/ConnectorRuntime';
import type { ConnectorOperation } from '../../runtime/ConnectorExecutionResult';
import type { CredentialResolver } from '../../credentials/CredentialResolver';
import type { ConnectorTelemetry } from '../../observability/ConnectorTelemetry';
import type { GitHubApiClientConfig } from './GitHubApiClient';
import { GitHubApiClient, DEFAULT_GITHUB_CONFIG } from './GitHubApiClient';
import { GitHubTokenAuthAdapter } from './auth/GitHubTokenAuthAdapter';
import { createGetAuthenticatedUserOperation } from './operations/GetAuthenticatedUserOperation';
import { createListRepositoriesOperation } from './operations/ListRepositoriesOperation';
import { createGetRepositoryOperation } from './operations/GetRepositoryOperation';
import { createListIssuesOperation } from './operations/ListIssuesOperation';
import { createGetIssueOperation } from './operations/GetIssueOperation';
import { createCreateIssueOperation } from './operations/CreateIssueOperation';
import { createAddIssueCommentOperation } from './operations/AddIssueCommentOperation';
import { createListPullRequestsOperation } from './operations/ListPullRequestsOperation';
import { createGetPullRequestOperation } from './operations/GetPullRequestOperation';
import { createListWorkflowRunsOperation } from './operations/ListWorkflowRunsOperation';
import { createTriggerWorkflowDispatchOperation } from './operations/TriggerWorkflowDispatchOperation';

export const GITHUB_CONNECTOR_ID = 'github' as const;

export interface RegisterGitHubConnectorOptions {
  runtime: ConnectorRuntime;
  credentialResolver: CredentialResolver;
  apiClientConfig?: GitHubApiClientConfig;
  transport?: FetchLike;
  telemetry?: ConnectorTelemetry;
}

export type FetchLike = typeof fetch;

export function createGitHubOperations(
  client: GitHubApiClient,
  authAdapter: GitHubTokenAuthAdapter,
): ConnectorOperation[] {
  return [
    createGetAuthenticatedUserOperation(client, authAdapter),
    createListRepositoriesOperation(client, authAdapter),
    createGetRepositoryOperation(client, authAdapter),
    createListIssuesOperation(client, authAdapter),
    createGetIssueOperation(client, authAdapter),
    createCreateIssueOperation(client, authAdapter),
    createAddIssueCommentOperation(client, authAdapter),
    createListPullRequestsOperation(client, authAdapter),
    createGetPullRequestOperation(client, authAdapter),
    createListWorkflowRunsOperation(client, authAdapter),
    createTriggerWorkflowDispatchOperation(client, authAdapter),
  ];
}

export function registerGitHubOperations(
  runtime: ConnectorRuntime,
  client: GitHubApiClient,
  authAdapter: GitHubTokenAuthAdapter,
): void {
  for (const op of createGitHubOperations(client, authAdapter)) {
    runtime.registerOperation(GITHUB_CONNECTOR_ID, op);
  }
}

export function registerGitHubConnector(options: RegisterGitHubConnectorOptions): {
  client: GitHubApiClient;
  authAdapter: GitHubTokenAuthAdapter;
} {
  const client = new GitHubApiClient(
    options.apiClientConfig ?? DEFAULT_GITHUB_CONFIG,
    options.transport,
  );
  const authAdapter = new GitHubTokenAuthAdapter(options.credentialResolver);

  for (const op of createGitHubOperations(client, authAdapter)) {
    if (runtime_hasOperation(options.runtime, op.name)) {
      throw new Error(`Duplicate operation registration: ${op.name}`);
    }
    options.runtime.registerOperation(GITHUB_CONNECTOR_ID, op);
  }

  return { client, authAdapter };
}

function runtime_hasOperation(runtime: ConnectorRuntime, operationName: string): boolean {
  return runtime.hasOperation(GITHUB_CONNECTOR_ID, operationName);
}

export const GITHUB_OPERATION_NAMES: readonly string[] = [
  'github.getAuthenticatedUser',
  'github.listRepositories',
  'github.getRepository',
  'github.listIssues',
  'github.getIssue',
  'github.createIssue',
  'github.addIssueComment',
  'github.listPullRequests',
  'github.getPullRequest',
  'github.listWorkflowRuns',
  'github.triggerWorkflowDispatch',
];
