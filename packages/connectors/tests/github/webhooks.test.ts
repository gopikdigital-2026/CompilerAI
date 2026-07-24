import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import {
  GitHubWebhookVerifier,
  GitHubWebhookParser,
  GitHubWebhookEventMapper,
  SUPPORTED_WEBHOOK_EVENTS,
} from '../../src/index';
import {
  WEBHOOK_SECRET,
  WEBHOOK_PAYLOAD_PUSH,
  WEBHOOK_PAYLOAD_ISSUES,
} from './fixtures';

function signPayload(payload: string, secret: string): string {
  const hmac = createHmac('sha256', secret);
  hmac.update(payload);
  return `sha256=${hmac.digest('hex')}`;
}

describe('GitHub Webhook Verification', () => {
  const verifier = new GitHubWebhookVerifier(null as never);

  it('should verify a valid signature', () => {
    const signature = signPayload(WEBHOOK_PAYLOAD_PUSH, WEBHOOK_SECRET);
    const result = verifier.verifySync(WEBHOOK_PAYLOAD_PUSH, signature, WEBHOOK_SECRET);
    assert.equal(result.verified, true);
  });

  it('should reject an invalid signature', () => {
    const result = verifier.verifySync(WEBHOOK_PAYLOAD_PUSH, 'sha256=invalid_signature', WEBHOOK_SECRET);
    assert.equal(result.verified, false);
    assert.equal(result.reason, 'Signature mismatch');
  });

  it('should reject with wrong secret', () => {
    const signature = signPayload(WEBHOOK_PAYLOAD_PUSH, WEBHOOK_SECRET);
    const result = verifier.verifySync(WEBHOOK_PAYLOAD_PUSH, signature, 'wrong_secret');
    assert.equal(result.verified, false);
    assert.equal(result.reason, 'Signature mismatch');
  });

  it('should reject modified payload', () => {
    const signature = signPayload(WEBHOOK_PAYLOAD_PUSH, WEBHOOK_SECRET);
    const modified = WEBHOOK_PAYLOAD_PUSH.replace('main', 'develop');
    const result = verifier.verifySync(modified, signature, WEBHOOK_SECRET);
    assert.equal(result.verified, false);
    assert.equal(result.reason, 'Signature mismatch');
  });

  it('should reject when signature header is missing', () => {
    const result = verifier.verifySync(WEBHOOK_PAYLOAD_PUSH, undefined, WEBHOOK_SECRET);
    assert.equal(result.verified, false);
    assert.equal(result.reason, 'Missing x-hub-signature-256 header');
  });

  it('should reject when signature header is empty', () => {
    const result = verifier.verifySync(WEBHOOK_PAYLOAD_PUSH, '', WEBHOOK_SECRET);
    assert.equal(result.verified, false);
  });

  it('should reject invalid signature format (no sha256= prefix)', () => {
    const result = verifier.verifySync(WEBHOOK_PAYLOAD_PUSH, 'just_a_hash_without_prefix', WEBHOOK_SECRET);
    assert.equal(result.verified, false);
    assert.equal(result.reason, 'Invalid signature header format');
  });

  it('should use timing-safe comparison', () => {
    const signature = signPayload(WEBHOOK_PAYLOAD_PUSH, WEBHOOK_SECRET);
    const result = verifier.verifySync(WEBHOOK_PAYLOAD_PUSH, signature, WEBHOOK_SECRET);
    assert.equal(result.verified, true);
  });

  it('should accept Buffer payload', () => {
    const signature = signPayload(WEBHOOK_PAYLOAD_PUSH, WEBHOOK_SECRET);
    const result = verifier.verifySync(Buffer.from(WEBHOOK_PAYLOAD_PUSH), signature, WEBHOOK_SECRET);
    assert.equal(result.verified, true);
  });
});

describe('GitHub Webhook Parsing', () => {
  it('should parse push event', () => {
    const event = GitHubWebhookParser.parse(
      { 'x-github-event': 'push', 'x-github-delivery': 'delivery-1' },
      WEBHOOK_PAYLOAD_PUSH,
    );
    assert.equal(event.eventName, 'push');
    assert.equal(event.deliveryId, 'delivery-1');
    assert.ok(event.repository);
    assert.equal(event.repository!.fullName, 'octocat/Hello-World');
    assert.ok(event.sender);
    assert.equal(event.sender!.login, 'octocat');
  });

  it('should parse issues event with action', () => {
    const event = GitHubWebhookParser.parse(
      { 'x-github-event': 'issues', 'x-github-delivery': 'delivery-2' },
      WEBHOOK_PAYLOAD_ISSUES,
    );
    assert.equal(event.eventName, 'issues');
    assert.equal(event.action, 'opened');
  });

  it('should throw for missing x-github-event header', () => {
    assert.throws(
      () => GitHubWebhookParser.parse({ 'x-github-event': '', 'x-github-delivery': 'd-1' }, '{}'),
      /Missing x-github-event/,
    );
  });

  it('should throw for missing x-github-delivery header', () => {
    assert.throws(
      () => GitHubWebhookParser.parse({ 'x-github-event': 'push', 'x-github-delivery': '' }, '{}'),
      /Missing x-github-delivery/,
    );
  });

  it('should throw for invalid JSON', () => {
    assert.throws(
      () => GitHubWebhookParser.parse(
        { 'x-github-event': 'push', 'x-github-delivery': 'd-1' },
        'invalid json',
      ),
      /Invalid JSON/,
    );
  });

  it('should check if event is supported', () => {
    assert.equal(GitHubWebhookParser.isSupported('push'), true);
    assert.equal(GitHubWebhookParser.isSupported('issues'), true);
    assert.equal(GitHubWebhookParser.isSupported('pull_request'), true);
    assert.equal(GitHubWebhookParser.isSupported('unknown_event'), false);
  });

  it('should include receivedAt timestamp', () => {
    const event = GitHubWebhookParser.parse(
      { 'x-github-event': 'push', 'x-github-delivery': 'd-1' },
      WEBHOOK_PAYLOAD_PUSH,
    );
    assert.ok(event.receivedAt);
  });
});

describe('GitHub Webhook Event Mapper', () => {
  it('should map supported events', () => {
    for (const eventName of SUPPORTED_WEBHOOK_EVENTS) {
      const event = GitHubWebhookEventMapper.mapEvent(eventName, 'delivery-1', {
        action: 'opened',
        repository: { id: 123, full_name: 'octocat/Hello-World' },
        sender: { id: 1, login: 'octocat' },
      });
      assert.equal(event.eventName, eventName);
    }
  });

  it('should throw for unsupported events', () => {
    assert.throws(
      () => GitHubWebhookEventMapper.mapEvent('unknown_event', 'd-1', {}),
      /Unsupported webhook event/,
    );
  });

  it('should handle payload without optional fields', () => {
    const event = GitHubWebhookEventMapper.mapEvent('push', 'd-1', { ref: 'refs/heads/main' });
    assert.equal(event.action, undefined);
    assert.equal(event.repository, undefined);
    assert.equal(event.sender, undefined);
  });
});
