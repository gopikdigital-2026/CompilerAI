import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  GitHubWebhookReceiver,
  GitHubWebhookHandlerRegistry,
  GitHubWebhookDispatcher,
  GitHubWebhookVerifier,
  InMemoryGitHubWebhookDeliveryStore,
  GitHubWebhookParser,
  createAllWebhookHandlers,
  GitHubWebhookHandlerRegistry as HandlerRegistry,
} from '../../src/index';
import type { CredentialResolver } from '../../src/credentials/CredentialResolver';
import type { ConnectorTelemetry } from '../../src/observability/ConnectorTelemetry';
import { createHmac } from 'node:crypto';
import { WEBHOOK_SECRET, WEBHOOK_PAYLOAD_PUSH, WEBHOOK_PAYLOAD_ISSUES } from './fixtures';

function makeTelemetry(): ConnectorTelemetry {
  return {
    emit: () => {},
    on: () => () => {},
    getEvents: () => [],
    getEventsByType: () => [],
    getEventsByExecution: () => [],
    clear: () => {},
  } as ConnectorTelemetry;
}

function makeCredentialResolver(secret: string): CredentialResolver {
  return {
    resolve: async () => ({
      credentialType: 'oauth2',
      data: { accessToken: 'fake', webhookSecret: secret },
      expiresAt: null,
      scopes: [],
    }),
    storeCredentials: async () => {},
  } as unknown as CredentialResolver;
}

function signPayload(payload: string, secret: string): string {
  const hmac = createHmac('sha256', secret);
  hmac.update(payload);
  return `sha256=${hmac.digest('hex')}`;
}

function makeReceiver(secret: string): GitHubWebhookReceiver {
  const verifier = new GitHubWebhookVerifier(makeCredentialResolver(secret));
  const deliveryStore = new InMemoryGitHubWebhookDeliveryStore();
  const handlerRegistry = new HandlerRegistry();
  const dispatcher = new GitHubWebhookDispatcher(handlerRegistry);
  const telemetry = makeTelemetry();

  return new GitHubWebhookReceiver({
    verifier,
    parser: GitHubWebhookParser,
    dispatcher,
    deliveryStore,
    telemetry,
    handlerRegistry,
  });
}

function makeHeaders(eventName: string, deliveryId: string, payload: string, secret: string): Record<string, string> {
  return {
    'x-github-event': eventName,
    'x-github-delivery': deliveryId,
    'x-hub-signature-256': signPayload(payload, secret),
    'content-type': 'application/json',
  };
}

const SECRET_TOKEN = 'ghp_SUPER_SECRET_TEST_TOKEN';

describe('Webhook Receiver — valid delivery', () => {
  it('should accept and process a valid push event', async () => {
    const receiver = makeReceiver(WEBHOOK_SECRET);
    const headers = makeHeaders('push', 'del-1', WEBHOOK_PAYLOAD_PUSH, WEBHOOK_SECRET);
    const result = await receiver.receive({
      organizationId: 'org-1',
      headers,
      rawPayload: WEBHOOK_PAYLOAD_PUSH,
    });
    assert.equal(result.accepted, true);
    assert.ok(result.envelope);
    assert.equal(result.envelope.eventName, 'push');
    assert.equal(result.envelope.verified, true);
  });

  it('should accept and process a valid issues event', async () => {
    const receiver = makeReceiver(WEBHOOK_SECRET);
    const headers = makeHeaders('issues', 'del-2', WEBHOOK_PAYLOAD_ISSUES, WEBHOOK_SECRET);
    const result = await receiver.receive({
      organizationId: 'org-1',
      headers,
      rawPayload: WEBHOOK_PAYLOAD_ISSUES,
    });
    assert.equal(result.accepted, true);
    assert.ok(result.envelope);
    assert.equal(result.envelope.eventName, 'issues');
  });
});

describe('Webhook Receiver — invalid delivery', () => {
  it('should reject missing event header', async () => {
    const receiver = makeReceiver(WEBHOOK_SECRET);
    const result = await receiver.receive({
      organizationId: 'org-1',
      headers: { 'x-github-delivery': 'del-3' },
      rawPayload: '{}',
    });
    assert.equal(result.accepted, false);
    assert.ok(result.reason?.includes('Missing'));
  });

  it('should reject missing delivery ID', async () => {
    const receiver = makeReceiver(WEBHOOK_SECRET);
    const result = await receiver.receive({
      organizationId: 'org-1',
      headers: { 'x-github-event': 'push' },
      rawPayload: '{}',
    });
    assert.equal(result.accepted, false);
  });

  it('should reject invalid signature', async () => {
    const receiver = makeReceiver(WEBHOOK_SECRET);
    const result = await receiver.receive({
      organizationId: 'org-1',
      headers: {
        'x-github-event': 'push',
        'x-github-delivery': 'del-4',
        'x-hub-signature-256': 'sha256=invalid_signature',
      },
      rawPayload: WEBHOOK_PAYLOAD_PUSH,
    });
    assert.equal(result.accepted, false);
    assert.ok(result.reason?.includes('Signature'));
  });

  it('should reject oversized payload', async () => {
    const receiver = makeReceiver(WEBHOOK_SECRET);
    const result = await receiver.receive({
      organizationId: 'org-1',
      headers: makeHeaders('push', 'del-5', '{}', WEBHOOK_SECRET),
      rawPayload: '{}',
      maxSizeBytes: 1,
    });
    assert.equal(result.accepted, false);
    assert.ok(result.reason?.includes('size'));
  });

  it('should reject malformed JSON', async () => {
    const receiver = makeReceiver(WEBHOOK_SECRET);
    const malformedPayload = 'not-json';
    const headers = makeHeaders('push', 'del-6', malformedPayload, WEBHOOK_SECRET);
    const result = await receiver.receive({
      organizationId: 'org-1',
      headers,
      rawPayload: malformedPayload,
    });
    assert.equal(result.accepted, false);
  });
});

describe('Webhook Receiver — duplicate detection', () => {
  it('should reject duplicate delivery', async () => {
    const receiver = makeReceiver(WEBHOOK_SECRET);
    const headers = makeHeaders('push', 'del-dup', WEBHOOK_PAYLOAD_PUSH, WEBHOOK_SECRET);

    await receiver.receive({
      organizationId: 'org-1',
      headers,
      rawPayload: WEBHOOK_PAYLOAD_PUSH,
    });

    const result = await receiver.receive({
      organizationId: 'org-1',
      headers,
      rawPayload: WEBHOOK_PAYLOAD_PUSH,
    });
    assert.equal(result.accepted, false);
    assert.ok(result.reason?.includes('Duplicate'));
  });
});

describe('Webhook Handler Registry', () => {
  it('should register and dispatch handlers', () => {
    const registry = new GitHubWebhookHandlerRegistry();
    const handler = {
      eventName: 'push',
      handle: async () => ({ handled: true, handlerName: 'push' }),
    };
    registry.register(handler);
    assert.ok(registry.hasHandler('push'));
    assert.equal(registry.getRegisteredEvents().length, 1);
  });

  it('should reject duplicate registration', () => {
    const registry = new GitHubWebhookHandlerRegistry();
    registry.register({ eventName: 'push', handle: async () => ({ handled: true }) });
    assert.throws(
      () => registry.register({ eventName: 'push', handle: async () => ({ handled: true }) }),
      /Duplicate/,
    );
  });

  it('should create all 9 handlers', () => {
    const handlers = createAllWebhookHandlers({});
    assert.equal(handlers.length, 9);
  });
});

describe('Webhook Receiver — secret not leaked', () => {
  it('should not expose secret token in telemetry', async () => {
    const events: unknown[] = [];
    const telemetry = {
      emit: (e: unknown) => { events.push(e); },
      on: () => () => {},
      getEvents: () => [],
      getEventsByType: () => [],
      getEventsByExecution: () => [],
      clear: () => {},
    } as unknown as ConnectorTelemetry;

    const verifier = new GitHubWebhookVerifier(makeCredentialResolver(SECRET_TOKEN));
    const deliveryStore = new InMemoryGitHubWebhookDeliveryStore();
    const handlerRegistry = new GitHubWebhookHandlerRegistry();
    const dispatcher = new GitHubWebhookDispatcher(handlerRegistry);
    const receiver = new GitHubWebhookReceiver({
      verifier, parser: GitHubWebhookParser, dispatcher, deliveryStore, telemetry, handlerRegistry,
    });

    const payload = WEBHOOK_PAYLOAD_PUSH;
    const headers = {
      'x-github-event': 'push',
      'x-github-delivery': 'del-secret-test',
      'x-hub-signature-256': signPayload(payload, SECRET_TOKEN),
    };

    await receiver.receive({ organizationId: 'org-1', headers, rawPayload: payload });
    const serialized = JSON.stringify(events);
    assert.ok(!serialized.includes(SECRET_TOKEN),
      `Secret found in telemetry: ${serialized}`);
  });
});
