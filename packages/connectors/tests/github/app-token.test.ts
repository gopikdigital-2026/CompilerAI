import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  GitHubInstallationTokenCache,
  GitHubInstallationTokenProvider,
  GitHubAppJwtProvider,
  SystemClock,
} from '../../src/index';
import type { GitHubAppInstallationToken } from '../../src/providers/github/auth/GitHubAppAuthContracts';
import type { GitHubAppCredentials } from '../../src/providers/github/auth/GitHubAppAuthContracts';
import { generateKeyPairSync } from 'node:crypto';

function generateTestPrivateKey(): string {
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048, format: { type: 'pem' }, type: 'pkcs1',
  });
  return typeof privateKey === 'string'
    ? privateKey
    : privateKey.export({ type: 'pkcs1', format: 'pem' }).toString();
}

const TEST_PRIVATE_KEY = generateTestPrivateKey();

const TEST_APP_ID = 12345;
const TEST_INSTALLATION_ID = 67890;
const FAKE_TOKEN = 'ghp_fake_installation_token_not_real';
const FUTURE_EXPIRES = new Date(Date.now() + 60 * 60 * 1000).toISOString();
const SOON_EXPIRES = new Date(Date.now() + 60 * 1000).toISOString();

function makeToken(expiresAt: string): GitHubAppInstallationToken {
  return Object.freeze({
    token: FAKE_TOKEN,
    expiresAt,
    permissions: Object.freeze({ contents: 'read' }),
    repositorySelection: 'all',
  });
}

function makeMockFetch(token: GitHubAppInstallationToken): typeof fetch {
  return (async () => {
    return new Response(JSON.stringify({
      token: token.token,
      expires_at: token.expiresAt,
      permissions: { contents: 'read' },
      repository_selection: 'all',
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;
}

function makeFailingFetch(): typeof fetch {
  return (async () => {
    return new Response('{"message":"Bad credentials"}', {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;
}

describe('GitHubInstallationTokenCache', () => {
  it('should store and retrieve tokens', () => {
    const cache = new GitHubInstallationTokenCache();
    const key = { organizationId: 'org-1', installationId: TEST_INSTALLATION_ID };
    const token = makeToken(FUTURE_EXPIRES);
    cache.set(key, token);
    assert.equal(cache.get(key), token);
    assert.equal(cache.size(), 1);
  });

  it('should overwrite existing entries on set', () => {
    const cache = new GitHubInstallationTokenCache();
    const key = { organizationId: 'org-1', installationId: TEST_INSTALLATION_ID };
    cache.set(key, makeToken(FUTURE_EXPIRES));
    const newToken = makeToken(new Date(Date.now() + 120 * 60 * 1000).toISOString());
    cache.set(key, newToken);
    assert.equal(cache.get(key), newToken);
    assert.equal(cache.size(), 1);
  });

  it('should delete entries', () => {
    const cache = new GitHubInstallationTokenCache();
    const key = { organizationId: 'org-1', installationId: TEST_INSTALLATION_ID };
    cache.set(key, makeToken(FUTURE_EXPIRES));
    cache.delete(key);
    assert.equal(cache.get(key), null);
    assert.equal(cache.size(), 0);
  });

  it('should isolate by organization and installation', () => {
    const cache = new GitHubInstallationTokenCache();
    cache.set({ organizationId: 'org-1', installationId: 1 }, makeToken(FUTURE_EXPIRES));
    cache.set({ organizationId: 'org-2', installationId: 1 }, makeToken(FUTURE_EXPIRES));
    assert.equal(cache.size(), 2);
    assert.ok(cache.get({ organizationId: 'org-1', installationId: 1 }));
    assert.ok(cache.get({ organizationId: 'org-2', installationId: 1 }));
  });

  it('should clear all entries', () => {
    const cache = new GitHubInstallationTokenCache();
    cache.set({ organizationId: 'org-1', installationId: 1 }, makeToken(FUTURE_EXPIRES));
    cache.clear();
    assert.equal(cache.size(), 0);
  });
});

describe('GitHubInstallationTokenProvider', () => {
  it('should fetch and cache installation token', async () => {
    const clock = new SystemClock();
    const jwtProvider = new GitHubAppJwtProvider(clock);
    const cache = new GitHubInstallationTokenCache();
    const tokenProvider = new GitHubInstallationTokenProvider(
      jwtProvider, cache, clock, { refreshThresholdMs: 60_000 },
    );

    const mockFetch = makeMockFetch(makeToken(FUTURE_EXPIRES));
    const creds: GitHubAppCredentials = {
      appId: TEST_APP_ID,
      privateKey: '',
      installationId: TEST_INSTALLATION_ID,
    };

    // We need a real private key for JWT generation
    creds.privateKey = TEST_PRIVATE_KEY;

    const token = await tokenProvider.getToken(creds, 'org-1', TEST_INSTALLATION_ID, mockFetch);
    assert.equal(token.token, FAKE_TOKEN);
    assert.equal(cache.size(), 1);

    // Second call should use cache
    let fetchCalled = 0;
    const countingFetch: typeof fetch = ((_url: unknown) => {
      fetchCalled++;
      return makeMockFetch(makeToken(FUTURE_EXPIRES))();
    }) as typeof fetch;
    await tokenProvider.getToken(creds, 'org-1', TEST_INSTALLATION_ID, countingFetch);
    assert.equal(fetchCalled, 0, 'Should use cached token');
  });

  it('should refresh when token is near expiry', async () => {
    const clock = new SystemClock();
    const jwtProvider = new GitHubAppJwtProvider(clock);
    const cache = new GitHubInstallationTokenCache();
    const tokenProvider = new GitHubInstallationTokenProvider(
      jwtProvider, cache, clock, { refreshThresholdMs: 120_000 },
    );

    // Pre-populate cache with near-expiry token
    cache.set({ organizationId: 'org-1', installationId: TEST_INSTALLATION_ID }, makeToken(SOON_EXPIRES));

    const creds: GitHubAppCredentials = {
      appId: TEST_APP_ID,
      privateKey: TEST_PRIVATE_KEY,
      installationId: TEST_INSTALLATION_ID,
    };

    const newToken = makeToken(new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString());
    const mockFetch = makeMockFetch(newToken);
    const token = await tokenProvider.getToken(creds, 'org-1', TEST_INSTALLATION_ID, mockFetch);
    assert.equal(token.token, newToken.token);
  });

  it('should prevent concurrent refresh (single-flight)', async () => {
    const clock = new SystemClock();
    const jwtProvider = new GitHubAppJwtProvider(clock);
    const cache = new GitHubInstallationTokenCache();
    const tokenProvider = new GitHubInstallationTokenProvider(
      jwtProvider, cache, clock,
    );

    const creds: GitHubAppCredentials = {
      appId: TEST_APP_ID,
      privateKey: TEST_PRIVATE_KEY,
      installationId: TEST_INSTALLATION_ID,
    };

    let fetchCalls = 0;
    const slowFetch: typeof fetch = (async () => {
      fetchCalls++;
      await new Promise((r) => setTimeout(r, 50));
      return makeMockFetch(makeToken(FUTURE_EXPIRES))();
    }) as typeof fetch;

    const [t1, t2] = await Promise.all([
      tokenProvider.getToken(creds, 'org-1', TEST_INSTALLATION_ID, slowFetch),
      tokenProvider.getToken(creds, 'org-1', TEST_INSTALLATION_ID, slowFetch),
    ]);
    assert.equal(t1.token, t2.token);
    assert.equal(fetchCalls, 1, 'Concurrent requests should share single fetch');
  });

  it('should throw on API error', async () => {
    const clock = new SystemClock();
    const jwtProvider = new GitHubAppJwtProvider(clock);
    const cache = new GitHubInstallationTokenCache();
    const tokenProvider = new GitHubInstallationTokenProvider(
      jwtProvider, cache, clock,
    );

    const creds: GitHubAppCredentials = {
      appId: TEST_APP_ID,
      privateKey: TEST_PRIVATE_KEY,
      installationId: TEST_INSTALLATION_ID,
    };

    await assert.rejects(
      () => tokenProvider.getToken(creds, 'org-1', TEST_INSTALLATION_ID, makeFailingFetch()),
      /Failed to exchange installation token/,
    );
  });

  it('should detect expired token', () => {
    const clock = new SystemClock();
    const jwtProvider = new GitHubAppJwtProvider(clock);
    const cache = new GitHubInstallationTokenCache();
    const tokenProvider = new GitHubInstallationTokenProvider(jwtProvider, cache, clock);

    const expired = makeToken(new Date(Date.now() - 1000).toISOString());
    assert.ok(tokenProvider.isTokenExpired(expired));
  });
});
