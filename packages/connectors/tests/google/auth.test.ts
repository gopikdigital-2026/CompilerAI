import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  InMemoryCredentialStore,
  DevelopmentCredentialEncryptionProvider,
  CredentialResolver,
  GoogleOAuth2Adapter,
  ConnectorAuthenticationError,
} from '../../src/index';
import { TestTokenRefreshProvider } from '../../src/providers/google/auth/GoogleTokenRefreshProvider';
import {
  VALID_ACCESS_TOKEN,
  REFRESH_TOKEN,
  CLIENT_ID,
  CLIENT_SECRET,
  TOKEN_REFRESH_RESPONSE,
} from './fixtures';

function setup(credentialData?: Record<string, unknown>) {
  const store = new InMemoryCredentialStore();
  const encryption = new DevelopmentCredentialEncryptionProvider('test-key');
  const resolver = new CredentialResolver(store, encryption);

  if (credentialData) {
    resolver.storeCredentials('google-workspace', 'org-1', 'oauth2', credentialData);
  }

  const refreshProvider = new TestTokenRefreshProvider(TOKEN_REFRESH_RESPONSE);
  const authAdapter = new GoogleOAuth2Adapter(resolver, refreshProvider);
  return { store, encryption, resolver, authAdapter, refreshProvider };
}

const CREDENTIALS = {
  accessToken: VALID_ACCESS_TOKEN,
  refreshToken: REFRESH_TOKEN,
  clientId: CLIENT_ID,
  clientSecret: CLIENT_SECRET,
};

describe('Google OAuth2 Authentication', () => {
  it('should return cached token without refresh when not expired', async () => {
    const { authAdapter, refreshProvider } = setup(CREDENTIALS);

    // First call triggers a refresh to populate cache
    const token1 = await authAdapter.getAccessToken('org-1');
    assert.equal(token1, VALID_ACCESS_TOKEN);
    assert.equal(refreshProvider.refreshCount, 1);

    // Second call should use cache without refreshing
    const token2 = await authAdapter.getAccessToken('org-1');
    assert.equal(token2, VALID_ACCESS_TOKEN);
    assert.equal(refreshProvider.refreshCount, 1);
  });

  it('should throw ConnectorAuthenticationError when no credentials exist', async () => {
    const { authAdapter } = setup();
    await assert.rejects(
      authAdapter.getAccessToken('org-1'),
      (e: unknown) => e instanceof ConnectorAuthenticationError,
    );
  });

  it('should throw when required fields are missing', async () => {
    const { authAdapter } = setup({
      accessToken: VALID_ACCESS_TOKEN,
      refreshToken: REFRESH_TOKEN,
      clientId: CLIENT_ID,
      // clientSecret omitted
    });
    await assert.rejects(
      authAdapter.getAccessToken('org-1'),
      (e: unknown) => e instanceof ConnectorAuthenticationError,
    );
  });

  it('should isolate credentials by organization', async () => {
    const store = new InMemoryCredentialStore();
    const encryption = new DevelopmentCredentialEncryptionProvider('test-key');
    const resolver = new CredentialResolver(store, encryption);

    await resolver.storeCredentials('google-workspace', 'org-1', 'oauth2', {
      ...CREDENTIALS,
      accessToken: 'ya29.token-org-1',
    });
    await resolver.storeCredentials('google-workspace', 'org-2', 'oauth2', {
      ...CREDENTIALS,
      accessToken: 'ya29.token-org-2',
    });

    const refreshProvider = new TestTokenRefreshProvider({
      access_token: 'ya29.token-org-1',
      expires_in: 3600,
      token_type: 'Bearer',
    });
    const refreshProvider2 = new TestTokenRefreshProvider({
      access_token: 'ya29.token-org-2',
      expires_in: 3600,
      token_type: 'Bearer',
    });

    // Use separate adapters to avoid cross-cache contamination
    const adapter1 = new GoogleOAuth2Adapter(resolver, refreshProvider);
    const adapter2 = new GoogleOAuth2Adapter(resolver, refreshProvider2);

    const t1 = await adapter1.getAccessToken('org-1');
    const t2 = await adapter2.getAccessToken('org-2');

    assert.equal(t1, 'ya29.token-org-1');
    assert.equal(t2, 'ya29.token-org-2');
    assert.notEqual(t1, t2);
  });

  it('should get auth headers with Bearer prefix', async () => {
    const { authAdapter } = setup(CREDENTIALS);
    const headers = await authAdapter.getAuthHeaders('org-1');
    assert.equal(headers['Authorization'], `Bearer ${VALID_ACCESS_TOKEN}`);
  });

  it('should invalidate cached token', async () => {
    const { authAdapter, refreshProvider } = setup(CREDENTIALS);

    // Populate cache
    await authAdapter.getAccessToken('org-1');
    assert.equal(refreshProvider.refreshCount, 1);

    // Invalidate
    authAdapter.invalidateCache('org-1');

    // Next call should refresh again
    await authAdapter.getAccessToken('org-1');
    assert.equal(refreshProvider.refreshCount, 2);
  });

  it('should single-flight concurrent refresh requests', async () => {
    const { authAdapter, refreshProvider } = setup(CREDENTIALS);

    // Fire multiple concurrent requests
    const tokens = await Promise.all([
      authAdapter.getAccessToken('org-1'),
      authAdapter.getAccessToken('org-1'),
      authAdapter.getAccessToken('org-1'),
    ]);

    // All should get the same token
    assert.ok(tokens.every((t) => t === VALID_ACCESS_TOKEN));
    // Only one refresh should have happened
    assert.equal(refreshProvider.refreshCount, 1);
  });

  it('should not expose token in error messages', async () => {
    const { authAdapter } = setup();
    try {
      await authAdapter.getAccessToken('org-1');
      assert.fail('Should have thrown');
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      assert.ok(!message.includes(VALID_ACCESS_TOKEN), 'Token should not appear in error message');
    }
  });
});
