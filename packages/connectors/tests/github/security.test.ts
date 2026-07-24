import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  GitHubRequestBuilder,
  GitHubApiClient,
  sanitizeMetadata,
  ALLOWED_HOSTS,
} from '../../src/index';
import { createMockFetch } from './fixtures';

const VALID_TOKEN = 'ghp_test_token_not_real';

describe('GitHub Security', () => {
  describe('Token Sanitization', () => {
    it('should redact Authorization header in metadata', () => {
      const sanitized = sanitizeMetadata({
        Authorization: 'Bearer ghp_secret_token',
        'X-Custom': 'visible',
      });
      assert.equal(sanitized['Authorization'], '[REDACTED]');
      assert.equal(sanitized['X-Custom'], 'visible');
    });

    it('should redact token in nested objects', () => {
      const sanitized = sanitizeMetadata({
        config: {
          token: 'ghp_abc123',
          apiKey: 'key-xyz',
          data: 'visible',
        },
      });
      const config = sanitized['config'] as Record<string, unknown>;
      assert.equal(config['token'], '[REDACTED]');
      assert.equal(config['apiKey'], '[REDACTED]');
      assert.equal(config['data'], 'visible');
    });

    it('should redact case-insensitive sensitive keys', () => {
      const sanitized = sanitizeMetadata({
        TOKEN: 'secret',
        ApiKey: 'secret',
        bearer: 'secret',
      });
      assert.equal(sanitized['TOKEN'], '[REDACTED]');
      assert.equal(sanitized['ApiKey'], '[REDACTED]');
      assert.equal(sanitized['bearer'], '[REDACTED]');
    });
  });

  describe('Host Allowlist', () => {
    it('should allow api.github.com', () => {
      assert.ok(ALLOWED_HOSTS.has('api.github.com'));
    });

    it('should allow github.com', () => {
      assert.ok(ALLOWED_HOSTS.has('github.com'));
    });

    it('should reject non-allowed hosts in request builder', () => {
      assert.throws(
        () => new GitHubRequestBuilder('https://evil.com'),
        /Host not allowed/,
      );
    });

    it('should reject non-allowed resolved hosts', () => {
      assert.throws(
        () => new GitHubRequestBuilder('https://api.github.com.evil.com'),
        /Host not allowed/,
      );
    });
  });

  describe('Path Encoding', () => {
    it('should encode path segments', () => {
      const builder = GitHubRequestBuilder.get('user/repos');
      const { url } = builder.build();
      assert.ok(url.includes('user/repos'));
    });

    it('should encode special characters in path', () => {
      const builder = GitHubRequestBuilder.get('repos/owner-name/repo name');
      const { url } = builder.build();
      assert.ok(url.includes('owner-name'));
      assert.ok(url.includes('repo%20name'));
    });

    it('should prevent path traversal', () => {
      assert.throws(
        () => GitHubRequestBuilder.get('../../../etc/passwd'),
        /Path traversal detected/,
      );
    });

    it('should prevent encoded path traversal', () => {
      assert.throws(
        () => GitHubRequestBuilder.get('%2e%2e%2f%2e%2e%2fetc%2fpasswd'),
        /Path traversal detected/,
      );
    });

    it('should limit path segments', () => {
      const longPath = Array(25).fill('seg').join('/');
      assert.throws(
        () => GitHubRequestBuilder.get(longPath),
        /too many segments/,
      );
    });
  });

  describe('Query Parameter Encoding', () => {
    it('should encode query parameters', () => {
      const builder = GitHubRequestBuilder.get('user/repos').addParam('q', 'test value');
      const { url } = builder.build();
      assert.ok(url.includes('q=test%20value'));
    });

    it('should skip undefined and null params', () => {
      const builder = GitHubRequestBuilder.get('user/repos')
        .addParam('a', undefined)
        .addParam('b', null)
        .addParam('c', 'visible');
      const { url } = builder.build();
      assert.ok(!url.includes('a='));
      assert.ok(!url.includes('b='));
      assert.ok(url.includes('c=visible'));
    });

    it('should limit query parameters count', () => {
      const builder = GitHubRequestBuilder.get('user/repos');
      for (let i = 0; i < 51; i++) {
        builder.addParam(`param${i}`, 'val');
      }
      assert.throws(
        () => builder.build(),
        /Too many query parameters/,
      );
    });
  });

  describe('Payload Size Limits', () => {
    it('should reject oversized request body', async () => {
      const client = new GitHubApiClient({ maxPayloadBytes: 100 });
      const largeBody = { data: 'x'.repeat(200) };
      await assert.rejects(
        client.post('repos/octocat/Hello-World/issues', largeBody, {
          token: VALID_TOKEN,
          fetchImpl: createMockFetch([]),
        }),
        /exceeds maximum size/,
      );
    });
  });

  describe('Multi-Tenant Credential Isolation', () => {
    it('should isolate credentials by organization', async () => {
      const { InMemoryCredentialStore, DevelopmentCredentialEncryptionProvider, CredentialResolver, GitHubTokenAuthAdapter } =
        await import('../../src/index');

      const store = new InMemoryCredentialStore();
      const encryption = new DevelopmentCredentialEncryptionProvider('key');
      const resolver = new CredentialResolver(store, encryption);

      await resolver.storeCredentials('github', 'org-1', 'oauth2', { accessToken: 'token-1' });
      await resolver.storeCredentials('github', 'org-2', 'oauth2', { accessToken: 'token-2' });

      const adapter = new GitHubTokenAuthAdapter(resolver);
      const t1 = await adapter.getToken('org-1');
      const t2 = await adapter.getToken('org-2');

      assert.equal(t1, 'token-1');
      assert.equal(t2, 'token-2');
      assert.notEqual(t1, t2);
    });
  });

  describe('No Token in Errors', () => {
    it('should not include token in API client error messages', async () => {
      const client = new GitHubApiClient({}, createMockFetch([
        {
          method: 'GET',
          urlPattern: /\/user$/,
          response: { status: 401, body: { message: 'Bad credentials' }, headers: {} },
        },
      ]));

      try {
        await client.get('user', {}, { token: VALID_TOKEN, fetchImpl: createMockFetch([]) });
        assert.fail('Should have thrown');
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        assert.ok(!message.includes(VALID_TOKEN), 'Token should not appear in error');
      }
    });
  });
});
