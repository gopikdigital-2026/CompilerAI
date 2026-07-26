import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';
import { AuditLog } from '../src/audit/AuditLog.js';

describe('AuditLog', () => {
  let log: AuditLog;

  beforeEach(() => {
    log = new AuditLog();
  });

  test('writes an audit event with id and timestamp', () => {
    const event = log.write({
      actor: 'user-1', actorType: 'user', resource: 'knowledge_graph',
      action: 'kg_access', result: 'success', organizationId: 'org-1', details: {},
    });
    assert.ok(event.id);
    assert.ok(event.timestamp);
  });

  test('query filters by organization', () => {
    log.write({ actor: 'u1', actorType: 'user', resource: 'kg', action: 'login', result: 'success', organizationId: 'org-1', details: {} });
    log.write({ actor: 'u2', actorType: 'user', resource: 'kg', action: 'login', result: 'success', organizationId: 'org-2', details: {} });
    assert.equal(log.query({ organizationId: 'org-1' }).length, 1);
  });

  test('query filters by action', () => {
    log.write({ actor: 'u1', actorType: 'user', resource: 'kg', action: 'login', result: 'success', organizationId: 'org-1', details: {} });
    log.write({ actor: 'u1', actorType: 'user', resource: 'kg', action: 'logout', result: 'success', organizationId: 'org-1', details: {} });
    assert.equal(log.query({ action: 'login' }).length, 1);
  });

  test('query filters by result', () => {
    log.write({ actor: 'u1', actorType: 'user', resource: 'kg', action: 'login', result: 'success', organizationId: 'org-1', details: {} });
    log.write({ actor: 'u2', actorType: 'user', resource: 'kg', action: 'login', result: 'failure', organizationId: 'org-1', details: {} });
    assert.equal(log.query({ result: 'failure' }).length, 1);
  });

  test('query filters by time range', () => {
    log.write({ actor: 'u1', actorType: 'user', resource: 'kg', action: 'login', result: 'success', organizationId: 'org-1', details: {} });
    const future = '2099-01-01T00:00:00Z';
    assert.equal(log.query({ startTime: future }).length, 0);
  });

  test('query respects limit and offset', () => {
    for (let i = 0; i < 10; i++) {
      log.write({ actor: `u${i}`, actorType: 'user', resource: 'kg', action: 'login', result: 'success', organizationId: 'org-1', details: {} });
    }
    assert.equal(log.query({ limit: 3 }).length, 3);
    assert.equal(log.query({ limit: 3, offset: 3 }).length, 3);
  });

  test('getById retrieves a specific event', () => {
    const event = log.write({ actor: 'u1', actorType: 'user', resource: 'kg', action: 'login', result: 'success', organizationId: 'org-1', details: {} });
    assert.ok(log.getById(event.id));
    assert.equal(log.getById('nonexistent'), undefined);
  });

  test('count returns total or filtered count', () => {
    log.write({ actor: 'u1', actorType: 'user', resource: 'kg', action: 'login', result: 'success', organizationId: 'org-1', details: {} });
    log.write({ actor: 'u2', actorType: 'user', resource: 'kg', action: 'login', result: 'failure', organizationId: 'org-1', details: {} });
    assert.equal(log.count(), 2);
    assert.equal(log.count({ result: 'success' }), 1);
  });

  test('export returns all matching events', () => {
    for (let i = 0; i < 5; i++) {
      log.write({ actor: `u${i}`, actorType: 'user', resource: 'kg', action: 'agent_execute', result: 'success', organizationId: 'org-1', details: {} });
    }
    const exported = log.export({ organizationId: 'org-1' });
    assert.equal(exported.length, 5);
  });

  test('all 12 audit actions are supported', () => {
    const actions = ['login', 'logout', 'skill_install', 'agent_execute', 'kg_access', 'rag_query', 'permission_change', 'policy_change', 'auth_denied', 'secret_access', 'data_export', 'config_change'] as const;
    for (const action of actions) {
      log.write({ actor: 'u', actorType: 'user', resource: 'test', action, result: 'success', organizationId: 'org-1', details: {} });
    }
    assert.equal(log.count(), 12);
  });
});
