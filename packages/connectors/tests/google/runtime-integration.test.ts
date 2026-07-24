import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  InMemoryCredentialStore,
  DevelopmentCredentialEncryptionProvider,
  CredentialResolver,
  ConnectorRuntime,
  registerGoogleConnector,
  GOOGLE_CONNECTOR_ID,
  GOOGLE_OPERATION_NAMES,
} from '../../src/index';
import { TestTokenRefreshProvider } from '../../src/providers/google/auth/GoogleTokenRefreshProvider';
import { createMockFetch } from './mocks/MockFetch';
import {
  VALID_ACCESS_TOKEN,
  REFRESH_TOKEN,
  CLIENT_ID,
  CLIENT_SECRET,
  TOKEN_REFRESH_RESPONSE,
  FIXTURE_DRIVE_FILE_LIST,
} from './fixtures';

const CREDENTIALS = {
  accessToken: VALID_ACCESS_TOKEN,
  refreshToken: REFRESH_TOKEN,
  clientId: CLIENT_ID,
  clientSecret: CLIENT_SECRET,
};

function createContext(mockFetch: ReturnType<typeof createMockFetch>) {
  return {
    organizationId: 'org-1',
    userId: null,
    requestId: 'r-1',
    correlationId: 'c-1',
    traceId: 't-1',
    metadata: { fetchImpl: mockFetch },
  };
}

function createSetup(mockFetch: ReturnType<typeof createMockFetch>) {
  const store = new InMemoryCredentialStore();
  const encryption = new DevelopmentCredentialEncryptionProvider('test-key');
  const resolver = new CredentialResolver(store, encryption);
  resolver.storeCredentials('google-workspace', 'org-1', 'oauth2', CREDENTIALS);

  const runtime = new ConnectorRuntime();
  const refreshProvider = new TestTokenRefreshProvider(TOKEN_REFRESH_RESPONSE);

  registerGoogleConnector({
    runtime,
    credentialResolver: resolver,
    refreshProvider,
    transport: mockFetch,
  });

  return { store, encryption, resolver, runtime, mockFetch };
}

describe('Google Runtime Integration', () => {
  let mockFetch: ReturnType<typeof createMockFetch>;

  beforeEach(() => {
    mockFetch = createMockFetch([
      {
        method: 'GET',
        urlPattern: /drive\/v3\/files/,
        response: { status: 200, body: FIXTURE_DRIVE_FILE_LIST, headers: {} },
      },
    ]);
  });

  it('should register all 18 operations', () => {
    const { runtime } = createSetup(mockFetch);
    const ops = runtime.listOperations(GOOGLE_CONNECTOR_ID);
    assert.equal(ops.length, 18);
  });

  it('GOOGLE_OPERATION_NAMES should have 18 entries', () => {
    assert.equal(GOOGLE_OPERATION_NAMES.length, 18);
  });

  it('should throw on duplicate registration', () => {
    const store = new InMemoryCredentialStore();
    const encryption = new DevelopmentCredentialEncryptionProvider('test-key');
    const resolver = new CredentialResolver(store, encryption);
    resolver.storeCredentials('google-workspace', 'org-1', 'oauth2', CREDENTIALS);

    const runtime = new ConnectorRuntime();
    const refreshProvider = new TestTokenRefreshProvider(TOKEN_REFRESH_RESPONSE);

    registerGoogleConnector({
      runtime,
      credentialResolver: resolver,
      refreshProvider,
    });

    // Second registration should throw
    assert.throws(() =>
      registerGoogleConnector({
        runtime,
        credentialResolver: resolver,
        refreshProvider,
      }),
    );
  });

  it('should work with isolated runtimes', async () => {
    const store1 = new InMemoryCredentialStore();
    const encryption1 = new DevelopmentCredentialEncryptionProvider('test-key');
    const resolver1 = new CredentialResolver(store1, encryption1);
    resolver1.storeCredentials('google-workspace', 'org-1', 'oauth2', CREDENTIALS);

    const store2 = new InMemoryCredentialStore();
    const encryption2 = new DevelopmentCredentialEncryptionProvider('test-key');
    const resolver2 = new CredentialResolver(store2, encryption2);
    resolver2.storeCredentials('google-workspace', 'org-2', 'oauth2', CREDENTIALS);

    const runtime1 = new ConnectorRuntime();
    const runtime2 = new ConnectorRuntime();
    const refreshProvider = new TestTokenRefreshProvider(TOKEN_REFRESH_RESPONSE);

    registerGoogleConnector({ runtime: runtime1, credentialResolver: resolver1, refreshProvider });
    registerGoogleConnector({ runtime: runtime2, credentialResolver: resolver2, refreshProvider });

    // Both should have 18 operations independently
    assert.equal(runtime1.listOperations(GOOGLE_CONNECTOR_ID).length, 18);
    assert.equal(runtime2.listOperations(GOOGLE_CONNECTOR_ID).length, 18);
  });

  it('should return error for unknown operation', async () => {
    const { runtime } = createSetup(mockFetch);
    const result = await runtime.execute({
      connectorId: GOOGLE_CONNECTOR_ID,
      operation: 'google.drive.nonexistent',
      input: { organizationId: 'org-1' },
      context: createContext(mockFetch),
    });

    assert.equal(result.success, false);
    assert.ok(result.error);
  });

  it('should return error for unknown connector', async () => {
    const { runtime } = createSetup(mockFetch);
    const result = await runtime.execute({
      connectorId: 'unknown-connector' as never,
      operation: 'some.operation',
      input: {},
      context: createContext(mockFetch),
    });

    assert.equal(result.success, false);
    assert.ok(result.error);
  });

  it('should execute drive.listFiles through the runtime pipeline', async () => {
    const { runtime } = createSetup(mockFetch);
    const result = await runtime.execute({
      connectorId: GOOGLE_CONNECTOR_ID,
      operation: 'google.drive.listFiles',
      input: { organizationId: 'org-1' },
      context: createContext(mockFetch),
    });

    assert.ok(result.success, 'listFiles through runtime should succeed');
    assert.ok(result.data);
    assert.ok(result.executionId, 'should have an executionId');
    assert.ok(result.startedAt, 'should have startedAt');
    assert.ok(result.completedAt, 'should have completedAt');
    assert.ok(typeof result.durationMs === 'number');
    const data = result.data as { items: unknown[] };
    assert.equal(data.items.length, 1);
  });

  it('should use retry, timeout, and circuit breaker from the runtime pipeline', () => {
    const { runtime } = createSetup(mockFetch);
    // The runtime should expose resilience components
    assert.ok(runtime.getRetryPolicy(), 'runtime should have a retry policy');
    assert.ok(runtime.getTimeoutPolicy(), 'runtime should have a timeout policy');
    assert.ok(runtime.getCircuitBreaker(), 'runtime should have a circuit breaker');
    assert.ok(runtime.getRateLimiter(), 'runtime should have a rate limiter');
  });
});
