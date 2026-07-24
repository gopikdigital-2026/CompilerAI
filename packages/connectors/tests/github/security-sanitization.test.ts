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
  sanitizeMetadata,
  GitHubRequestBuilder,
} from '../../src/index';
import {
  createMockFetch,
  createRateLimitHeaders,
  FIXTURE_USER,
} from './fixtures';

const SECRET_TOKEN = 'ghp_SUPER_SECRET_TEST_TOKEN';

function setupRuntime(mockFetch: ReturnType<typeof createMockFetch>) {
  const store = new InMemoryCredentialStore();
  const encryption = new DevelopmentCredentialEncryptionProvider('test-key');
  const resolver = new CredentialResolver(store, encryption);
  void resolver.storeCredentials(GITHUB_CONNECTOR_ID, 'org-1', 'oauth2', { accessToken: SECRET_TOKEN });

  const runtime = new ConnectorRuntime();
  registerGitHubConnector({ runtime, credentialResolver: resolver, transport: mockFetch });
  return { runtime, resolver };
}

function ctx() {
  return createExecutionContext({ organizationId: 'org-1', userId: 'user-1' });
}

describe('Security — token sanitization', () => {
  it('should not expose token in serialized results', async () => {
    const mockFetch = createMockFetch([
      {
        method: 'GET',
        urlPattern: /\/user$/,
        response: { status: 200, body: FIXTURE_USER, headers: createRateLimitHeaders() },
      },
    ]);

    const { runtime } = setupRuntime(mockFetch);
    const result = await runtime.execute({
      connectorId: GITHUB_CONNECTOR_ID,
      operation: 'github.getAuthenticatedUser',
      input: { organizationId: 'org-1' },
      context: ctx(),
    });

    const serialized = JSON.stringify(result);
    assert.ok(!serialized.includes(SECRET_TOKEN),
      `Token found in result: ${serialized}`);
  });

  it('should not expose token in serialized errors', async () => {
    const mockFetch = createMockFetch([
      {
        method: 'GET',
        urlPattern: /\/user$/,
        response: {
          status: 401,
          body: { message: 'Bad credentials' },
          headers: { authorization: `Bearer ${SECRET_TOKEN}` },
        },
      },
    ]);

    const { runtime } = setupRuntime(mockFetch);
    const result = await runtime.execute({
      connectorId: GITHUB_CONNECTOR_ID,
      operation: 'github.getAuthenticatedUser',
      input: { organizationId: 'org-1' },
      context: ctx(),
    });

    assert.equal(result.success, false);
    const serialized = JSON.stringify(result);
    assert.ok(!serialized.includes(SECRET_TOKEN),
      `Token found in error: ${serialized}`);
  });

  it('should not expose token in telemetry events', async () => {
    const mockFetch = createMockFetch([
      {
        method: 'GET',
        urlPattern: /\/user$/,
        response: { status: 200, body: FIXTURE_USER, headers: createRateLimitHeaders() },
      },
    ]);

    const { runtime } = setupRuntime(mockFetch);
    await runtime.execute({
      connectorId: GITHUB_CONNECTOR_ID,
      operation: 'github.getAuthenticatedUser',
      input: { organizationId: 'org-1' },
      context: ctx(),
    });

    const events = runtime.getTelemetry().getEvents();
    const serialized = JSON.stringify(events);
    assert.ok(!serialized.includes(SECRET_TOKEN),
      `Token found in telemetry: ${serialized}`);
  });

  it('should not expose token in audit log', async () => {
    const mockFetch = createMockFetch([
      {
        method: 'GET',
        urlPattern: /\/user$/,
        response: { status: 200, body: FIXTURE_USER, headers: createRateLimitHeaders() },
      },
    ]);

    const { runtime } = setupRuntime(mockFetch);
    await runtime.execute({
      connectorId: GITHUB_CONNECTOR_ID,
      operation: 'github.getAuthenticatedUser',
      input: { organizationId: 'org-1' },
      context: ctx(),
    });

    const events = runtime.getAuditLog().getEvents();
    const serialized = JSON.stringify(events);
    assert.ok(!serialized.includes(SECRET_TOKEN),
      `Token found in audit: ${serialized}`);
  });

  it('should not expose token in traces', async () => {
    const mockFetch = createMockFetch([
      {
        method: 'GET',
        urlPattern: /\/user$/,
        response: { status: 200, body: FIXTURE_USER, headers: createRateLimitHeaders() },
      },
    ]);

    const { runtime } = setupRuntime(mockFetch);
    await runtime.execute({
      connectorId: GITHUB_CONNECTOR_ID,
      operation: 'github.getAuthenticatedUser',
      input: { organizationId: 'org-1' },
      context: ctx(),
    });

    const spans = runtime.getTrace().getSpansByTrace('t-1');
    const serialized = JSON.stringify(spans);
    assert.ok(!serialized.includes(SECRET_TOKEN),
      `Token found in traces: ${serialized}`);
  });
});

describe('Security — sanitizeMetadata', () => {
  it('should redact authorization headers', () => {
    const result = sanitizeMetadata({
      authorization: `Bearer ${SECRET_TOKEN}`,
      'x-custom': 'visible',
    }) as Record<string, unknown>;

    assert.equal(result['authorization'], '[REDACTED]');
    assert.equal(result['x-custom'], 'visible');
  });

  it('should redact nested token fields', () => {
    const result = sanitizeMetadata({
      data: {
        access_token: SECRET_TOKEN,
        refresh_token: 'refresh_secret',
        name: 'visible',
      },
    }) as Record<string, unknown>;

    const data = result['data'] as Record<string, unknown>;
    assert.equal(data['access_token'], '[REDACTED]');
    assert.equal(data['refresh_token'], '[REDACTED]');
    assert.equal(data['name'], 'visible');
  });

  it('should redact x-hub-signature-256', () => {
    const result = sanitizeMetadata({
      'x-hub-signature-256': 'sha256=abc123',
      'content-type': 'application/json',
    }) as Record<string, unknown>;

    assert.equal(result['x-hub-signature-256'], '[REDACTED]');
    assert.equal(result['content-type'], 'application/json');
  });

  it('should redact api_key and secret fields', () => {
    const result = sanitizeMetadata({
      api_key: SECRET_TOKEN,
      secret: 'my_secret',
      private_key: '-----BEGIN PRIVATE KEY-----',
      visible: 'ok',
    }) as Record<string, unknown>;

    assert.equal(result['api_key'], '[REDACTED]');
    assert.equal(result['secret'], '[REDACTED]');
    assert.equal(result['private_key'], '[REDACTED]');
    assert.equal(result['visible'], 'ok');
  });
});

describe('Security — credential isolation', () => {
  it('should not allow cross-organization token access', async () => {
    const mockFetch = createMockFetch([
      {
        method: 'GET',
        urlPattern: /\/user$/,
        response: { status: 200, body: FIXTURE_USER, headers: createRateLimitHeaders() },
      },
    ]);

    const store = new InMemoryCredentialStore();
    const encryption = new DevelopmentCredentialEncryptionProvider('test-key');
    const resolver = new CredentialResolver(store, encryption);
    void resolver.storeCredentials(GITHUB_CONNECTOR_ID, 'org-1', 'oauth2', { accessToken: SECRET_TOKEN });

    const runtime = new ConnectorRuntime();
    registerGitHubConnector({ runtime, credentialResolver: resolver, transport: mockFetch });

    const result = await runtime.execute({
      connectorId: GITHUB_CONNECTOR_ID,
      operation: 'github.getAuthenticatedUser',
      input: { organizationId: 'org-2' },
      context: createExecutionContext({ organizationId: 'org-2', userId: 'user-2' }),
    });

    assert.equal(result.success, false);
    assert.equal(result.error!.errorCode, 'AUTHENTICATION_ERROR');
  });
});

describe('Security — host allowlist', () => {
  it('should reject disallowed hosts', () => {
    assert.throws(
      () => new GitHubRequestBuilder('https://evil.com'),
      /Host not allowed/,
    );
  });

  it('should allow api.github.com', () => {
    const builder = new GitHubRequestBuilder('https://api.github.com');
    builder.addPath('user');
    const result = builder.build();
    assert.ok(result.url.startsWith('https://api.github.com/'));
  });
});
