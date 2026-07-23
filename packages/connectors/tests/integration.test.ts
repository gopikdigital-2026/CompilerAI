import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ConnectorRegistry,
  Microsoft365Provider,
  SlackProvider,
  GitHubProvider,
  makeContext,
  generateRequestId,
  generateCorrelationId,
  generateState,
  maskSecret,
  sanitizeId,
  isExpired,
  safeParseJson,
  ConnectorAlreadyRegisteredError,
  ConnectorNotFoundError,
} from '../src/index';

describe('Connector Lifecycle', () => {
  it('should initialize and execute a connector', async () => {
    const registry = new ConnectorRegistry();
    registry.registerProvider(new Microsoft365Provider());

    const connector = registry.createConnector('microsoft365', 'org-1', null);
    assert.equal(connector.isInitialized(), false);

    const ctx = makeContext('org-1', 'user-1');
    await connector.initialize(
      {
        connectorId: 'microsoft365',
        organizationId: 'org-1',
        authScheme: 'oauth2',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        expiresAt: null,
      },
      ctx,
    );

    assert.equal(connector.isInitialized(), true);
    assert.equal(connector.getStatus(), 'configured');

    const result = await connector.execute('send_email', { to: 'test@example.com', subject: 'Test', body: 'Hello' }, ctx);
    assert.ok(result.success);
    assert.equal(result.error, null);
    assert.equal(result.metadata.connectorId, 'microsoft365');
    assert.equal(result.metadata.capability, 'send_email');
  });

  it('should fail execution when not initialized', async () => {
    const registry = new ConnectorRegistry();
    registry.registerProvider(new SlackProvider());

    const connector = registry.createConnector('slack', 'org-1', null);
    const ctx = makeContext('org-1', 'user-1');
    const result = await connector.execute('send_message', { channel: 'general', text: 'hi' }, ctx);

    assert.equal(result.success, false);
    assert.ok(result.error);
    assert.equal(result.error!.code, 'CONNECTOR_NOT_INITIALIZED');
  });

  it('should fail for unsupported capability', async () => {
    const registry = new ConnectorRegistry();
    registry.registerProvider(new GitHubProvider());

    const connector = registry.createConnector('github', 'org-1', null);
    const ctx = makeContext('org-1', 'user-1');
    await connector.initialize(
      {
        connectorId: 'github',
        organizationId: 'org-1',
        authScheme: 'oauth2',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        expiresAt: null,
      },
      ctx,
    );

    const result = await connector.execute('nonexistent_cap', {}, ctx);
    assert.equal(result.success, false);
    assert.equal(result.error!.code, 'CAPABILITY_NOT_FOUND');
  });

  it('should disconnect a connector', async () => {
    const registry = new ConnectorRegistry();
    registry.registerProvider(new Microsoft365Provider());

    const connector = registry.createConnector('microsoft365', 'org-1', null);
    const ctx = makeContext('org-1', 'user-1');
    await connector.initialize(
      {
        connectorId: 'microsoft365',
        organizationId: 'org-1',
        authScheme: 'oauth2',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        expiresAt: null,
      },
      ctx,
    );

    await connector.disconnect();
    assert.equal(connector.getStatus(), 'disconnected');
    assert.equal(connector.isInitialized(), false);
  });
});

describe('Duplicate Detection', () => {
  it('should prevent registering the same provider twice', () => {
    const registry = new ConnectorRegistry();
    const provider = new Microsoft365Provider();
    registry.registerProvider(provider);

    assert.throws(
      () => registry.registerProvider(provider),
      ConnectorAlreadyRegisteredError,
    );
  });

  it('should prevent registering two providers with the same id', () => {
    const registry = new ConnectorRegistry();
    registry.registerProvider(new Microsoft365Provider());

    assert.throws(
      () => registry.registerProvider(new Microsoft365Provider()),
      ConnectorAlreadyRegisteredError,
    );
  });

  it('should allow re-registration after unregistering', () => {
    const registry = new ConnectorRegistry();
    registry.registerProvider(new SlackProvider());
    registry.unregisterProvider('slack');
    registry.registerProvider(new SlackProvider());
    assert.equal(registry.count, 1);
  });

  it('should isolate connectors by organization', () => {
    const registry = new ConnectorRegistry();
    registry.registerProvider(new GitHubProvider());
    const c1 = registry.createConnector('github', 'org-1', null);
    const c2 = registry.createConnector('github', 'org-2', null);
    assert.notEqual(c1, c2);
    assert.ok(registry.getConnector('github', 'org-1'));
    assert.ok(registry.getConnector('github', 'org-2'));
  });
});

describe('Utils', () => {
  it('generateRequestId should produce unique ids', () => {
    const a = generateRequestId();
    const b = generateRequestId();
    assert.notEqual(a, b);
    assert.ok(a.startsWith('req_'));
  });

  it('generateCorrelationId should produce unique ids', () => {
    const a = generateCorrelationId();
    const b = generateCorrelationId();
    assert.notEqual(a, b);
    assert.ok(a.startsWith('corr_'));
  });

  it('generateState should produce a state string', () => {
    const state = generateState();
    assert.ok(state.startsWith('state_'));
    assert.ok(state.length > 10);
  });

  it('makeContext should build a valid context', () => {
    const ctx = makeContext('org-1', 'user-1', { timeout: 5000, metadata: { key: 'value' } });
    assert.equal(ctx.organizationId, 'org-1');
    assert.equal(ctx.userId, 'user-1');
    assert.ok(ctx.requestId);
    assert.ok(ctx.correlationId);
    assert.equal(ctx.timeout, 5000);
    assert.deepEqual(ctx.metadata, { key: 'value' });
  });

  it('maskSecret should mask middle of string', () => {
    assert.equal(maskSecret('abcd'), '****');
    assert.equal(maskSecret('abcdefghijklmnop'), 'ab************op');
  });

  it('sanitizeId should lowercase and replace invalid chars', () => {
    assert.equal(sanitizeId('Microsoft 365'), 'microsoft-365');
    assert.equal(sanitizeId('Google Workspace!'), 'google-workspace-');
  });

  it('isExpired should return true for past dates', () => {
    assert.ok(isExpired('2020-01-01T00:00:00.000Z'));
    assert.ok(!isExpired('2099-01-01T00:00:00.000Z'));
    assert.ok(!isExpired(null));
  });

  it('safeParseJson should parse valid JSON objects', () => {
    assert.deepEqual(safeParseJson('{"a":1}'), { a: 1 });
    assert.equal(safeParseJson('invalid'), null);
    assert.equal(safeParseJson('[1,2]'), null);
  });
});

describe('Error Handling', () => {
  it('ConnectorNotFoundError should have correct code', () => {
    const err = new ConnectorNotFoundError('test');
    assert.equal(err.code, 'CONNECTOR_NOT_FOUND');
    assert.equal(err.name, 'ConnectorNotFoundError');
  });

  it('ConnectorAlreadyRegisteredError should have correct code', () => {
    const err = new ConnectorAlreadyRegisteredError('test');
    assert.equal(err.code, 'CONNECTOR_ALREADY_REGISTERED');
    assert.equal(err.name, 'ConnectorAlreadyRegisteredError');
  });
});
