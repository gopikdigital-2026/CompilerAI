import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  GOOGLE_CONNECTOR_ID,
  GOOGLE_OPERATION_NAMES,
  GoogleWorkspaceConnectorProvider,
  GoogleWorkspaceConnector,
  GoogleApiClient,
  GoogleOAuth2Adapter,
  GoogleRequestBuilder,
  GoogleErrorMapper,
  GoogleRateLimitMapper,
  GoogleGmailMapper,
  GoogleDriveMapper,
  GoogleCalendarMapper,
  isGoogleRateLimitReason,
  registerGoogleConnector,
  createGoogleWorkspaceOperations,
} from '../../src/index';
import {
  InMemoryCredentialStore,
  DevelopmentCredentialEncryptionProvider,
  CredentialResolver,
  ConnectorRuntime,
} from '../../src/index';
import { TestTokenRefreshProvider } from '../../src/providers/google/auth/GoogleTokenRefreshProvider';
import { createMockFetch } from './mocks/MockFetch';
import { TOKEN_REFRESH_RESPONSE } from './fixtures';

describe('Google Package Exports', () => {
  it('should export GOOGLE_CONNECTOR_ID === "google-workspace"', () => {
    assert.equal(GOOGLE_CONNECTOR_ID, 'google-workspace');
  });

  it('should export GOOGLE_OPERATION_NAMES with 18 entries', () => {
    assert.equal(GOOGLE_OPERATION_NAMES.length, 18);
  });

  it('should export all expected operation names', () => {
    const expected = [
      'google.drive.listFiles',
      'google.drive.getFile',
      'google.drive.searchFiles',
      'google.drive.createFolder',
      'google.drive.uploadFile',
      'google.drive.updateFileMetadata',
      'google.gmail.listMessages',
      'google.gmail.getMessage',
      'google.gmail.listLabels',
      'google.gmail.sendMessage',
      'google.gmail.createDraft',
      'google.calendar.listCalendars',
      'google.calendar.getCalendar',
      'google.calendar.listEvents',
      'google.calendar.getEvent',
      'google.calendar.createEvent',
      'google.calendar.updateEvent',
      'google.calendar.queryFreeBusy',
    ];
    for (const name of expected) {
      assert.ok(GOOGLE_OPERATION_NAMES.includes(name), `should include ${name}`);
    }
  });

  it('should create a connector via GoogleWorkspaceConnectorProvider', () => {
    const provider = new GoogleWorkspaceConnectorProvider();
    assert.equal(provider.providerId, 'google-workspace');

    const connector = provider.createConnector({} as never);
    assert.ok(connector instanceof GoogleWorkspaceConnector);
  });

  it('should have correct connector metadata', () => {
    const provider = new GoogleWorkspaceConnectorProvider();
    const metadata = provider.getMetadata();
    assert.equal(metadata.id, 'google-workspace');
    assert.equal(metadata.displayName, 'Google Workspace');
    assert.equal(metadata.vendor, 'Google LLC');
    assert.equal(metadata.category, 'productivity');
    assert.equal(metadata.version, '1.0.0');
  });

  it('should have correct auth requirements', () => {
    const provider = new GoogleWorkspaceConnectorProvider();
    const authReqs = provider.getAuthRequirements();
    assert.equal(authReqs.scheme, 'oauth2');
    assert.ok(authReqs.requiredFields.includes('clientId'));
    assert.ok(authReqs.requiredFields.includes('clientSecret'));
    assert.ok(authReqs.requiredFields.includes('refreshToken'));
    assert.ok(authReqs.requiredFields.includes('accessToken'));
    assert.equal(authReqs.refreshSupported, true);
  });

  it('should export all core classes from src/index', () => {
    assert.ok(typeof GoogleApiClient === 'function');
    assert.ok(typeof GoogleOAuth2Adapter === 'function');
    assert.ok(typeof GoogleRequestBuilder === 'function');
    assert.ok(typeof GoogleErrorMapper === 'object' || typeof GoogleErrorMapper === 'function');
    assert.ok(typeof GoogleRateLimitMapper === 'object' || typeof GoogleRateLimitMapper === 'function');
    assert.ok(typeof GoogleGmailMapper === 'object' || typeof GoogleGmailMapper === 'function');
    assert.ok(typeof GoogleDriveMapper === 'object' || typeof GoogleDriveMapper === 'function');
    assert.ok(typeof GoogleCalendarMapper === 'object' || typeof GoogleCalendarMapper === 'function');
    assert.equal(typeof isGoogleRateLimitReason, 'function');
    assert.equal(typeof registerGoogleConnector, 'function');
    assert.equal(typeof createGoogleWorkspaceOperations, 'function');
  });

  it('should register all operations through registerGoogleConnector', () => {
    const store = new InMemoryCredentialStore();
    const encryption = new DevelopmentCredentialEncryptionProvider('test-key');
    const resolver = new CredentialResolver(store, encryption);

    const runtime = new ConnectorRuntime();
    const refreshProvider = new TestTokenRefreshProvider(TOKEN_REFRESH_RESPONSE);
    const mockFetch = createMockFetch([]);

    registerGoogleConnector({
      runtime,
      credentialResolver: resolver,
      refreshProvider,
      transport: mockFetch,
    });

    const ops = runtime.listOperations(GOOGLE_CONNECTOR_ID);
    assert.equal(ops.length, 18);
  });

  it('should create operations via createGoogleWorkspaceOperations', () => {
    const client = new GoogleApiClient({});
    const store = new InMemoryCredentialStore();
    const encryption = new DevelopmentCredentialEncryptionProvider('test-key');
    const resolver = new CredentialResolver(store, encryption);
    const refreshProvider = new TestTokenRefreshProvider(TOKEN_REFRESH_RESPONSE);
    const authAdapter = new GoogleOAuth2Adapter(resolver, refreshProvider);

    const ops = createGoogleWorkspaceOperations(client, authAdapter);
    assert.equal(ops.length, 18);
    assert.equal(ops[0].name, 'google.drive.listFiles');
    assert.equal(ops[17].name, 'google.calendar.queryFreeBusy');
  });
});
