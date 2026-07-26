import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';
import { IdentityManager } from '../src/identity/IdentityManager.js';

describe('IdentityManager', () => {
  let mgr: IdentityManager;

  beforeEach(() => {
    mgr = new IdentityManager();
  });

  test('creates an identity with all required fields', () => {
    const id = mgr.create('user', 'Alice', 'org-1', { email: 'alice@test.com' });
    assert.ok(id.id);
    assert.equal(id.type, 'user');
    assert.equal(id.name, 'Alice');
    assert.equal(id.organizationId, 'org-1');
    assert.equal(id.status, 'active');
    assert.ok(id.createdAt);
    assert.equal(id.email, 'alice@test.com');
  });

  test('creates all 5 identity types', () => {
    mgr.create('user', 'User', 'org-1');
    mgr.create('organization', 'Org', 'org-1');
    mgr.create('ai_agent', 'Agent', 'org-1');
    mgr.create('connector', 'Connector', 'org-1');
    mgr.create('skill', 'Skill', 'org-1');
    assert.equal(mgr.count(), 5);
  });

  test('get retrieves by id', () => {
    const id = mgr.create('user', 'Alice', 'org-1');
    assert.ok(mgr.get(id.id));
    assert.equal(mgr.get('nonexistent'), undefined);
  });

  test('update modifies identity', () => {
    const id = mgr.create('user', 'Alice', 'org-1');
    const updated = mgr.update(id.id, { name: 'Alice Smith' });
    assert.equal(updated?.name, 'Alice Smith');
  });

  test('delete removes identity', () => {
    const id = mgr.create('user', 'Alice', 'org-1');
    assert.equal(mgr.delete(id.id), true);
    assert.equal(mgr.get(id.id), undefined);
  });

  test('list returns all or filtered by organization', () => {
    mgr.create('user', 'A', 'org-1');
    mgr.create('user', 'B', 'org-2');
    assert.equal(mgr.list().length, 2);
    assert.equal(mgr.list('org-1').length, 1);
  });

  test('listByType filters by type', () => {
    mgr.create('user', 'A', 'org-1');
    mgr.create('ai_agent', 'Bot', 'org-1');
    assert.equal(mgr.listByType('user').length, 1);
    assert.equal(mgr.listByType('ai_agent').length, 1);
  });

  test('setStatus changes identity status', () => {
    const id = mgr.create('user', 'A', 'org-1');
    mgr.setStatus(id.id, 'suspended');
    assert.equal(mgr.get(id.id)?.status, 'suspended');
  });

  test('exists checks if identity exists', () => {
    const id = mgr.create('user', 'A', 'org-1');
    assert.equal(mgr.exists(id.id), true);
    assert.equal(mgr.exists('nonexistent'), false);
  });
});
