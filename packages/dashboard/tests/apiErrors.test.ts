import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MockApiAdapter } from '../src/api/MockApiAdapter.ts';
import { FailingApiAdapter } from '../src/api/FailingApiAdapter.ts';
import { sanitizeErrorMessage, sanitizeError, sanitizeObject } from '../src/api/sanitizers.ts';

describe('API Errors — failing adapter', () => {
  it('should throw errors for all methods', async () => {
    const adapter = new FailingApiAdapter();
    await assert.rejects(() => adapter.getDashboardStats());
    await assert.rejects(() => adapter.getExecutions());
    await assert.rejects(() => adapter.getExecutionDetail('exec_1'));
    await assert.rejects(() => adapter.getTraceEvents('exec_1'));
    await assert.rejects(() => adapter.getTelemetrySeries());
    await assert.rejects(() => adapter.getEngineMetrics());
    await assert.rejects(() => adapter.getMemoryEntries());
    await assert.rejects(() => adapter.getToolStats());
    await assert.rejects(() => adapter.getWorkflowDag('wf_1'));
    await assert.rejects(() => adapter.getApprovals());
    await assert.rejects(() => adapter.decideApproval('appr_1', 'approve', 'ok'));
    await assert.rejects(() => adapter.getHealth());
  });
});

describe('Sanitization — error messages', () => {
  it('should redact sk-* API key patterns', () => {
    const input = 'Error using key sk-abc123def456ghi789 failed';
    const result = sanitizeErrorMessage(input);
    assert.ok(!result.includes('sk-abc123def456ghi789'), 'API key should be redacted');
    assert.ok(result.includes('[REDACTED]'), 'should contain [REDACTED]');
  });

  it('should redact Bearer token patterns', () => {
    const input = 'Auth failed with Bearer token_xyz123abc';
    const result = sanitizeErrorMessage(input);
    assert.ok(!result.includes('token_xyz123abc'), 'bearer token should be redacted');
    assert.ok(result.includes('[REDACTED]'), 'should contain [REDACTED]');
  });

  it('should redact long alphanumeric strings (32+ chars)', () => {
    const longSecret = 'a'.repeat(40);
    const input = `Secret leaked: ${longSecret}`;
    const result = sanitizeErrorMessage(input);
    assert.ok(!result.includes(longSecret), 'long secret should be redacted');
  });

  it('should truncate messages longer than 300 characters', () => {
    const longMessage = 'a '.repeat(250);
    const result = sanitizeErrorMessage(longMessage);
    assert.ok(result.length <= 303, `result should be truncated (got ${result.length})`);
    assert.ok(result.endsWith('...'), 'should end with ...');
  });

  it('should sanitize Error objects via sanitizeError', () => {
    const error = new Error('Failed with key sk-abc123def456ghi789');
    const sanitized = sanitizeError(error);
    assert.ok(!sanitized.message.includes('sk-abc123def456ghi789'), 'API key should be redacted');
    assert.ok(sanitized instanceof Error, 'should return an Error');
  });

  it('should sanitize unknown error values via sanitizeError', () => {
    const sanitized = sanitizeError('some string error');
    assert.ok(sanitized instanceof Error);
    assert.equal(sanitized.message, 'some string error');
  });

  it('should handle null/undefined in sanitizeError', () => {
    const sanitized = sanitizeError(null);
    assert.ok(sanitized instanceof Error);
    assert.equal(sanitized.message, 'An unknown error occurred');
  });
});

describe('Sanitization — object redaction', () => {
  it('should redact sensitive keys in objects', () => {
    const obj = { name: 'test', apiKey: 'secret123', token: 'tok_abc' };
    const result = sanitizeObject(obj);
    assert.equal(result.name, 'test');
    assert.equal(result.apiKey, '[REDACTED]');
    assert.equal(result.token, '[REDACTED]');
  });

  it('should redact sensitive keys in nested objects', () => {
    const obj = { config: { api_key: 'secret', name: 'ok' } };
    const result = sanitizeObject(obj);
    assert.equal(result.config.api_key, '[REDACTED]');
    assert.equal(result.config.name, 'ok');
  });

  it('should handle arrays', () => {
    const obj = { items: [{ token: 'secret', value: 'ok' }] };
    const result = sanitizeObject(obj);
    assert.equal(result.items[0]!.token, '[REDACTED]');
    assert.equal(result.items[0]!.value, 'ok');
  });
});

describe('Empty States — mock adapter returns data', () => {
  it('should return empty array when no executions match search', async () => {
    const adapter = new MockApiAdapter();
    const result = await adapter.getExecutions({ search: 'zzz_nonexistent_xyz' });
    assert.equal(result.length, 0, 'should return empty for non-matching search');
  });

  it('should return empty array when no memory matches search', async () => {
    const adapter = new MockApiAdapter();
    const result = await adapter.getMemoryEntries({ search: 'zzz_nonexistent_xyz' });
    assert.equal(result.length, 0, 'should return empty for non-matching search');
  });

  it('should return empty array when no approvals match filter', async () => {
    const adapter = new MockApiAdapter();
    const result = await adapter.getApprovals({ status: 'EXPIRED' });
    const hasExpired = result.some((a) => a.status === 'EXPIRED');
    result.forEach((a) => assert.equal(a.status, 'EXPIRED'));
    assert.ok(result.length === 0 || hasExpired);
  });
});

describe('Organization Isolation', () => {
  it('should scope dashboard stats by organizationId', async () => {
    const adapter = new MockApiAdapter();
    const allExecs = await adapter.getExecutions();
    const orgId = allExecs[0]!.organizationId;
    const stats = await adapter.getDashboardStats(orgId);
    assert.ok(typeof stats.activeExecutions === 'number');
    assert.ok(typeof stats.successRate === 'number');
  });

  it('should isolate executions by organization', async () => {
    const adapter = new MockApiAdapter();
    const allExecs = await adapter.getExecutions();
    const orgId = allExecs[0]!.organizationId;
    const adapterFiltered = await adapter.getExecutions({ organizationId: orgId });
    const adapterOrgs = new Set(adapterFiltered.map((e) => e.organizationId));
    assert.equal(adapterOrgs.size, 1, 'should only contain one org');
    assert.equal(adapterOrgs.values().next().value, orgId);
    assert.ok(adapterFiltered.length > 0, 'should have executions for this org');
  });

  it('should isolate memory entries by organization', async () => {
    const adapter = new MockApiAdapter();
    const allMemory = await adapter.getMemoryEntries();
    const orgId = allMemory[0]!.organizationId;
    const orgMemory = await adapter.getMemoryEntries({ organizationId: orgId });
    orgMemory.forEach((entry) => {
      assert.equal(entry.organizationId, orgId, 'all entries should belong to the filtered org');
    });
  });
});
