import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';
import { StructuredLogger, SENSITIVE_FIELDS } from '../src/index.js';

describe('StructuredLogger', () => {
  let logger: StructuredLogger;

  beforeEach(() => {
    logger = new StructuredLogger();
  });

  test('writes a log entry with id and timestamp', () => {
    const entry = logger.log({
      level: 'info', component: 'multi_agent', message: 'Agent started',
      context: {},
    });
    assert.ok(entry.id);
    assert.ok(entry.timestamp);
  });

  test('query filters by level', () => {
    logger.log({ level: 'info', component: 'c', message: 'info', context: {} });
    logger.log({ level: 'error', component: 'c', message: 'error', context: {} });
    assert.equal(logger.query({ level: 'error' }).length, 1);
    assert.equal(logger.query({ level: 'info' }).length, 1);
  });

  test('query filters by component', () => {
    logger.log({ level: 'info', component: 'multi_agent', message: 'a', context: {} });
    logger.log({ level: 'info', component: 'enterprise_rag', message: 'b', context: {} });
    assert.equal(logger.query({ component: 'multi_agent' }).length, 1);
  });

  test('query filters by organizationId', () => {
    logger.log({ level: 'info', component: 'c', message: 'a', organizationId: 'org-1', context: {} });
    logger.log({ level: 'info', component: 'c', message: 'b', organizationId: 'org-2', context: {} });
    assert.equal(logger.query({ organizationId: 'org-1' }).length, 1);
  });

  test('query filters by correlationId and traceId', () => {
    logger.log({ level: 'info', component: 'c', message: 'a', correlationId: 'corr-1', traceId: 'trace-1', context: {} });
    assert.equal(logger.query({ correlationId: 'corr-1' }).length, 1);
    assert.equal(logger.query({ traceId: 'trace-1' }).length, 1);
  });

  test('sensitive fields are redacted', () => {
    const entry = logger.log({
      level: 'info', component: 'security_governance', message: 'auth',
      context: { password: 'my-secret', apiKey: 'key-123', normal: 'visible' },
    });
    assert.equal(entry.context.password, '[REDACTED]');
    assert.equal(entry.context.apiKey, '[REDACTED]');
    assert.equal(entry.context.normal, 'visible');
  });

  test('sensitive fields in nested objects are redacted', () => {
    const entry = logger.log({
      level: 'info', component: 'c', message: 'test',
      context: { config: { token: 'secret-value', name: 'visible' } },
    });
    const ctx = entry.context.config as Record<string, unknown>;
    assert.equal(ctx.token, '[REDACTED]');
    assert.equal(ctx.name, 'visible');
  });

  test('all sensitive field names are covered', () => {
    assert.ok(SENSITIVE_FIELDS.length >= 10);
    assert.ok(SENSITIVE_FIELDS.includes('password'));
    assert.ok(SENSITIVE_FIELDS.includes('secret'));
    assert.ok(SENSITIVE_FIELDS.includes('token'));
  });

  test('all 5 log levels are supported', () => {
    for (const level of ['debug', 'info', 'warn', 'error', 'fatal'] as const) {
      logger.log({ level, component: 'c', message: 'test', context: {} });
    }
    assert.equal(logger.count(), 5);
  });

  test('getById retrieves a specific entry', () => {
    const entry = logger.log({ level: 'info', component: 'c', message: 'test', context: {} });
    assert.ok(logger.getById(entry.id));
    assert.equal(logger.getById('nonexistent'), undefined);
  });

  test('clear removes all entries', () => {
    logger.log({ level: 'info', component: 'c', message: 'test', context: {} });
    logger.clear();
    assert.equal(logger.count(), 0);
  });

  test('userId and agentId are tracked', () => {
    const entry = logger.log({
      level: 'info', component: 'multi_agent', message: 'agent action',
      userId: 'user-1', agentId: 'agent-1', context: {},
    });
    assert.equal(entry.userId, 'user-1');
    assert.equal(entry.agentId, 'agent-1');
  });
});
