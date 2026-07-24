import type { GitHubWebhookEvent } from '../types/GitHubWebhookEvent';
import type { GitHubWebhookHandler } from './GitHubWebhookHandlerRegistry';
import type { WebhookProcessResult } from './GitHubWebhookEnvelope';
import type { UUID } from '../../../types/index';
import type { GitHubSyncEngine } from '../sync/GitHubSyncEngine';
import type { IGitHubRepositorySyncStore, IGitHubIssueSyncStore, IGitHubPullRequestSyncStore, IGitHubWorkflowRunSyncStore } from '../sync/GitHubSyncRepository';
import type { GitHubSyncRequest } from '../sync/GitHubSyncResult';
import { GitHubResponseMapper } from '../GitHubResponseMapper';

export interface GitHubWebhookHandlerOptions {
  readonly syncEngine?: GitHubSyncEngine;
  readonly repositoryStore?: IGitHubRepositorySyncStore;
  readonly issueStore?: IGitHubIssueSyncStore;
  readonly pullRequestStore?: IGitHubPullRequestSyncStore;
  readonly workflowRunStore?: IGitHubWorkflowRunSyncStore;
}

function parseRepoFullName(fullName: string): { owner: string; repo: string } {
  const parts = fullName.split('/');
  return { owner: parts[0] ?? '', repo: parts[1] ?? '' };
}

export function createInstallationHandler(_options: GitHubWebhookHandlerOptions): GitHubWebhookHandler {
  return {
    eventName: 'installation',
    async handle(_event: GitHubWebhookEvent, _orgId: UUID): Promise<WebhookProcessResult> {
      return { handled: true, handlerName: 'installation' };
    },
  };
}

export function createInstallationRepositoriesHandler(_options: GitHubWebhookHandlerOptions): GitHubWebhookHandler {
  return {
    eventName: 'installation_repositories',
    async handle(_event: GitHubWebhookEvent, _orgId: UUID): Promise<WebhookProcessResult> {
      return { handled: true, handlerName: 'installation_repositories' };
    },
  };
}

export function createRepositoryHandler(options: GitHubWebhookHandlerOptions): GitHubWebhookHandler {
  return {
    eventName: 'repository',
    async handle(event: GitHubWebhookEvent, orgId: UUID): Promise<WebhookProcessResult> {
      const payload = event.payload as { action?: string; repository?: Record<string, unknown> };
      if (payload.repository && options.repositoryStore) {
        const repo = GitHubResponseMapper.mapRepository(payload.repository as never);
        const installationId = (event.payload as { installation?: { id?: number } }).installation?.id ?? 0;
        await options.repositoryStore.upsert(orgId, installationId, repo);
      }
      return { handled: true, handlerName: 'repository' };
    },
  };
}

export function createIssuesHandler(options: GitHubWebhookHandlerOptions): GitHubWebhookHandler {
  return {
    eventName: 'issues',
    async handle(event: GitHubWebhookEvent, orgId: UUID): Promise<WebhookProcessResult> {
      const payload = event.payload as { action?: string; issue?: Record<string, unknown>; installation?: { id?: number } };
      if (payload.issue && options.issueStore) {
        const issue = GitHubResponseMapper.mapIssue(payload.issue as never);
        const installationId = payload.installation?.id ?? 0;
        await options.issueStore.upsert(orgId, installationId, issue);
      }
      return { handled: true, handlerName: 'issues' };
    },
  };
}

export function createIssueCommentHandler(_options: GitHubWebhookHandlerOptions): GitHubWebhookHandler {
  return {
    eventName: 'issue_comment',
    async handle(_event: GitHubWebhookEvent, _orgId: UUID): Promise<WebhookProcessResult> {
      return { handled: true, handlerName: 'issue_comment' };
    },
  };
}

export function createPullRequestHandler(options: GitHubWebhookHandlerOptions): GitHubWebhookHandler {
  return {
    eventName: 'pull_request',
    async handle(event: GitHubWebhookEvent, orgId: UUID): Promise<WebhookProcessResult> {
      const payload = event.payload as { action?: string; pull_request?: Record<string, unknown>; installation?: { id?: number } };
      if (payload.pull_request && options.pullRequestStore) {
        const pr = GitHubResponseMapper.mapPullRequest(payload.pull_request as never);
        const installationId = payload.installation?.id ?? 0;
        await options.pullRequestStore.upsert(orgId, installationId, pr);
      }
      return { handled: true, handlerName: 'pull_request' };
    },
  };
}

export function createPushHandler(_options: GitHubWebhookHandlerOptions): GitHubWebhookHandler {
  return {
    eventName: 'push',
    async handle(_event: GitHubWebhookEvent, _orgId: UUID): Promise<WebhookProcessResult> {
      return { handled: true, handlerName: 'push' };
    },
  };
}

export function createWorkflowRunHandler(options: GitHubWebhookHandlerOptions): GitHubWebhookHandler {
  return {
    eventName: 'workflow_run',
    async handle(event: GitHubWebhookEvent, orgId: UUID): Promise<WebhookProcessResult> {
      const payload = event.payload as { action?: string; workflow_run?: Record<string, unknown>; installation?: { id?: number } };
      if (payload.workflow_run && options.workflowRunStore) {
        const run = GitHubResponseMapper.mapWorkflowRun(payload.workflow_run as never);
        const installationId = payload.installation?.id ?? 0;
        await options.workflowRunStore.upsert(orgId, installationId, run);
      }
      return { handled: true, handlerName: 'workflow_run' };
    },
  };
}

export function createWorkflowDispatchHandler(_options: GitHubWebhookHandlerOptions): GitHubWebhookHandler {
  return {
    eventName: 'workflow_dispatch',
    async handle(_event: GitHubWebhookEvent, _orgId: UUID): Promise<WebhookProcessResult> {
      return { handled: true, handlerName: 'workflow_dispatch' };
    },
  };
}

export function createAllWebhookHandlers(options: GitHubWebhookHandlerOptions): GitHubWebhookHandler[] {
  return [
    createInstallationHandler(options),
    createInstallationRepositoriesHandler(options),
    createRepositoryHandler(options),
    createIssuesHandler(options),
    createIssueCommentHandler(options),
    createPullRequestHandler(options),
    createPushHandler(options),
    createWorkflowRunHandler(options),
    createWorkflowDispatchHandler(options),
  ];
}

const ADDITIONAL_WEBHOOK_EVENTS = ['installation', 'installation_repositories'] as const;

export const ALL_SUPPORTED_WEBHOOK_EVENTS: readonly string[] = [
  ...ADDITIONAL_WEBHOOK_EVENTS,
  'push',
  'issues',
  'issue_comment',
  'pull_request',
  'workflow_run',
  'workflow_dispatch',
  'repository',
];

export function scheduleIncrementalSync(
  syncEngine: GitHubSyncEngine,
  request: GitHubSyncRequest,
): void {
  void syncEngine.sync({ ...request, mode: 'incremental' });
}

export { parseRepoFullName };
