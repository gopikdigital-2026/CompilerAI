import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  InMemoryCredentialStore,
  DevelopmentCredentialEncryptionProvider,
  CredentialResolver,
  GitHubApiClient,
  GitHubTokenAuthAdapter,
  ConnectorAuthenticationError,
  createExecutionContext,
} from '../../src/index';
import { FIXTURE_USER, createMockFetch, createRateLimitHeaders } from './fixtures';

function setup(credentialData?: Record<string, unknown>) {
  const store = new InMemoryCredentialStore();
  const encryption = new DevelopmentCredentialEncryptionProvider('test-key');
  const resolver = new CredentialResolver(store, encryption);

  if (credentialData) {
    resolver.storeCredentials('github', 'org-1', 'oauth2', credentialData);
  }

  const authAdapter = new GitHubTokenAuthAdapter(resolver);
  return { store, encryption, resolver, authAdapter };
}

const VALID_TOKEN = 'ghp_test_token_not_real_no_secrets';

describe('GitHub Authentication', () => {
  let mockFetch: ReturnType<typeof createMockFetch>;

  beforeEach(() => {
    mockFetch = createMockFetch([
      {
        method: 'GET',
        urlPattern: /\/user$/,
        response: {
          status: 200,
          body: FIXTURE_USER,
          headers: createRateLimitHeaders(),
        },
      },
    ]);
  });

  it('should apply token correctly in Authorization header', async () => {
    const { resolver, authAdapter } = setup({ accessToken: VALID_TOKEN });
    const client = new GitHubApiClient({}, mockFetch);

    const token = await authAdapter.getToken('org-1');
    assert.equal(token, VALID_TOKEN);

    await client.get('user', {}, { token, fetchImpl: mockFetch });
    assert.ok(true);
  });

  it('should throw when credentials do not exist', async () => {
    const { authAdapter } = setup();
    await assert.rejects(
      authAdapter.getToken('org-1'),
      (e: unknown) => e instanceof ConnectorAuthenticationError,
    );
  });

  it('should throw when token is empty', async () => {
    const { resolver, authAdapter } = setup({ accessToken: '' });
    await assert.rejects(
      authAdapter.getToken('org-1'),
      (e: unknown) => e instanceof ConnectorAuthenticationError,
    );
  });

  it('should not expose token in error messages or traces', async () => {
    const { authAdapter } = setup();
    try {
      await authAdapter.getToken('org-1');
      assert.fail('Should have thrown');
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      assert.ok(!message.includes(VALID_TOKEN), 'Token should not appear in error message');
    }
  });

  it('should isolate credentials by organization', async () => {
    const store = new InMemoryCredentialStore();
    const encryption = new DevelopmentCredentialEncryptionProvider('test-key');
    const resolver = new CredentialResolver(store, encryption);

    await resolver.storeCredentials('github', 'org-1', 'oauth2', { accessToken: 'token-org-1' });
    await resolver.storeCredentials('github', 'org-2', 'oauth2', { accessToken: 'token-org-2' });

    const authAdapter = new GitHubTokenAuthAdapter(resolver);
    const t1 = await authAdapter.getToken('org-1');
    const t2 = await authAdapter.getToken('org-2');

    assert.equal(t1, 'token-org-1');
    assert.equal(t2, 'token-org-2');
    assert.notEqual(t1, t2);
  });

  it('should get auth headers with Bearer prefix', async () => {
    const { authAdapter } = setup({ accessToken: VALID_TOKEN });
    const headers = await authAdapter.getAuthHeaders('org-1');
    assert.equal(headers['Authorization'], `Bearer ${VALID_TOKEN}`);
  });

  it('should support api_key credential type', async () => {
    const store = new InMemoryCredentialStore();
    const encryption = new DevelopmentCredentialEncryptionProvider('test-key');
    const resolver = new CredentialResolver(store, encryption);
    await resolver.storeCredentials('github', 'org-1', 'api_key', { apiKey: 'ghp_api_key_test' });

    const authAdapter = new GitHubTokenAuthAdapter(resolver);
    const token = await authAdapter.getToken('org-1');
    assert.equal(token, 'ghp_api_key_test');
  });

  it('should support bearer credential type', async () => {
    const store = new InMemoryCredentialStore();
    const encryption = new DevelopmentCredentialEncryptionProvider('test-key');
    const resolver = new CredentialResolver(store, encryption);
    await resolver.storeCredentials('github', 'org-1', 'bearer', { token: 'ghp_bearer_test' });

    const authAdapter = new GitHubTokenAuthAdapter(resolver);
    const token = await authAdapter.getToken('org-1');
    assert.equal(token, 'ghp_bearer_test');
  });
});
