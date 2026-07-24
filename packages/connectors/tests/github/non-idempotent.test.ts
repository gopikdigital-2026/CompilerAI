import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ConnectorRuntime,
  InMemoryCredentialStore,
  DevelopmentCredentialEncryptionProvider,
  CredentialResolver,
  registerGitHubConnector,
  GITHUB_CONNECTOR_ID,
  createExecutionContext,
} from '../../src/index';
import {
  createMockFetch,
  createRateLimitHeaders,
  FIXTURE_ISSUE,
  FIXTURE_ISSUE_COMMENT_RESPONSE,
} from './fixtures';

const VALID_TOKEN = 'ghp_test_token_not_real';

function setupRuntime(mockFetch: ReturnType<typeof createMockFetch>) {
  const store = new InMemoryCredentialStore();
  const encryption = new DevelopmentCredentialEncryptionProvider('test-key');
  const resolver = new CredentialResolver(store, encryption);
  void resolver.storeCredentials(GITHUB_CONNECTOR_ID, 'org-1', 'oauth2', { accessToken: VALID_TOKEN });
  const runtime = new ConnectorRuntime();
  registerGitHubConnector({ runtime, credentialResolver: resolver, transport: mockFetch });
  return { runtime };
}

function ctx() {
  return createExecutionContext({ organizationId: 'org-1', userId: 'user-1' });
}

describe('Non-idempotent operations — no retry on failure', () => {
  it('should not retry github.createIssue on 500 error', async () => {
    let callCount = 0;
    const mockFetch = createMockFetch([
      {
        method: 'POST',
        urlPattern: /\/repos\/[^/]+\/[^/]+\/issues$/,
        response: () => {
          callCount++;
          return { status: 500, body: { message: 'Server Error' }, headers: {} };
        },
      },
    ]);

    const { runtime } = setupRuntime(mockFetch);
    const result = await runtime.execute({
      connectorId: GITHUB_CONNECTOR_ID,
      operation: 'github.createIssue',
      input: { organizationId: 'org-1', owner: 'octocat', repository: 'Hello-World', title: 'Test' },
      context: ctx(),
    });

    assert.equal(result.success, false);
    assert.equal(result.attempts, 1, 'Non-idempotent operation should not be retried');
    assert.equal(callCount, 1, `Expected exactly 1 HTTP call, got ${callCount}`);
  });

  it('should not retry github.addIssueComment on 500 error', async () => {
    let callCount = 0;
    const mockFetch = createMockFetch([
      {
        method: 'POST',
        urlPattern: /\/repos\/[^/]+\/[^/]+\/issues\/\d+\/comments$/,
        response: () => {
          callCount++;
          return { status: 500, body: { message: 'Server Error' }, headers: {} };
        },
      },
    ]);

    const { runtime } = setupRuntime(mockFetch);
    const result = await runtime.execute({
      connectorId: GITHUB_CONNECTOR_ID,
      operation: 'github.addIssueComment',
      input: { organizationId: 'org-1', owner: 'octocat', repository: 'Hello-World', issueNumber: 1347, body: 'Comment' },
      context: ctx(),
    });

    assert.equal(result.success, false);
    assert.equal(result.attempts, 1);
    assert.equal(callCount, 1);
  });

  it('should not retry github.triggerWorkflowDispatch on 500 error', async () => {
    let callCount = 0;
    const mockFetch = createMockFetch([
      {
        method: 'POST',
        urlPattern: /\/repos\/[^/]+\/[^/]+\/actions\/workflows\/[^/]+\/dispatches$/,
        response: () => {
          callCount++;
          return { status: 500, body: { message: 'Server Error' }, headers: {} };
        },
      },
    ]);

    const { runtime } = setupRuntime(mockFetch);
    const result = await runtime.execute({
      connectorId: GITHUB_CONNECTOR_ID,
      operation: 'github.triggerWorkflowDispatch',
      input: { organizationId: 'org-1', owner: 'octocat', repository: 'Hello-World', workflowId: 'ci.yml', ref: 'main' },
      context: ctx(),
    });

    assert.equal(result.success, false);
    assert.equal(result.attempts, 1);
    assert.equal(callCount, 1);
  });

  it('should retry idempotent github.getIssue on 500 error', async () => {
    let callCount = 0;
    const mockFetch = createMockFetch([
      {
        method: 'GET',
        urlPattern: /\/repos\/[^/]+\/[^/]+\/issues\/\d+$/,
        response: () => {
          callCount++;
          if (callCount < 2) {
            return { status: 500, body: { message: 'Server Error' }, headers: {} };
          }
          return { status: 200, body: FIXTURE_ISSUE, headers: createRateLimitHeaders() };
        },
      },
    ]);

    const { runtime } = setupRuntime(mockFetch);
    const result = await runtime.execute({
      connectorId: GITHUB_CONNECTOR_ID,
      operation: 'github.getIssue',
      input: { organizationId: 'org-1', owner: 'octocat', repository: 'Hello-World', issueNumber: 1347 },
      context: ctx(),
    });

    assert.equal(result.success, true);
    assert.ok(result.attempts > 1, 'Idempotent operation should be retried');
    assert.ok(callCount > 1, 'Expected multiple HTTP calls for retry');
  });

  it('should succeed on first attempt for createIssue', async () => {
    let callCount = 0;
    const mockFetch = createMockFetch([
      {
        method: 'POST',
        urlPattern: /\/repos\/[^/]+\/[^/]+\/issues$/,
        response: () => {
          callCount++;
          return { status: 201, body: FIXTURE_ISSUE, headers: createRateLimitHeaders() };
        },
      },
    ]);

    const { runtime } = setupRuntime(mockFetch);
    const result = await runtime.execute({
      connectorId: GITHUB_CONNECTOR_ID,
      operation: 'github.createIssue',
      input: { organizationId: 'org-1', owner: 'octocat', repository: 'Hello-World', title: 'Test' },
      context: ctx(),
    });

    assert.equal(result.success, true);
    assert.equal(result.attempts, 1);
    assert.equal(callCount, 1);
  });

  it('should succeed on first attempt for addIssueComment', async () => {
    let callCount = 0;
    const mockFetch = createMockFetch([
      {
        method: 'POST',
        urlPattern: /\/repos\/[^/]+\/[^/]+\/issues\/\d+\/comments$/,
        response: () => {
          callCount++;
          return { status: 201, body: FIXTURE_ISSUE_COMMENT_RESPONSE, headers: createRateLimitHeaders() };
        },
      },
    ]);

    const { runtime } = setupRuntime(mockFetch);
    const result = await runtime.execute({
      connectorId: GITHUB_CONNECTOR_ID,
      operation: 'github.addIssueComment',
      input: { organizationId: 'org-1', owner: 'octocat', repository: 'Hello-World', issueNumber: 1347, body: 'Comment' },
      context: ctx(),
    });

    assert.equal(result.success, true);
    assert.equal(result.attempts, 1);
    assert.equal(callCount, 1);
  });
});
