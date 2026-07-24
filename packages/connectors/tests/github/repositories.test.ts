import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  GitHubApiClient,
  GitHubTokenAuthAdapter,
  InMemoryCredentialStore,
  DevelopmentCredentialEncryptionProvider,
  CredentialResolver,
} from '../../src/index';
import {
  FIXTURE_USER,
  FIXTURE_REPOSITORY,
  FIXTURE_REPOSITORIES_LIST,
  FIXTURE_LINK_HEADER_PAGE1,
  FIXTURE_LINK_HEADER_PAGE2,
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

describe('GitHub Repositories', () => {
  let mockFetch: ReturnType<typeof createMockFetch>;

  beforeEach(() => {
    mockFetch = createMockFetch([
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
        response: {
          status: 200,
          body: FIXTURE_REPOSITORY,
          headers: createRateLimitHeaders(),
        },
      },
    ]);
  });

  it('should list repositories with correct mapping', async () => {
    const { client, authAdapter } = setupClient(mockFetch);
    const token = await authAdapter.getToken('org-1');
    const response = await client.get('user/repos', { page: 1, per_page: 30 }, { token, fetchImpl: mockFetch });

    assert.equal(response.status, 200);
    const repos = response.data as readonly unknown[];
    assert.equal(repos.length, 1);

    const repo = repos[0] as typeof FIXTURE_REPOSITORY;
    assert.equal(repo.id, 1296269);
    assert.equal(repo.name, 'Hello-World');
    assert.equal(repo.full_name, 'octocat/Hello-World');
    assert.equal(repo.private, false);
    assert.equal(repo.archived, false);
    assert.equal(repo.default_branch, 'master');
    assert.equal(repo.stargazers_count, 80);
  });

  it('should detect pagination from Link header', async () => {
    const { client, authAdapter } = setupClient(mockFetch);
    const token = await authAdapter.getToken('org-1');
    const response = await client.get('user/repos', { page: 1, per_page: 30 }, { token, fetchImpl: mockFetch });

    assert.ok(response.headers['link']);
    assert.ok(response.headers['link'].includes('rel="next"'));
    assert.ok(response.headers['link'].includes('rel="last"'));
  });

  it('should get a single repository', async () => {
    const { client, authAdapter } = setupClient(mockFetch);
    const token = await authAdapter.getToken('org-1');
    const response = await client.get('repos/octocat/Hello-World', {}, { token, fetchImpl: mockFetch });

    assert.equal(response.status, 200);
    const repo = response.data as typeof FIXTURE_REPOSITORY;
    assert.equal(repo.id, 1296269);
    assert.equal(repo.name, 'Hello-World');
    assert.equal(repo.owner.login, 'octocat');
    assert.equal(repo.owner.type, 'User');
  });

  it('should return 404 for non-existent repository', async () => {
    mockFetch = createMockFetch([
      {
        method: 'GET',
        urlPattern: /\/repos\/[^/]+\/notfound$/,
        response: { status: 404, body: { message: 'Not Found' }, headers: {} },
      },
    ]);
    const { client, authAdapter } = setupClient(mockFetch);
    const token = await authAdapter.getToken('org-1');

    await assert.rejects(
      client.get('repos/octocat/notfound', {}, { token, fetchImpl: mockFetch }),
    );
  });

  it('should map repository fields correctly', async () => {
    const { client, authAdapter } = setupClient(mockFetch);
    const token = await authAdapter.getToken('org-1');
    const response = await client.get('repos/octocat/Hello-World', {}, { token, fetchImpl: mockFetch });
    const repo = response.data as typeof FIXTURE_REPOSITORY;

    assert.equal(repo.id, 1296269);
    assert.equal(repo.full_name, 'octocat/Hello-World');
    assert.equal(repo.description, 'My first repository on GitHub!');
    assert.equal(repo.language, 'C');
    assert.equal(repo.forks_count, 9);
    assert.equal(repo.open_issues_count, 0);
    assert.equal(repo.created_at, '2011-01-26T19:01:12Z');
    assert.equal(repo.clone_url, 'https://github.com/octocat/Hello-World.git');
  });
});
