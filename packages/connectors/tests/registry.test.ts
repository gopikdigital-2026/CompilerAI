import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  ConnectorRegistry,
  ConnectorAlreadyRegisteredError,
  ConnectorNotFoundError,
  ConnectorValidationError,
  ALL_PROVIDERS,
  createDefaultRegistry,
} from '../src/index';
import type { ConnectorProvider, ConnectorMetadata, ConnectorCapability, ConnectorAuthRequirements } from '../src/index';

describe('ConnectorRegistry', () => {
  let registry: ConnectorRegistry;

  beforeEach(() => {
    registry = new ConnectorRegistry();
  });

  it('should start empty', () => {
    assert.equal(registry.count, 0);
    assert.deepEqual(registry.listProviders(), []);
  });

  it('should register a provider', () => {
    registry.registerProvider(ALL_PROVIDERS[0]!);
    assert.equal(registry.count, 1);
  });

  it('should list registered providers', () => {
    registry.registerProvider(ALL_PROVIDERS[0]!);
    registry.registerProvider(ALL_PROVIDERS[1]!);
    const list = registry.listProviders();
    assert.equal(list.length, 2);
  });

  it('should get a provider by id', () => {
    registry.registerProvider(ALL_PROVIDERS[0]!);
    const provider = registry.getProvider('microsoft365');
    assert.equal(provider.providerId, 'microsoft365');
  });

  it('should check if a provider exists', () => {
    registry.registerProvider(ALL_PROVIDERS[0]!);
    assert.ok(registry.hasProvider('microsoft365'));
    assert.ok(!registry.hasProvider('unknown'));
  });

  it('should throw on duplicate registration', () => {
    registry.registerProvider(ALL_PROVIDERS[0]!);
    assert.throws(
      () => registry.registerProvider(ALL_PROVIDERS[0]!),
      ConnectorAlreadyRegisteredError,
    );
  });

  it('should throw when getting unregistered provider', () => {
    assert.throws(
      () => registry.getProvider('unknown'),
      ConnectorNotFoundError,
    );
  });

  it('should unregister a provider', () => {
    registry.registerProvider(ALL_PROVIDERS[0]!);
    assert.ok(registry.unregisterProvider('microsoft365'));
    assert.equal(registry.count, 0);
  });

  it('should list provider metadata', () => {
    registry.registerProvider(ALL_PROVIDERS[0]!);
    registry.registerProvider(ALL_PROVIDERS[1]!);
    const meta = registry.listProviderMetadata();
    assert.equal(meta.length, 2);
    assert.ok(meta.some((m) => m.id === 'microsoft365'));
    assert.ok(meta.some((m) => m.id === 'google_workspace'));
  });

  it('should create a connector instance', () => {
    registry.registerProvider(ALL_PROVIDERS[0]!);
    const connector = registry.createConnector('microsoft365', 'org-1', null);
    assert.equal(connector.metadata.id, 'microsoft365');
    assert.equal(connector.getStatus(), 'registered');
  });

  it('should get a created connector', () => {
    registry.registerProvider(ALL_PROVIDERS[0]!);
    registry.createConnector('microsoft365', 'org-1', null);
    const connector = registry.getConnector('microsoft365', 'org-1');
    assert.ok(connector);
    assert.equal(connector!.metadata.id, 'microsoft365');
  });

  it('should return null for non-existent connector', () => {
    assert.equal(registry.getConnector('unknown', 'org-1'), null);
  });

  it('should remove a connector', () => {
    registry.registerProvider(ALL_PROVIDERS[0]!);
    registry.createConnector('microsoft365', 'org-1', null);
    assert.ok(registry.removeConnector('microsoft365', 'org-1'));
    assert.equal(registry.getConnector('microsoft365', 'org-1'), null);
  });

  it('should clear all providers and connectors', () => {
    registry.registerProvider(ALL_PROVIDERS[0]!);
    registry.createConnector('microsoft365', 'org-1', null);
    registry.clear();
    assert.equal(registry.count, 0);
    assert.equal(registry.listConnectors().length, 0);
  });

  it('should reject provider with empty id', () => {
    const badProvider = makeFakeProvider({ id: '' });
    assert.throws(
      () => registry.registerProvider(badProvider),
      ConnectorValidationError,
    );
  });

  it('should reject provider with empty displayName', () => {
    const badProvider = makeFakeProvider({ displayName: '' });
    assert.throws(
      () => registry.registerProvider(badProvider),
      ConnectorValidationError,
    );
  });

  it('should reject provider with no capabilities', () => {
    const badProvider = makeFakeProvider({ capabilities: [] });
    assert.throws(
      () => registry.registerProvider(badProvider),
      ConnectorValidationError,
    );
  });
});

describe('createDefaultRegistry', () => {
  it('should register all 8 providers', () => {
    const registry = createDefaultRegistry();
    assert.equal(registry.count, 8);
    const ids = registry.listProviderMetadata().map((m) => m.id);
    assert.ok(ids.includes('microsoft365'));
    assert.ok(ids.includes('google_workspace'));
    assert.ok(ids.includes('slack'));
    assert.ok(ids.includes('github'));
    assert.ok(ids.includes('jira'));
    assert.ok(ids.includes('notion'));
    assert.ok(ids.includes('salesforce'));
    assert.ok(ids.includes('hubspot'));
  });
});

function makeFakeProvider(overrides: Partial<ConnectorMetadata & { capabilities: ConnectorCapability[] }>): ConnectorProvider {
  const metadata: ConnectorMetadata = {
    id: 'fake',
    displayName: 'Fake Connector',
    description: 'A fake connector for testing',
    category: 'custom',
    icon: 'fake',
    vendor: 'TestVendor',
    documentationUrl: 'https://example.com',
    version: '1.0.0',
    tags: ['test'],
    ...overrides,
  };
  const capabilities: ConnectorCapability[] = overrides.capabilities ?? [
    { name: 'test_cap', method: 'read', description: 'test', inputSchema: {}, outputSchema: {}, requiredScopes: [] },
  ];
  const authReqs: ConnectorAuthRequirements = {
    scheme: 'api_key',
    requiredFields: ['apiKey'],
    optionalFields: [],
    scopes: [],
    tokenEndpoint: null,
    authorizationEndpoint: null,
    refreshSupported: false,
  };
  return {
    providerId: metadata.id,
    getMetadata: () => metadata,
    getCapabilities: () => capabilities,
    getAuthRequirements: () => authReqs,
    createConnector: () => ({}) as never,
  };
}
