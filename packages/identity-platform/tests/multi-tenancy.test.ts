import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { IdentityPlatform, CrossTenantError } from '../src/index';
import { createPlatform, createTestOrg, createSecondOrg } from './helpers';

describe('Multi-tenancy isolation', () => {
  let platform: IdentityPlatform;

  beforeEach(async () => {
    platform = await createPlatform();
  });

  it('should list users only within the same org', async () => {
    const { org: org1, user: user1 } = await createTestOrg(platform);
    const { org: org2, user: user2 } = await createSecondOrg(platform);
    const org1Users = await platform.users.findByOrganization(org1.id);
    const org2Users = await platform.users.findByOrganization(org2.id);
    assert.ok(org1Users.some((u) => u.id === user1.id));
    assert.ok(!org1Users.some((u) => u.id === user2.id));
    assert.ok(org2Users.some((u) => u.id === user2.id));
    assert.ok(!org2Users.some((u) => u.id === user1.id));
  });

  it('should not allow user from org1 to access org2 resources', async () => {
    const { user } = await createTestOrg(platform);
    const { org: org2 } = await createSecondOrg(platform);
    const ctx = await platform.authorization.buildContext(user);
    await assert.rejects(
      platform.authorization.checkPermission(ctx, 'users:read', org2.id),
      CrossTenantError,
    );
  });

  it('should isolate API keys by organization', async () => {
    const { org: org1, user: user1 } = await createTestOrg(platform);
    const { org: org2, user: user2 } = await createSecondOrg(platform);
    await platform.apiKeys.create({
      name: 'key1', organizationId: org1.id, createdByUserId: user1.id, scopes: ['read'], expiresAt: null,
    });
    await platform.apiKeys.create({
      name: 'key2', organizationId: org2.id, createdByUserId: user2.id, scopes: ['read'], expiresAt: null,
    });
    const org1Keys = await platform.apiKeys.findByOrganization(org1.id);
    const org2Keys = await platform.apiKeys.findByOrganization(org2.id);
    assert.equal(org1Keys.length, 1);
    assert.equal(org2Keys.length, 1);
    assert.equal(org1Keys[0]!.organizationId, org1.id);
    assert.equal(org2Keys[0]!.organizationId, org2.id);
  });

  it('should segment audit log by organization', async () => {
    const { org: org1 } = await createTestOrg(platform);
    const { org: org2 } = await createSecondOrg(platform);
    await platform.audit.record({
      organizationId: org1.id, action: 'LOGIN', actorId: 'u1', actorType: 'USER',
      targetType: 'USER', targetId: 'u1',
    });
    await platform.audit.record({
      organizationId: org2.id, action: 'LOGIN', actorId: 'u2', actorType: 'USER',
      targetType: 'USER', targetId: 'u2',
    });
    const org1Log = await platform.audit.findByOrganization(org1.id);
    const org2Log = await platform.audit.findByOrganization(org2.id);
    assert.equal(org1Log.total, 1);
    assert.equal(org2Log.total, 1);
    assert.ok(org1Log.items.every((e) => e.organizationId === org1.id));
    assert.ok(org2Log.items.every((e) => e.organizationId === org2.id));
  });

  it('should isolate roles by organization', async () => {
    const { org: org1 } = await createTestOrg(platform);
    const { org: org2 } = await createSecondOrg(platform);
    const org1Roles = await platform.roles.findByOrganization(org1.id);
    const org2Roles = await platform.roles.findByOrganization(org2.id);
    assert.ok(org1Roles.every((r) => r.organizationId === org1.id));
    assert.ok(org2Roles.every((r) => r.organizationId === org2.id));
  });

  it('should isolate sessions by organization', async () => {
    const { org: org1, user: user1 } = await createTestOrg(platform);
    const { org: org2, user: user2 } = await createSecondOrg(platform);
    await platform.sessions.create({ userId: user1.id, organizationId: org1.id, authMethod: 'PASSWORD' });
    await platform.sessions.create({ userId: user2.id, organizationId: org2.id, authMethod: 'PASSWORD' });
    const org1Sessions = await platform.sessions.findByOrganization(org1.id);
    const org2Sessions = await platform.sessions.findByOrganization(org2.id);
    assert.ok(org1Sessions.every((s) => s.organizationId === org1.id));
    assert.ok(org2Sessions.every((s) => s.organizationId === org2.id));
  });

  it('should not allow user to be found in another org', async () => {
    const { _org: _o1 } = await createTestOrg(platform);
    const { org: org2 } = await createSecondOrg(platform);
    void _o1;
    const found = await platform.users.findByEmail('admin@test.com', org2.id);
    assert.equal(found, null);
  });
});
