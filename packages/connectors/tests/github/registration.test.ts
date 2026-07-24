import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ConnectorRuntime,
  InMemoryCredentialStore,
  DevelopmentCredentialEncryptionProvider,
  CredentialResolver,
  registerGitHubConnector,
  GITHUB_CONNECTOR_ID,
  GITHUB_OPERATION_NAMES,
  ConnectorRuntimeError,
  GitHubConnectorProvider,
  GitHubConnector,
  GitHubApiClient,
  GitHubTokenAuthAdapter,
  GitHubWebhookVerifier,
  GitHubWebhookParser,
  GitHubWebhookEventMapper,
  GitHubPagination,
  GitHubRateLimitMapper,
  GitHubErrorMapper,
  GitHubResponseMapper,
  GitHubRequestBuilder,
  SUPPORTED_WEBHOOK_EVENTS,
} from '../../src/index';

describe('Package exports', () => {
  it('should export all required symbols', () => {
    assert.ok(ConnectorRuntime);
    assert.ok(InMemoryCredentialStore);
    assert.ok(DevelopmentCredentialEncryptionProvider);
    assert.ok(CredentialResolver);
    assert.ok(registerGitHubConnector);
    assert.ok(GITHUB_CONNECTOR_ID);
    assert.ok(GITHUB_OPERATION_NAMES.length === 11);
    assert.ok(ConnectorRuntimeError);
    assert.ok(GitHubConnectorProvider);
    assert.ok(GitHubConnector);
    assert.ok(GitHubApiClient);
    assert.ok(GitHubTokenAuthAdapter);
    assert.ok(GitHubWebhookVerifier);
    assert.ok(GitHubWebhookParser);
    assert.ok(GitHubWebhookEventMapper);
    assert.ok(GitHubPagination);
    assert.ok(GitHubRateLimitMapper);
    assert.ok(GitHubErrorMapper);
    assert.ok(GitHubResponseMapper);
    assert.ok(GitHubRequestBuilder);
    assert.ok(SUPPORTED_WEBHOOK_EVENTS.length > 0);
  });
});

describe('No import side effects', () => {
  it('should not register any operations on import', () => {
    const runtime = new ConnectorRuntime();
    const ops = runtime.listOperations(GITHUB_CONNECTOR_ID);
    assert.equal(ops.length, 0, 'Importing the package should not register operations');
  });
});

describe('registerGitHubConnector', () => {
  it('should register all 11 operations', () => {
    const runtime = new ConnectorRuntime();
    const store = new InMemoryCredentialStore();
    const encryption = new DevelopmentCredentialEncryptionProvider('test-key');
    const resolver = new CredentialResolver(store, encryption);

    registerGitHubConnector({ runtime, credentialResolver: resolver });

    const ops = runtime.listOperations(GITHUB_CONNECTOR_ID);
    assert.equal(ops.length, 11);
  });

  it('should reject duplicate registration', () => {
    const runtime = new ConnectorRuntime();
    const store = new InMemoryCredentialStore();
    const encryption = new DevelopmentCredentialEncryptionProvider('test-key');
    const resolver = new CredentialResolver(store, encryption);

    registerGitHubConnector({ runtime, credentialResolver: resolver });

    assert.throws(
      () => registerGitHubConnector({ runtime, credentialResolver: resolver }),
      /Duplicate operation registration/,
    );
  });

  it('should create isolated runtimes', () => {
    const store = new InMemoryCredentialStore();
    const encryption = new DevelopmentCredentialEncryptionProvider('test-key');
    const resolver = new CredentialResolver(store, encryption);

    const runtime1 = new ConnectorRuntime();
    const runtime2 = new ConnectorRuntime();

    registerGitHubConnector({ runtime: runtime1, credentialResolver: resolver });
    registerGitHubConnector({ runtime: runtime2, credentialResolver: resolver });

    assert.equal(runtime1.listOperations(GITHUB_CONNECTOR_ID).length, 11);
    assert.equal(runtime2.listOperations(GITHUB_CONNECTOR_ID).length, 11);

    runtime1.reset();
    assert.equal(runtime1.listOperations(GITHUB_CONNECTOR_ID).length, 11);
    assert.equal(runtime2.listOperations(GITHUB_CONNECTOR_ID).length, 11);
  });
});

describe('Runtime error handling', () => {
  it('should return error for unknown operation', async () => {
    const runtime = new ConnectorRuntime();
    const store = new InMemoryCredentialStore();
    const encryption = new DevelopmentCredentialEncryptionProvider('test-key');
    const resolver = new CredentialResolver(store, encryption);
    registerGitHubConnector({ runtime, credentialResolver: resolver });

    void resolver.storeCredentials(GITHUB_CONNECTOR_ID, 'org-1', 'oauth2', { accessToken: 'test-token' });

    const result = await runtime.execute({
      connectorId: GITHUB_CONNECTOR_ID,
      operation: 'github.nonExistent',
      input: { organizationId: 'org-1' },
      context: { organizationId: 'org-1', userId: null, requestId: 'r-1', correlationId: 'c-1', traceId: 't-1', metadata: {} },
    });

    assert.equal(result.success, false);
    assert.ok(result.error);
  });

  it('should return error for unknown connector', async () => {
    const runtime = new ConnectorRuntime();

    const result = await runtime.execute({
      connectorId: 'nonexistent' as never,
      operation: 'test',
      input: {},
      context: { organizationId: 'org-1', userId: null, requestId: 'r-1', correlationId: 'c-1', traceId: 't-1', metadata: {} },
    });

    assert.equal(result.success, false);
  });
});
