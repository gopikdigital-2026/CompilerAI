import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  InMemoryCredentialStore,
  DevelopmentCredentialEncryptionProvider,
  CredentialResolver,
  ConnectorRuntime,
  registerGoogleConnector,
  GOOGLE_CONNECTOR_ID,
  ConnectorRuntimeError,
} from '../../src/index';
import { TestTokenRefreshProvider } from '../../src/providers/google/auth/GoogleTokenRefreshProvider';
import { createMockFetch } from './mocks/MockFetch';
import {
  VALID_ACCESS_TOKEN,
  REFRESH_TOKEN,
  CLIENT_ID,
  CLIENT_SECRET,
  TOKEN_REFRESH_RESPONSE,
  FIXTURE_GMAIL_MESSAGE_LIST,
  FIXTURE_GMAIL_MESSAGE,
  FIXTURE_GMAIL_LABEL_LIST,
  FIXTURE_GMAIL_SEND_RESPONSE,
  FIXTURE_GMAIL_DRAFT_RESPONSE,
} from './fixtures';

const CREDENTIALS = {
  accessToken: VALID_ACCESS_TOKEN,
  refreshToken: REFRESH_TOKEN,
  clientId: CLIENT_ID,
  clientSecret: CLIENT_SECRET,
};

function setup(mockFetch: ReturnType<typeof createMockFetch>) {
  const store = new InMemoryCredentialStore();
  const encryption = new DevelopmentCredentialEncryptionProvider('test-key');
  const resolver = new CredentialResolver(store, encryption);
  resolver.storeCredentials('google-workspace', 'org-1', 'oauth2', CREDENTIALS);

  const runtime = new ConnectorRuntime();
  const refreshProvider = new TestTokenRefreshProvider(TOKEN_REFRESH_RESPONSE);

  const { authAdapter } = registerGoogleConnector({
    runtime,
    credentialResolver: resolver,
    refreshProvider,
    transport: mockFetch,
  });

  return { store, encryption, resolver, runtime, authAdapter, mockFetch };
}

function context(mockFetch: ReturnType<typeof createMockFetch>) {
  return {
    organizationId: 'org-1',
    userId: null,
    requestId: 'r-1',
    correlationId: 'c-1',
    traceId: 't-1',
    metadata: { fetchImpl: mockFetch },
  };
}

describe('Google Gmail Operations', () => {
  let mockFetch: ReturnType<typeof createMockFetch>;

  beforeEach(() => {
    mockFetch = createMockFetch([
      // List messages
      {
        method: 'GET',
        urlPattern: /gmail\/v1\/users\/me\/messages(\?|$)/,
        response: { status: 200, body: FIXTURE_GMAIL_MESSAGE_LIST, headers: {} },
      },
      // Get message
      {
        method: 'GET',
        urlPattern: /gmail\/v1\/users\/me\/messages\/msg-1/,
        response: { status: 200, body: FIXTURE_GMAIL_MESSAGE, headers: {} },
      },
      // List labels
      {
        method: 'GET',
        urlPattern: /gmail\/v1\/users\/me\/labels/,
        response: { status: 200, body: FIXTURE_GMAIL_LABEL_LIST, headers: {} },
      },
      // Send message
      {
        method: 'POST',
        urlPattern: /gmail\/v1\/users\/me\/messages\/send/,
        response: { status: 200, body: FIXTURE_GMAIL_SEND_RESPONSE, headers: {} },
      },
      // Create draft
      {
        method: 'POST',
        urlPattern: /gmail\/v1\/users\/me\/drafts/,
        response: { status: 200, body: FIXTURE_GMAIL_DRAFT_RESPONSE, headers: {} },
      },
    ]);
  });

  it('should list messages and return messages array', async () => {
    const { runtime } = setup(mockFetch);
    const result = await runtime.execute({
      connectorId: GOOGLE_CONNECTOR_ID,
      operation: 'google.gmail.listMessages',
      input: { organizationId: 'org-1' },
      context: context(mockFetch),
    });

    assert.ok(result.success, 'listMessages should succeed');
    assert.ok(result.data);
    const data = result.data as { messages: { id: string; threadId: string }[]; nextPageToken: string };
    assert.equal(data.messages.length, 1);
    assert.equal(data.messages[0].id, 'msg-1');
    assert.equal(data.messages[0].threadId, 'thread-1');
    assert.equal(data.nextPageToken, 'page2');
  });

  it('should get a message with mapped from/to/subject', async () => {
    const { runtime } = setup(mockFetch);
    const result = await runtime.execute({
      connectorId: GOOGLE_CONNECTOR_ID,
      operation: 'google.gmail.getMessage',
      input: { organizationId: 'org-1', messageId: 'msg-1', format: 'full' },
      context: context(mockFetch),
    });

    assert.ok(result.success, 'getMessage should succeed');
    assert.ok(result.data);
    const data = result.data as {
      message: {
        id: string;
        threadId: string;
        from: string | null;
        to: string[];
        subject: string | null;
        bodyText: string | null;
      };
    };
    assert.equal(data.message.id, 'msg-1');
    assert.equal(data.message.threadId, 'thread-1');
    assert.equal(data.message.from, 'sender@example.com');
    assert.equal(data.message.to.length, 1);
    assert.equal(data.message.to[0], 'recipient@example.com');
    assert.equal(data.message.subject, 'Test Subject');
    assert.equal(data.message.bodyText, 'Hello World');
  });

  it('should list labels and return labels array', async () => {
    const { runtime } = setup(mockFetch);
    const result = await runtime.execute({
      connectorId: GOOGLE_CONNECTOR_ID,
      operation: 'google.gmail.listLabels',
      input: { organizationId: 'org-1' },
      context: context(mockFetch),
    });

    assert.ok(result.success, 'listLabels should succeed');
    assert.ok(result.data);
    const data = result.data as { labels: { id: string; name: string; type: string }[] };
    assert.equal(data.labels.length, 1);
    assert.equal(data.labels[0].id, 'INBOX');
    assert.equal(data.labels[0].name, 'INBOX');
    assert.equal(data.labels[0].type, 'system');
  });

  it('should send a message and return messageId/threadId', async () => {
    const { runtime } = setup(mockFetch);
    const result = await runtime.execute({
      connectorId: GOOGLE_CONNECTOR_ID,
      operation: 'google.gmail.sendMessage',
      input: {
        organizationId: 'org-1',
        to: ['recipient@example.com'],
        subject: 'Test Email',
        bodyText: 'Hello World',
      },
      context: context(mockFetch),
    });

    assert.ok(result.success, 'sendMessage should succeed');
    assert.ok(result.data);
    const data = result.data as { messageId: string; threadId: string };
    assert.equal(data.messageId, 'msg-sent-1');
    assert.equal(data.threadId, 'thread-sent-1');
  });

  it('should create a draft and return draftId/messageId', async () => {
    const { runtime } = setup(mockFetch);
    const result = await runtime.execute({
      connectorId: GOOGLE_CONNECTOR_ID,
      operation: 'google.gmail.createDraft',
      input: {
        organizationId: 'org-1',
        to: ['recipient@example.com'],
        subject: 'Draft Subject',
        bodyText: 'Draft body',
      },
      context: context(mockFetch),
    });

    assert.ok(result.success, 'createDraft should succeed');
    assert.ok(result.data);
    const data = result.data as { draftId: string; messageId: string };
    assert.equal(data.draftId, 'draft-1');
    assert.equal(data.messageId, 'msg-draft-1');
  });

  it('should reject sendMessage with empty to array', async () => {
    const { runtime } = setup(mockFetch);
    const result = await runtime.execute({
      connectorId: GOOGLE_CONNECTOR_ID,
      operation: 'google.gmail.sendMessage',
      input: { organizationId: 'org-1', to: [], subject: 'Test' },
      context: context(mockFetch),
    });

    assert.equal(result.success, false);
    assert.ok(result.error);
  });

  it('should reject sendMessage with invalid email address', async () => {
    const { runtime } = setup(mockFetch);
    const result = await runtime.execute({
      connectorId: GOOGLE_CONNECTOR_ID,
      operation: 'google.gmail.sendMessage',
      input: { organizationId: 'org-1', to: ['not-an-email'], subject: 'Test' },
      context: context(mockFetch),
    });

    assert.equal(result.success, false);
    assert.ok(result.error);
  });

  it('should reject sendMessage with header injection in subject', async () => {
    const { runtime } = setup(mockFetch);
    const result = await runtime.execute({
      connectorId: GOOGLE_CONNECTOR_ID,
      operation: 'google.gmail.sendMessage',
      input: {
        organizationId: 'org-1',
        to: ['recipient@example.com'],
        subject: 'Test\r\nBcc: attacker@example.com',
        bodyText: 'Hello',
      },
      context: context(mockFetch),
    });

    assert.equal(result.success, false);
    assert.ok(result.error);
  });

  it('should have retryable=false and idempotent=false for sendMessage', () => {
    const { runtime } = setup(mockFetch);
    const ops = runtime.listOperations(GOOGLE_CONNECTOR_ID);
    const sendMessage = ops.find((o) => o.name === 'google.gmail.sendMessage');
    assert.ok(sendMessage, 'sendMessage operation should be registered');
    assert.equal(sendMessage!.retryable, false);
    assert.equal(sendMessage!.idempotent, false);
  });
});
