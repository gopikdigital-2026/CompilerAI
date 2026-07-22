import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { ResolvedConfig } from '../src/config/CompilerAIConfig';

void ResolvedConfig;

describe('Config', () => {
  test('creates with valid inputs', () => {
    const cfg = new ResolvedConfig({
      apiKey: 'test-key',
      organizationId: 'org_123',
      baseUrl: 'http://localhost:3000/',
    });
    assert.equal(cfg.apiKey, 'test-key');
    assert.equal(cfg.organizationId, 'org_123');
    assert.equal(cfg.baseUrl, 'http://localhost:3000');
  });

  test('throws on missing apiKey', () => {
    assert.throws(
      () => new ResolvedConfig({ apiKey: '', organizationId: 'org_123' }),
      /apiKey is required/,
    );
  });

  test('throws on missing organizationId', () => {
    assert.throws(
      () => new ResolvedConfig({ apiKey: 'key', organizationId: '' }),
      /organizationId is required/,
    );
  });

  test('throws on oversized organizationId', () => {
    assert.throws(
      () => new ResolvedConfig({ apiKey: 'key', organizationId: 'x'.repeat(257) }),
      /organizationId must not exceed/,
    );
  });

  test('throws on invalid timeoutMs', () => {
    assert.throws(
      () => new ResolvedConfig({ apiKey: 'key', organizationId: 'org', timeoutMs: 0 }),
      /timeoutMs/,
    );
  });

  test('throws on negative maxRetries', () => {
    assert.throws(
      () => new ResolvedConfig({ apiKey: 'key', organizationId: 'org', maxRetries: -1 }),
      /maxRetries/,
    );
  });

  test('uses default values', () => {
    const cfg = new ResolvedConfig({ apiKey: 'key', organizationId: 'org' });
    assert.equal(cfg.baseUrl, 'http://localhost:3000');
    assert.equal(cfg.timeoutMs, 30_000);
    assert.equal(cfg.maxRetries, 2);
    assert.equal(cfg.retryDelayMs, 500);
  });
});
