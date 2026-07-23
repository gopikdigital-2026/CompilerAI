import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  Microsoft365Provider,
  GoogleWorkspaceProvider,
  SlackProvider,
  GitHubProvider,
  JiraProvider,
  NotionProvider,
  SalesforceProvider,
  HubSpotProvider,
} from '../src/index';
import type { ConnectorProvider } from '../src/index';

const PROVIDERS: Array<{ name: string; provider: ConnectorProvider; expectedId: string }> = [
  { name: 'Microsoft365', provider: new Microsoft365Provider(), expectedId: 'microsoft365' },
  { name: 'GoogleWorkspace', provider: new GoogleWorkspaceProvider(), expectedId: 'google_workspace' },
  { name: 'Slack', provider: new SlackProvider(), expectedId: 'slack' },
  { name: 'GitHub', provider: new GitHubProvider(), expectedId: 'github' },
  { name: 'Jira', provider: new JiraProvider(), expectedId: 'jira' },
  { name: 'Notion', provider: new NotionProvider(), expectedId: 'notion' },
  { name: 'Salesforce', provider: new SalesforceProvider(), expectedId: 'salesforce' },
  { name: 'HubSpot', provider: new HubSpotProvider(), expectedId: 'hubspot' },
];

describe('Provider Registration', () => {
  for (const { name, provider, expectedId } of PROVIDERS) {
    describe(`${name}Provider`, () => {
      it('should expose correct providerId', () => {
        assert.equal(provider.providerId, expectedId);
      });

      it('should expose metadata with correct id', () => {
        const meta = provider.getMetadata();
        assert.equal(meta.id, expectedId);
        assert.ok(meta.displayName.length > 0);
        assert.ok(meta.description.length > 0);
        assert.ok(meta.vendor.length > 0);
        assert.ok(meta.documentationUrl.length > 0);
        assert.ok(meta.version.length > 0);
        assert.ok(meta.tags.length > 0);
      });

      it('should expose at least 3 capabilities', () => {
        const caps = provider.getCapabilities();
        assert.ok(caps.length >= 3, `${name} should have at least 3 capabilities, got ${caps.length}`);
      });

      it('should have valid capability definitions', () => {
        const caps = provider.getCapabilities();
        for (const cap of caps) {
          assert.ok(cap.name.length > 0, 'Capability name must not be empty');
          assert.ok(cap.description.length > 0, 'Capability description must not be empty');
          assert.ok(cap.inputSchema !== undefined, 'Capability inputSchema must be defined');
          assert.ok(cap.outputSchema !== undefined, 'Capability outputSchema must be defined');
          assert.ok(Array.isArray(cap.requiredScopes), 'Capability requiredScopes must be an array');
        }
      });

      it('should expose auth requirements', () => {
        const auth = provider.getAuthRequirements();
        assert.ok(auth.scheme.length > 0);
        assert.ok(auth.requiredFields.length > 0);
        assert.ok(Array.isArray(auth.scopes));
      });

      it('should create a connector instance', () => {
        const connector = provider.createConnector({
          organizationId: 'test-org',
          credentials: null,
          options: {},
        });
        assert.equal(connector.metadata.id, expectedId);
        assert.equal(connector.capabilities.length, provider.getCapabilities().length);
        assert.equal(connector.getStatus(), 'registered');
        assert.equal(connector.isInitialized(), false);
      });
    });
  }
});

describe('Provider Interface Validation', () => {
  it('all 8 providers should implement ConnectorProvider', () => {
    for (const { provider } of PROVIDERS) {
      assert.equal(typeof provider.providerId, 'string');
      assert.equal(typeof provider.getMetadata, 'function');
      assert.equal(typeof provider.getCapabilities, 'function');
      assert.equal(typeof provider.getAuthRequirements, 'function');
      assert.equal(typeof provider.createConnector, 'function');
    }
  });

  it('all providers should have unique ids', () => {
    const ids = PROVIDERS.map((p) => p.expectedId);
    const unique = new Set(ids);
    assert.equal(ids.length, unique.size, 'Provider IDs must be unique');
  });

  it('all providers should have unique providerIds', () => {
    const pids = PROVIDERS.map((p) => p.provider.providerId);
    const unique = new Set(pids);
    assert.equal(pids.length, unique.size, 'Provider IDs must be unique');
  });

  it('oauth2 providers should have token and authorization endpoints', () => {
    for (const { provider, name } of PROVIDERS) {
      const auth = provider.getAuthRequirements();
      if (auth.scheme === 'oauth2') {
        assert.ok(auth.tokenEndpoint, `${name} with oauth2 must have tokenEndpoint`);
        assert.ok(auth.authorizationEndpoint, `${name} with oauth2 must have authorizationEndpoint`);
      }
    }
  });

  it('bearer providers should not need OAuth endpoints', () => {
    for (const { provider, name } of PROVIDERS) {
      const auth = provider.getAuthRequirements();
      if (auth.scheme === 'bearer') {
        assert.equal(auth.tokenEndpoint, null, `${name} with bearer should not have tokenEndpoint`);
      }
    }
  });
});
