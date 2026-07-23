import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { IdentityPlatform, sanitizeAuditDetail } from '../src/index';
import { createPlatform, createTestOrg } from './helpers';

describe('Audit', () => {
  let platform: IdentityPlatform;

  beforeEach(async () => {
    platform = await createPlatform();
  });

  it('should record audit entry', async () => {
    const { org, user } = await createTestOrg(platform);
    void user;
    const entry = await platform.audit.record({
      organizationId: org.id,
      action: 'USER_CREATED',
      actorId: user.id,
      actorType: 'USER',
      targetType: 'USER',
      targetId: 'new-user-id',
      detail: { email: 'new@test.com' },
    });
    assert.equal(entry.action, 'USER_CREATED');
    assert.equal(entry.organizationId, org.id);
  });

  it('should find audit entries by organization', async () => {
    const { org } = await createTestOrg(platform);
    await platform.audit.record({
      organizationId: org.id, action: 'LOGIN', actorId: 'a', actorType: 'USER',
      targetType: 'SESSION', targetId: 's1',
    });
    await platform.audit.record({
      organizationId: org.id, action: 'LOGOUT', actorId: 'a', actorType: 'USER',
      targetType: 'SESSION', targetId: 's1',
    });
    const log = await platform.audit.findByOrganization(org.id);
    assert.ok(log.total >= 2);
  });

  it('should find audit entries by actor', async () => {
    const { org, user } = await createTestOrg(platform);
    await platform.audit.record({
      organizationId: org.id, action: 'LOGIN', actorId: user.id, actorType: 'USER',
      targetType: 'SESSION', targetId: 's1',
    });
    const entries = await platform.audit.findByActor(user.id, org.id);
    assert.ok(entries.length > 0);
    assert.ok(entries.every((e) => e.actorId === user.id));
  });

  it('should find audit entries by action', async () => {
    const { org } = await createTestOrg(platform);
    await platform.audit.record({
      organizationId: org.id, action: 'API_KEY_CREATED', actorId: 'a', actorType: 'USER',
      targetType: 'API_KEY', targetId: 'k1',
    });
    const entries = await platform.audit.findByAction('API_KEY_CREATED', org.id);
    assert.ok(entries.length > 0);
    assert.ok(entries.every((e) => e.action === 'API_KEY_CREATED'));
  });

  it('should sanitize sensitive fields in audit detail', () => {
    const sanitized = sanitizeAuditDetail({
      password: 'secret123',
      apiKey: 'ck_live_abc',
      email: 'user@test.com',
      nested: { tokenHash: 'hash', data: 'ok' },
    });
    assert.equal(sanitized.password, '[REDACTED]');
    assert.equal(sanitized.apiKey, '[REDACTED]');
    assert.equal(sanitized.email, 'user@test.com');
    assert.equal((sanitized.nested as Record<string, unknown>).tokenHash, '[REDACTED]');
    assert.equal((sanitized.nested as Record<string, unknown>).data, 'ok');
  });

  it('should record login and logout via authentication service', async () => {
    const { org } = await createTestOrg(platform);
    const { session } = await platform.authentication.login({
      email: 'admin@test.com', password: 'TestPass123!', organizationId: org.id,
    });
    await platform.authentication.logout(session.id, org.id);
    const loginLog = await platform.audit.findByAction('LOGIN', org.id);
    const logoutLog = await platform.audit.findByAction('LOGOUT', org.id);
    assert.ok(loginLog.some((e) => e.success));
    assert.ok(logoutLog.some((e) => e.success));
  });
});
