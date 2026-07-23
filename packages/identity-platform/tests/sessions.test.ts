import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { IdentityPlatform, SessionNotFoundError, isSessionActive } from '../src/index';
import { createPlatform, createTestOrg } from './helpers';

describe('Sessions', () => {
  let platform: IdentityPlatform;

  beforeEach(async () => {
    platform = await createPlatform();
  });

  it('should create a session', async () => {
    const { org, user } = await createTestOrg(platform);
    const { session, rawToken } = await platform.sessions.create({
      userId: user.id, organizationId: org.id, authMethod: 'PASSWORD',
    });
    assert.ok(session.id);
    assert.ok(rawToken);
    assert.equal(session.status, 'ACTIVE');
    assert.equal(session.userId, user.id);
  });

  it('should find session by token', async () => {
    const { org, user } = await createTestOrg(platform);
    const { session, rawToken } = await platform.sessions.create({
      userId: user.id, organizationId: org.id, authMethod: 'PASSWORD',
    });
    const found = await platform.sessions.findByToken(rawToken);
    assert.equal(found.id, session.id);
  });

  it('should reject invalid session token', async () => {
    await assert.rejects(
      platform.sessions.findByToken('sess_invalid_token'),
      SessionNotFoundError,
    );
  });

  it('should revoke a session', async () => {
    const { org, user } = await createTestOrg(platform);
    const { session } = await platform.sessions.create({
      userId: user.id, organizationId: org.id, authMethod: 'PASSWORD',
    });
    await platform.sessions.revoke(session.id, 'User logged out');
    const revoked = await platform.sessions.findById(session.id);
    assert.equal(revoked.status, 'REVOKED');
    assert.equal(revoked.revokedReason, 'User logged out');
  });

  it('should revoke all sessions for a user', async () => {
    const { org, user } = await createTestOrg(platform);
    await platform.sessions.create({ userId: user.id, organizationId: org.id, authMethod: 'PASSWORD' });
    await platform.sessions.create({ userId: user.id, organizationId: org.id, authMethod: 'PASSWORD' });
    const count = await platform.sessions.revokeAllForUser(user.id, org.id, 'Security reset');
    assert.equal(count, 2);
    const sessions = await platform.sessions.findByUser(user.id, org.id);
    assert.ok(sessions.every((s) => s.status === 'REVOKED'));
  });

  it('should touch session activity', async () => {
    const { org, user } = await createTestOrg(platform);
    const { session } = await platform.sessions.create({
      userId: user.id, organizationId: org.id, authMethod: 'PASSWORD',
    });
    const touched = await platform.sessions.touchActivity(session.id);
    assert.ok(touched.lastActivityAt >= session.lastActivityAt);
  });

  it('isSessionActive should return false for revoked', () => {
    const session = {
      id: 's1', version: 1, createdAt: '', updatedAt: '', metadata: {},
      organizationId: 'o1', userId: 'u1', tokenHash: 'h1',
      status: 'REVOKED' as const, authMethod: 'PASSWORD',
      ipAddress: null, userAgent: null, expiresAt: '2099-01-01',
      lastActivityAt: '', revokedAt: 'now', revokedReason: 'test',
    };
    assert.equal(isSessionActive(session, '2026-01-01'), false);
  });
});
