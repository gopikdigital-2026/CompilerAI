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
  FIXTURE_PULL_REQUEST,
  FIXTURE_PULL_REQUEST_MERGED,
  FIXTURE_PULL_REQUEST_DRAFT,
  FIXTURE_PULL_REQUESTS_LIST,
  FIXTURE_WORKFLOW_RUN,
  FIXTURE_WORKFLOW_RUNS_LIST,
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

describe('GitHub Pull Requests', () => {
  let mockFetch: ReturnType<typeof createMockFetch>;

  beforeEach(() => {
    mockFetch = createMockFetch([
      {
        method: 'GET',
        urlPattern: /\/repos\/[^/]+\/[^/]+\/pulls(\?|$)/,
        response: {
          status: 200,
          body: FIXTURE_PULL_REQUESTS_LIST,
          headers: createRateLimitHeaders(),
        },
      },
      {
        method: 'GET',
        urlPattern: /\/repos\/[^/]+\/[^/]+\/pulls\/\d+$/,
        response: {
          status: 200,
          body: FIXTURE_PULL_REQUEST,
          headers: createRateLimitHeaders(),
        },
      },
    ]);
  });

  it('should list pull requests', async () => {
    const { client, authAdapter } = setupClient(mockFetch);
    const token = await authAdapter.getToken('org-1');
    const response = await client.get(
      'repos/octocat/Hello-World/pulls',
      { state: 'open', page: 1, per_page: 30 },
      { token, fetchImpl: mockFetch },
    );

    assert.equal(response.status, 200);
    const prs = response.data as readonly unknown[];
    assert.equal(prs.length, 1);
  });

  it('should get a single pull request', async () => {
    const { client, authAdapter } = setupClient(mockFetch);
    const token = await authAdapter.getToken('org-1');
    const response = await client.get(
      'repos/octocat/Hello-World/pulls/1347',
      {},
      { token, fetchImpl: mockFetch },
    );

    const pr = response.data as typeof FIXTURE_PULL_REQUEST;
    assert.equal(pr.number, 1347);
    assert.equal(pr.title, 'new-feature');
  });

  it('should map PR statistics correctly', () => {
    const mapped = GitHubResponseMapper.mapPullRequest(FIXTURE_PULL_REQUEST);
    assert.equal(mapped.commits, 3);
    assert.equal(mapped.changedFiles, 2);
    assert.equal(mapped.additions, 100);
    assert.equal(mapped.deletions, 3);
    assert.equal(mapped.mergeable, true);
    assert.equal(mapped.merged, false);
  });

  it('should map draft PR correctly', () => {
    const mapped = GitHubResponseMapper.mapPullRequest(FIXTURE_PULL_REQUEST_DRAFT);
    assert.equal(mapped.draft, true);
    assert.equal(mapped.merged, false);
  });

  it('should map merged PR correctly', () => {
    const mapped = GitHubResponseMapper.mapPullRequest(FIXTURE_PULL_REQUEST_MERGED);
    assert.equal(mapped.merged, true);
    assert.equal(mapped.state, 'closed');
    assert.ok(mapped.mergedAt);
    assert.ok(mapped.mergedBy);
    assert.equal(mapped.mergedBy!.login, 'octocat');
  });

  it('should map head and base branches', () => {
    const mapped = GitHubResponseMapper.mapPullRequest(FIXTURE_PULL_REQUEST);
    assert.equal(mapped.head.ref, 'new-topic');
    assert.equal(mapped.head.sha, '6dcb09b5b57875f334f61aebed695e2e4193db5e');
    assert.equal(mapped.head.repo, 'octocat/Hello-World');
    assert.equal(mapped.base.ref, 'master');
  });
});

describe('GitHub Actions', () => {
  let mockFetch: ReturnType<typeof createMockFetch>;

  beforeEach(() => {
    mockFetch = createMockFetch([
      {
        method: 'GET',
        urlPattern: /\/repos\/[^/]+\/[^/]+\/actions\/runs/,
        response: {
          status: 200,
          body: FIXTURE_WORKFLOW_RUNS_LIST,
          headers: createRateLimitHeaders(),
        },
      },
      {
        method: 'POST',
        urlPattern: /\/repos\/[^/]+\/[^/]+\/actions\/workflows\/[^/]+\/dispatches$/,
        response: {
          status: 204,
          body: null,
          headers: createRateLimitHeaders(),
        },
      },
    ]);
  });

  it('should list workflow runs', async () => {
    const { client, authAdapter } = setupClient(mockFetch);
    const token = await authAdapter.getToken('org-1');
    const response = await client.get<{ total_count: number; workflow_runs: unknown[] }>(
      'repos/octocat/Hello-World/actions/runs',
      { page: 1, per_page: 30 },
      { token, fetchImpl: mockFetch },
    );

    assert.equal(response.status, 200);
    assert.equal(response.data.total_count, 1);
    assert.equal(response.data.workflow_runs.length, 1);
  });

  it('should trigger workflow dispatch and get 204', async () => {
    const { client, authAdapter } = setupClient(mockFetch);
    const token = await authAdapter.getToken('org-1');
    const response = await client.post(
      'repos/octocat/Hello-World/actions/workflows/ci.yml/dispatches',
      { ref: 'main', inputs: { environment: 'staging' } },
      { token, fetchImpl: mockFetch },
    );

    assert.equal(response.status, 204);
    assert.equal(response.data, null);
  });

  it('should map workflow run fields correctly', () => {
    const mapped = GitHubResponseMapper.mapWorkflowRun(FIXTURE_WORKFLOW_RUN);
    assert.equal(mapped.id, 30433642);
    assert.equal(mapped.name, 'Build');
    assert.equal(mapped.status, 'completed');
    assert.equal(mapped.conclusion, 'success');
    assert.equal(mapped.event, 'push');
    assert.equal(mapped.runNumber, 56);
    assert.equal(mapped.actor!.login, 'octocat');
  });

  it('should map workflow runs list with totalCount', () => {
    const mapped = GitHubResponseMapper.mapWorkflowRunsList(FIXTURE_WORKFLOW_RUNS_LIST);
    assert.equal(mapped.totalCount, 1);
    assert.equal(mapped.runs.length, 1);
  });
});
