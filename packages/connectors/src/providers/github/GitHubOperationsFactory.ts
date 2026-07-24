import type { ConnectorRuntime } from '../../runtime/ConnectorRuntime';
import type { GitHubApiClient } from './GitHubApiClient';
import type { GitHubTokenAuthAdapter } from './auth/GitHubTokenAuthAdapter';
import type { ConnectorOperation } from '../../runtime/ConnectorExecutionResult';
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
