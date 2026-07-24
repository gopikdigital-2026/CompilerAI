import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  GitHubApiClient,
  GitHubTokenAuthAdapter,
  InMemoryCredentialStore,
  DevelopmentCredentialEncryptionProvider,
  CredentialResolver,
  GitHubResponseMapper,
} from '../../src/index';
import {
  FIXTURE_ISSUE,
  FIXTURE_ISSUES_LIST,
  FIXTURE_ISSUE_COMMENT_RESPONSE,
  FIXTURE_USER,
  createMockFetch,
  createRateLimitHeaders,
} from './fixtures';

const VALID_TOKEN = 'ghp_test_token_not_real';

function setupClient(mockFetch: ReturnType<typeof createMockFetch>) {
  const store = new InMemoryCredentialStore();
  const encryption = new DevelopmentCredentialEncryptionProvider('test-key');
  const resolver = new CredentialResolver(store, encryption);
  void resolver.storeCredentials('github', 'org-1', 'oauth2', { accessToken: VALID_TOKEN });
  const authAdapter = new GitHubTokenAuthAdapter(resolver);
  const client = new GitHubApiClient({}, mockFetch);
  return { client, authAdapter };
}

describe('GitHub Issues', () => {
  let mockFetch: ReturnType<typeof createMockFetch>;

  beforeEach(() => {
    mockFetch = createMockFetch([
      {
        method: 'GET',
        urlPattern: /\/repos\/[^/]+\/[^/]+\/issues(\?|$)/,
        response: {
          status: 200,
          body: FIXTURE_ISSUES_LIST,
          headers: createRateLimitHeaders(),
        },
      },
      {
        method: 'GET',
        urlPattern: /\/repos\/[^/]+\/[^/]+\/issues\/\d+$/,
        response: {
          status: 200,
          body: FIXTURE_ISSUE,
          headers: createRateLimitHeaders(),
        },
      },
      {
        method: 'POST',
        urlPattern: /\/repos\/[^/]+\/[^/]+\/issues$/,
        response: {
          status: 201,
          body: FIXTURE_ISSUE,
          headers: createRateLimitHeaders(),
        },
      },
      {
        method: 'POST',
        urlPattern: /\/repos\/[^/]+\/[^/]+\/issues\/\d+\/comments$/,
        response: {
          status: 201,
          body: FIXTURE_ISSUE_COMMENT_RESPONSE,
          headers: createRateLimitHeaders(),
        },
      },
    ]);
  });

  it('should list issues', async () => {
    const { client, authAdapter } = setupClient(mockFetch);
    const token = await authAdapter.getToken('org-1');
    const response = await client.get(
      'repos/octocat/Hello-World/issues',
      { state: 'open', page: 1, per_page: 30 },
      { token, fetchImpl: mockFetch },
    );

    assert.equal(response.status, 200);
    const issues = response.data as readonly unknown[];
    assert.equal(issues.length, 1);
  });

  it('should get a single issue', async () => {
    const { client, authAdapter } = setupClient(mockFetch);
    const token = await authAdapter.getToken('org-1');
    const response = await client.get(
      'repos/octocat/Hello-World/issues/1347',
      {},
      { token, fetchImpl: mockFetch },
    );

    const issue = response.data as typeof FIXTURE_ISSUE;
    assert.equal(issue.number, 1347);
    assert.equal(issue.title, 'Found a bug');
    assert.equal(issue.state, 'open');
  });

  it('should create an issue', async () => {
    const { client, authAdapter } = setupClient(mockFetch);
    const token = await authAdapter.getToken('org-1');
    const response = await client.post(
      'repos/octocat/Hello-World/issues',
      { title: 'New bug report', body: 'Found a new issue' },
      { token, fetchImpl: mockFetch },
    );

    assert.equal(response.status, 201);
    const issue = response.data as typeof FIXTURE_ISSUE;
    assert.equal(issue.title, 'Found a bug');
  });

  it('should add a comment to an issue', async () => {
    const { client, authAdapter } = setupClient(mockFetch);
    const token = await authAdapter.getToken('org-1');
    const response = await client.post(
      'repos/octocat/Hello-World/issues/1347/comments',
      { body: 'This is a comment' },
      { token, fetchImpl: mockFetch },
    );

    assert.equal(response.status, 201);
    const comment = response.data as typeof FIXTURE_ISSUE_COMMENT_RESPONSE;
    assert.equal(comment.id, 1);
    assert.ok(comment.html_url);
  });

  it('should map issue fields correctly', () => {
    const mapped = GitHubResponseMapper.mapIssue(FIXTURE_ISSUE);
    assert.equal(mapped.id, 1);
    assert.equal(mapped.number, 1347);
    assert.equal(mapped.title, 'Found a bug');
    assert.equal(mapped.state, 'open');
    assert.equal(mapped.author!.login, 'octocat');
    assert.equal(mapped.labels.length, 1);
    assert.equal(mapped.labels[0]!.name, 'bug');
    assert.equal(mapped.commentsCount, 0);
    assert.equal(mapped.closedAt, null);
  });

  it('should map issue comment fields correctly', () => {
    const mapped = GitHubResponseMapper.mapIssueComment(FIXTURE_ISSUE_COMMENT_RESPONSE);
    assert.equal(mapped.id, 1);
    assert.equal(mapped.htmlUrl, FIXTURE_ISSUE_COMMENT_RESPONSE.html_url);
    assert.equal(mapped.createdAt, FIXTURE_ISSUE_COMMENT_RESPONSE.created_at);
  });
});
