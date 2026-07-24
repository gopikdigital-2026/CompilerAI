import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  ConnectorRuntime,
  createExecutionContext,
  InMemoryCredentialStore,
  DevelopmentCredentialEncryptionProvider,
  CredentialResolver,
  GitHubApiClient,
  GitHubTokenAuthAdapter,
  registerGitHubOperations,
  GITHUB_CONNECTOR_ID,
} from '../../src/index';
import {
  FIXTURE_USER,
  FIXTURE_REPOSITORY,
  FIXTURE_REPOSITORIES_LIST,
  FIXTURE_ISSUE,
  FIXTURE_ISSUES_LIST,
  FIXTURE_ISSUE_COMMENT_RESPONSE,
  FIXTURE_PULL_REQUEST,
  FIXTURE_PULL_REQUESTS_LIST,
  FIXTURE_WORKFLOW_RUNS_LIST,
  FIXTURE_LINK_HEADER_PAGE1,
  createMockFetch,
  createRateLimitHeaders,
} from './fixtures';

const VALID_TOKEN = 'ghp_test_token_not_real';

function setupRuntime(mockFetch: ReturnType<typeof createMockFetch>) {
  const store = new InMemoryCredentialStore();
  const encryption = new DevelopmentCredentialEncryptionProvider('test-key');
  const resolver = new CredentialResolver(store, encryption);
  void resolver.storeCredentials(GITHUB_CONNECTOR_ID, 'org-1', 'oauth2', { accessToken: VALID_TOKEN });

  const authAdapter = new GitHubTokenAuthAdapter(resolver);
  const client = new GitHubApiClient({}, mockFetch);

  const runtime = new ConnectorRuntime();
  registerGitHubOperations(runtime, client, authAdapter);

  return { runtime, authAdapter, client, store, resolver };
}

function ctx() {
  return createExecutionContext({ organizationId: 'org-1', userId: 'user-1' });
}

describe('GitHub Integration — Full Pipeline', () => {
  let mockFetch: ReturnType<typeof createMockFetch>;

  beforeEach(() => {
    mockFetch = createMockFetch([
      {
        method: 'GET',
        urlPattern: /\/user$/,
        response: { status: 200, body: FIXTURE_USER, headers: createRateLimitHeaders() },
      },
      {
        method: 'GET',
        urlPattern: /\/user\/repos/,
        response: {
          status: 200,
          body: FIXTURE_REPOSITORIES_LIST,
          headers: { ...createRateLimitHeaders(), link: FIXTURE_LINK_HEADER_PAGE1 },
        },
      },
      {
        method: 'GET',
        urlPattern: /\/repos\/[^/]+\/[^/]+$/,
        response: { status: 200, body: FIXTURE_REPOSITORY, headers: createRateLimitHeaders() },
      },
      {
        method: 'GET',
        urlPattern: /\/repos\/[^/]+\/[^/]+\/issues(\?|$)/,
        response: { status: 200, body: FIXTURE_ISSUES_LIST, headers: createRateLimitHeaders() },
      },
      {
        method: 'GET',
        urlPattern: /\/repos\/[^/]+\/[^/]+\/issues\/\d+$/,
        response: { status: 200, body: FIXTURE_ISSUE, headers: createRateLimitHeaders() },
      },
      {
        method: 'POST',
        urlPattern: /\/repos\/[^/]+\/[^/]+\/issues$/,
        response: { status: 201, body: FIXTURE_ISSUE, headers: createRateLimitHeaders() },
      },
      {
        method: 'POST',
        urlPattern: /\/repos\/[^/]+\/[^/]+\/issues\/\d+\/comments$/,
        response: { status: 201, body: FIXTURE_ISSUE_COMMENT_RESPONSE, headers: createRateLimitHeaders() },
      },
      {
        method: 'GET',
        urlPattern: /\/repos\/[^/]+\/[^/]+\/pulls(\?|$)/,
        response: { status: 200, body: FIXTURE_PULL_REQUESTS_LIST, headers: createRateLimitHeaders() },
      },
      {
        method: 'GET',
        urlPattern: /\/repos\/[^/]+\/[^/]+\/pulls\/\d+$/,
        response: { status: 200, body: FIXTURE_PULL_REQUEST, headers: createRateLimitHeaders() },
      },
      {
        method: 'GET',
        urlPattern: /\/repos\/[^/]+\/[^/]+\/actions\/runs/,
        response: { status: 200, body: FIXTURE_WORKFLOW_RUNS_LIST, headers: createRateLimitHeaders() },
      },
      {
        method: 'POST',
        urlPattern: /\/repos\/[^/]+\/[^/]+\/actions\/workflows\/[^/]+\/dispatches$/,
        response: { status: 204, body: null, headers: createRateLimitHeaders() },
      },
    ]);
  });

  it('should execute getAuthenticatedUser through the full pipeline', async () => {
    const { runtime } = setupRuntime(mockFetch);
    const result = await runtime.execute({
      connectorId: GITHUB_CONNECTOR_ID,
      operation: 'github.getAuthenticatedUser',
      input: { organizationId: 'org-1' },
      context: ctx(),
    });

    assert.equal(result.success, true);
    assert.equal(result.connectorId, GITHUB_CONNECTOR_ID);
    const data = result.data as { user: { login: string } };
    assert.equal(data.user.login, 'octocat');
  });

  it('should execute listRepositories with pagination', async () => {
    const { runtime } = setupRuntime(mockFetch);
    const result = await runtime.execute({
      connectorId: GITHUB_CONNECTOR_ID,
      operation: 'github.listRepositories',
      input: { organizationId: 'org-1', page: 1, perPage: 30 },
      context: ctx(),
    });

    assert.equal(result.success, true);
    const data = result.data as { items: unknown[]; hasNextPage: boolean; page: number };
    assert.equal(data.items.length, 1);
    assert.equal(data.hasNextPage, true);
    assert.equal(data.page, 1);
  });

  it('should execute getRepository', async () => {
    const { runtime } = setupRuntime(mockFetch);
    const result = await runtime.execute({
      connectorId: GITHUB_CONNECTOR_ID,
      operation: 'github.getRepository',
      input: { organizationId: 'org-1', owner: 'octocat', repository: 'Hello-World' },
      context: ctx(),
    });

    assert.equal(result.success, true);
    const data = result.data as { repository: { name: string; fullName: string } };
    assert.equal(data.repository.name, 'Hello-World');
    assert.equal(data.repository.fullName, 'octocat/Hello-World');
  });

  it('should execute listIssues', async () => {
    const { runtime } = setupRuntime(mockFetch);
    const result = await runtime.execute({
      connectorId: GITHUB_CONNECTOR_ID,
      operation: 'github.listIssues',
      input: { organizationId: 'org-1', owner: 'octocat', repository: 'Hello-World' },
      context: ctx(),
    });

    assert.equal(result.success, true);
    const data = result.data as { items: unknown[] };
    assert.equal(data.items.length, 1);
  });

  it('should execute getIssue', async () => {
    const { runtime } = setupRuntime(mockFetch);
    const result = await runtime.execute({
      connectorId: GITHUB_CONNECTOR_ID,
      operation: 'github.getIssue',
      input: { organizationId: 'org-1', owner: 'octocat', repository: 'Hello-World', issueNumber: 1347 },
      context: ctx(),
    });

    assert.equal(result.success, true);
    const data = result.data as { issue: { number: number; title: string } };
    assert.equal(data.issue.number, 1347);
  });

  it('should execute createIssue (non-idempotent, not retried)', async () => {
    const { runtime } = setupRuntime(mockFetch);
    const result = await runtime.execute({
      connectorId: GITHUB_CONNECTOR_ID,
      operation: 'github.createIssue',
      input: {
        organizationId: 'org-1',
        owner: 'octocat',
        repository: 'Hello-World',
        title: 'New issue',
      },
      context: ctx(),
    });

    assert.equal(result.success, true);
    assert.equal(result.attempts, 1, 'Non-idempotent operation should not be retried');
  });

  it('should execute addIssueComment (non-idempotent, not retried)', async () => {
    const { runtime } = setupRuntime(mockFetch);
    const result = await runtime.execute({
      connectorId: GITHUB_CONNECTOR_ID,
      operation: 'github.addIssueComment',
      input: {
        organizationId: 'org-1',
        owner: 'octocat',
        repository: 'Hello-World',
        issueNumber: 1347,
        body: 'Test comment',
      },
      context: ctx(),
    });

    assert.equal(result.success, true);
    assert.equal(result.attempts, 1);
  });

  it('should execute listPullRequests', async () => {
    const { runtime } = setupRuntime(mockFetch);
    const result = await runtime.execute({
      connectorId: GITHUB_CONNECTOR_ID,
      operation: 'github.listPullRequests',
      input: { organizationId: 'org-1', owner: 'octocat', repository: 'Hello-World' },
      context: ctx(),
    });

    assert.equal(result.success, true);
    const data = result.data as { items: unknown[] };
    assert.equal(data.items.length, 1);
  });

  it('should execute getPullRequest', async () => {
    const { runtime } = setupRuntime(mockFetch);
    const result = await runtime.execute({
      connectorId: GITHUB_CONNECTOR_ID,
      operation: 'github.getPullRequest',
      input: { organizationId: 'org-1', owner: 'octocat', repository: 'Hello-World', pullNumber: 1347 },
      context: ctx(),
    });

    assert.equal(result.success, true);
    const data = result.data as { pullRequest: { number: number } };
    assert.equal(data.pullRequest.number, 1347);
  });

  it('should execute listWorkflowRuns', async () => {
    const { runtime } = setupRuntime(mockFetch);
    const result = await runtime.execute({
      connectorId: GITHUB_CONNECTOR_ID,
      operation: 'github.listWorkflowRuns',
      input: { organizationId: 'org-1', owner: 'octocat', repository: 'Hello-World' },
      context: ctx(),
    });

    assert.equal(result.success, true);
    const data = result.data as { items: unknown[]; totalCount: number };
    assert.equal(data.items.length, 1);
    assert.equal(data.totalCount, 1);
  });

  it('should execute triggerWorkflowDispatch (non-idempotent, 204 response)', async () => {
    const { runtime } = setupRuntime(mockFetch);
    const result = await runtime.execute({
      connectorId: GITHUB_CONNECTOR_ID,
      operation: 'github.triggerWorkflowDispatch',
      input: {
        organizationId: 'org-1',
        owner: 'octocat',
        repository: 'Hello-World',
        workflowId: 'ci.yml',
        ref: 'main',
      },
      context: ctx(),
    });

    assert.equal(result.success, true);
    assert.equal(result.attempts, 1);
    const data = result.data as { accepted: boolean };
    assert.equal(data.accepted, true);
  });

  it('should record telemetry for all executions', async () => {
    const { runtime } = setupRuntime(mockFetch);
    await runtime.execute({
      connectorId: GITHUB_CONNECTOR_ID,
      operation: 'github.getAuthenticatedUser',
      input: { organizationId: 'org-1' },
      context: ctx(),
    });

    const telemetry = runtime.getTelemetry();
    assert.ok(telemetry.getEventsByType('connector.execution.started').length >= 1);
    assert.ok(telemetry.getEventsByType('connector.execution.completed').length >= 1);
  });

  it('should record metrics for all executions', async () => {
    const { runtime } = setupRuntime(mockFetch);
    await runtime.execute({
      connectorId: GITHUB_CONNECTOR_ID,
      operation: 'github.getAuthenticatedUser',
      input: { organizationId: 'org-1' },
      context: ctx(),
    });

    const snapshot = runtime.getMetrics().getSnapshot({
      connectorId: GITHUB_CONNECTOR_ID,
      organizationId: 'org-1',
      operation: 'github.getAuthenticatedUser',
    });
    assert.ok(snapshot);
    assert.equal(snapshot!.totalExecutions, 1);
    assert.equal(snapshot!.successfulExecutions, 1);
  });

  it('should create audit events for all executions', async () => {
    const { runtime } = setupRuntime(mockFetch);
    await runtime.execute({
      connectorId: GITHUB_CONNECTOR_ID,
      operation: 'github.getAuthenticatedUser',
      input: { organizationId: 'org-1' },
      context: ctx(),
    });

    const auditEvents = runtime.getAuditLog().getEvents();
    assert.ok(auditEvents.some((e) => e.outcome === 'success'));
  });

  it('should fail when credentials are missing', async () => {
    const store = new InMemoryCredentialStore();
    const encryption = new DevelopmentCredentialEncryptionProvider('test-key');
    const resolver = new CredentialResolver(store, encryption);
    const authAdapter = new GitHubTokenAuthAdapter(resolver);
    const client = new GitHubApiClient({}, mockFetch);

    const runtime = new ConnectorRuntime();
    registerGitHubOperations(runtime, client, authAdapter);

    const result = await runtime.execute({
      connectorId: GITHUB_CONNECTOR_ID,
      operation: 'github.getAuthenticatedUser',
      input: { organizationId: 'org-missing' },
      context: createExecutionContext({ organizationId: 'org-missing' }),
    });

    assert.equal(result.success, false);
    assert.equal(result.error!.errorCode, 'AUTHENTICATION_ERROR');
    assert.equal(result.attempts, 1, 'Auth errors should not be retried');
  });
});
