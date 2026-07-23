import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  OAuth2TokenManager,
  TestTokenRefreshProvider,
  FailingTokenRefreshProvider,
  InMemoryCredentialStore,
  DevelopmentCredentialEncryptionProvider,
} from '../src/index';
import type { OAuth2Token } from '../src/index';

const CID = 'test-conn' as never;
const OID = 'org-1';

function createTokenManager(refreshProvider: TestTokenRefreshProvider | FailingTokenRefreshProvider) {
  const store = new InMemoryCredentialStore();
  const encryption = new DevelopmentCredentialEncryptionProvider('test-key');
  const manager = new OAuth2TokenManager(store, encryption, refreshProvider, { refreshThresholdMs: 60_000 });
  return { manager, store, encryption };
}

async function storeToken(
  manager: OAuth2TokenManager,
  store: InMemoryCredentialStore,
  encryption: DevelopmentCredentialEncryptionProvider,
  token: OAuth2Token,
  userId?: string,
): Promise<void> {
  const encrypted = encryption.encrypt(JSON.stringify(token));
  await store.save({
    connectorId: CID,
    organizationId: OID,
    userId: userId ?? null,
    credentialType: 'oauth2',
    encryptedData: encrypted,
    expiresAt: token.expiresAt,
    scopes: token.scope ? token.scope.split(' ') : [],
  });
  manager.clearCache();
}

describe('OAuth2TokenManager — getValidToken', () => {
  it('should return token from store when valid', async () => {
    const { manager, store, encryption } = createTokenManager(new TestTokenRefreshProvider());
    const token: OAuth2Token = {
      accessToken: 'access-123',
      refreshToken: 'refresh-456',
      tokenType: 'Bearer',
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      scope: 'read',
    };
    await storeToken(manager, store, encryption, token);

    const result = await manager.getValidToken(CID, OID);
    assert.ok(result);
    assert.equal(result.accessToken, 'access-123');
  });

  it('should refresh token when close to expiry', async () => {
    const refreshProvider = new TestTokenRefreshProvider();
    const { manager, store, encryption } = createTokenManager(refreshProvider);
    const token: OAuth2Token = {
      accessToken: 'old-access',
      refreshToken: 'refresh-456',
      tokenType: 'Bearer',
      expiresAt: new Date(Date.now() + 30_000).toISOString(),
      scope: 'read',
    };
    await storeToken(manager, store, encryption, token);

    const result = await manager.getValidToken(CID, OID);
    assert.ok(result);
    assert.notEqual(result.accessToken, 'old-access');
  });
});

describe('OAuth2TokenManager — needsRefresh', () => {
  it('should return true when token expires within threshold', () => {
    const { manager } = createTokenManager(new TestTokenRefreshProvider());
    const expiresAt = new Date(Date.now() + 30_000).toISOString();
    assert.equal(manager.needsRefresh({ accessToken: 'a', refreshToken: 'r', tokenType: 'Bearer', expiresAt, scope: '' }), true);
  });

  it('should return false when token is far from expiry', () => {
    const { manager } = createTokenManager(new TestTokenRefreshProvider());
    const expiresAt = new Date(Date.now() + 3600_000).toISOString();
    assert.equal(manager.needsRefresh({ accessToken: 'a', refreshToken: 'r', tokenType: 'Bearer', expiresAt, scope: '' }), false);
  });

  it('should return true when token is already expired', () => {
    const { manager } = createTokenManager(new TestTokenRefreshProvider());
    const expiresAt = new Date(Date.now() - 1000).toISOString();
    assert.equal(manager.needsRefresh({ accessToken: 'a', refreshToken: 'r', tokenType: 'Bearer', expiresAt, scope: '' }), true);
  });
});

describe('OAuth2TokenManager — isTokenExpired', () => {
  it('should return true for expired token', () => {
    const { manager } = createTokenManager(new TestTokenRefreshProvider());
    assert.equal(manager.isTokenExpired({ accessToken: 'a', refreshToken: 'r', tokenType: 'Bearer', expiresAt: '2020-01-01T00:00:00.000Z', scope: '' }), true);
  });

  it('should return false for valid token', () => {
    const { manager } = createTokenManager(new TestTokenRefreshProvider());
    assert.equal(manager.isTokenExpired({ accessToken: 'a', refreshToken: 'r', tokenType: 'Bearer', expiresAt: '2099-01-01T00:00:00.000Z', scope: '' }), false);
  });
});

describe('OAuth2TokenManager — Refresh Mutex', () => {
  it('should prevent simultaneous refresh calls for same connector+org', async () => {
    const refreshProvider = new TestTokenRefreshProvider();
    const { manager, store, encryption } = createTokenManager(refreshProvider);

    let refreshCount = 0;
    const originalRefresh = refreshProvider.refresh.bind(refreshProvider);
    refreshProvider.refresh = async (rt: string, connId: string) => {
      refreshCount++;
      await new Promise((r) => setTimeout(r, 50));
      return originalRefresh(rt, connId);
    };

    const token: OAuth2Token = {
      accessToken: 'old-access',
      refreshToken: 'refresh-456',
      tokenType: 'Bearer',
      expiresAt: new Date(Date.now() - 1000).toISOString(),
      scope: 'read',
    };
    await storeToken(manager, store, encryption, token);

    const [r1, r2, r3] = await Promise.all([
      manager.getValidToken(CID, OID),
      manager.getValidToken(CID, OID),
      manager.getValidToken(CID, OID),
    ]);

    assert.ok(r1);
    assert.ok(r2);
    assert.ok(r3);
    assert.equal(refreshCount, 1, 'refresh should only be called once');
    assert.equal(r1.accessToken, r2.accessToken);
    assert.equal(r2.accessToken, r3.accessToken);
  });
});

describe('OAuth2TokenManager — Refresh Failure', () => {
  it('should throw when refresh fails', async () => {
    const { manager, store, encryption } = createTokenManager(new FailingTokenRefreshProvider());
    const token: OAuth2Token = {
      accessToken: 'old-access',
      refreshToken: 'refresh-456',
      tokenType: 'Bearer',
      expiresAt: new Date(Date.now() - 1000).toISOString(),
      scope: 'read',
    };
    await storeToken(manager, store, encryption, token);

    await assert.rejects(manager.getValidToken(CID, OID));
  });
});

describe('OAuth2TokenManager — Manual Refresh', () => {
  it('should refresh on demand', async () => {
    const { manager, store, encryption } = createTokenManager(new TestTokenRefreshProvider());
    const token: OAuth2Token = {
      accessToken: 'old-access',
      refreshToken: 'refresh-456',
      tokenType: 'Bearer',
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      scope: 'read',
    };
    await storeToken(manager, store, encryption, token);

    const refreshed = await manager.refresh(CID, OID);
    assert.ok(refreshed);
    assert.notEqual(refreshed.accessToken, 'old-access');
  });
});

describe('OAuth2TokenManager — Clear Cache', () => {
  it('should clear cache for specific connector+org', async () => {
    const { manager, store, encryption } = createTokenManager(new TestTokenRefreshProvider());
    const token: OAuth2Token = {
      accessToken: 'access-123',
      refreshToken: 'refresh-456',
      tokenType: 'Bearer',
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      scope: 'read',
    };
    await storeToken(manager, store, encryption, token);

    await manager.getValidToken(CID, OID);
    manager.clearCache(CID, OID);
    // After cache clear, it should read from store again
    const result = await manager.getValidToken(CID, OID);
    assert.ok(result);
  });

  it('should clear all cache', async () => {
    const { manager } = createTokenManager(new TestTokenRefreshProvider());
    manager.clearCache();
    assert.ok(true);
  });
});

describe('TokenRefreshProviders', () => {
  it('TestTokenRefreshProvider should return a new token', async () => {
    const provider = new TestTokenRefreshProvider();
    const token = await provider.refresh('old-refresh', CID);
    assert.ok(token.accessToken);
    assert.notEqual(token.accessToken, 'old-refresh');
    assert.ok(token.expiresAt);
  });

  it('FailingTokenRefreshProvider should throw', async () => {
    const provider = new FailingTokenRefreshProvider();
    await assert.rejects(provider.refresh('old-refresh', CID));
  });
});
