import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { IdentityPlatform, AuthenticationError } from '../src/index';
import { createPlatform, createTestOrg } from './helpers';

describe('Authentication', () => {
  let platform: IdentityPlatform;

  beforeEach(async () => {
    platform = await createPlatform();
  });

  it('should login with valid credentials', async () => {
    const { org, user } = await createTestOrg(platform);
    const result = await platform.authentication.login({
      email: 'admin@test.com',
      password: 'TestPass123!',
      organizationId: org.id,
    });
    assert.equal(result.user.id, user.id);
    assert.ok(result.rawToken);
    assert.ok(result.session.id);
    assert.equal(result.authContext.userId, user.id);
  });

  it('should reject login with wrong password', async () => {
    const { org } = await createTestOrg(platform);
    await assert.rejects(
      platform.authentication.login({
        email: 'admin@test.com',
        password: 'WrongPassword',
        organizationId: org.id,
      }),
      AuthenticationError,
    );
  });

  it('should reject login for non-existent user', async () => {
    const { org } = await createTestOrg(platform);
    await assert.rejects(
      platform.authentication.login({
        email: 'nobody@test.com',
        password: 'TestPass123!',
        organizationId: org.id,
      }),
      AuthenticationError,
    );
  });

  it('should record audit entry on successful login', async () => {
    const { org, user } = await createTestOrg(platform);
    await platform.authentication.login({
      email: 'admin@test.com',
      password: 'TestPass123!',
      organizationId: org.id,
    });
    const log = await platform.audit.findByAction('LOGIN', org.id);
    assert.ok(log.some((e) => e.actorId === user.id && e.success));
  });

  it('should record audit entry on failed login', async () => {
    const { org } = await createTestOrg(platform);
    try {
      await platform.authentication.login({
        email: 'admin@test.com',
        password: 'Wrong',
        organizationId: org.id,
      });
    } catch { /* expected */ }
    const log = await platform.audit.findByAction('LOGIN', org.id);
    assert.ok(log.some((e) => !e.success));
  });

  it('should authenticate with API key', async () => {
    const { org, user } = await createTestOrg(platform);
    const { rawKey } = await platform.apiKeys.create({
      name: 'test-key',
      organizationId: org.id,
      createdByUserId: user.id,
      scopes: ['read'],
      expiresAt: null,
    });
    const principal = await platform.authentication.authenticateWithApiKey(rawKey);
    assert.equal(principal.type, 'API_KEY');
    assert.equal(principal.organizationId, org.id);
  });

  it('should authenticate with session token', async () => {
    const { org, user } = await createTestOrg(platform);
    const { rawToken } = await platform.authentication.login({
      email: 'admin@test.com',
      password: 'TestPass123!',
      organizationId: org.id,
    });
    const principal = await platform.authentication.authenticateWithSession(rawToken);
    assert.equal(principal.type, 'USER');
    assert.equal(principal.userId, user.id);
  });

  it('should logout and revoke session', async () => {
    const { org } = await createTestOrg(platform);
    const { session } = await platform.authentication.login({
      email: 'admin@test.com',
      password: 'TestPass123!',
      organizationId: org.id,
    });
    await platform.authentication.logout(session.id, org.id);
    const updated = await platform.sessions.findById(session.id);
    assert.equal(updated.status, 'REVOKED');
  });

  it('should increment failed login count', async () => {
    const { org, user } = await createTestOrg(platform);
    try {
      await platform.authentication.login({
        email: 'admin@test.com',
        password: 'Wrong',
        organizationId: org.id,
      });
    } catch { /* expected */ }
    const updated = await platform.users.findById(user.id);
    assert.equal(updated.failedLoginCount, 1);
  });
});
