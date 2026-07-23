import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { IdentityPlatform, AuthorizationError, CrossTenantError } from '../src/index';
import { createPlatform, createTestOrg, createSecondOrg } from './helpers';

describe('Authorization', () => {
  let platform: IdentityPlatform;

  beforeEach(async () => {
    platform = await createPlatform();
  });

  it('should allow permission when user has it via role', async () => {
    const { org, user } = await createTestOrg(platform);
    void org;
    const ctx = await platform.authorization.buildContext(user);
    const allowed = await platform.authorization.checkPermission(ctx, 'users:read', user.organizationId);
    assert.ok(allowed);
  });

  it('should deny permission when user lacks it', async () => {
    const { user } = await createTestOrg(platform);
    const viewerRole = (await platform.roles.findByOrganization(user.organizationId)).find((r) => r.name === 'Viewer')!;
    const updatedUser = await platform.users.update(user.id, { roleIds: [viewerRole.id] });
    const newCtx = await platform.authorization.buildContext(updatedUser);
    const allowed = await platform.authorization.checkPermission(newCtx, 'users:delete', user.organizationId);
    assert.equal(allowed, false);
  });

  it('should assertPermission throws on denied', async () => {
    const { user } = await createTestOrg(platform);
    const viewerRole = (await platform.roles.findByOrganization(user.organizationId)).find((r) => r.name === 'Viewer')!;
    const updatedUser = await platform.users.update(user.id, { roleIds: [viewerRole.id] });
    const ctx = await platform.authorization.buildContext(updatedUser);
    await assert.rejects(
      platform.authorization.assertPermission(ctx, 'users:delete', updatedUser.organizationId),
      AuthorizationError,
    );
  });

  it('should throw CrossTenantError when accessing other org', async () => {
    const { user } = await createTestOrg(platform);
    const { org: org2 } = await createSecondOrg(platform);
    const ctx = await platform.authorization.buildContext(user);
    await assert.rejects(
      platform.authorization.checkPermission(ctx, 'users:read', org2.id),
      CrossTenantError,
    );
  });

  it('should assertSameOrganization for same org', async () => {
    const { org, user } = await createTestOrg(platform);
    void user;
    const sameCtx = await platform.authorization.buildContext(user);
    await platform.authorization.assertSameOrganization(sameCtx, org.id);
  });

  it('should assertSameOrganization throws for different org', async () => {
    const { user } = await createTestOrg(platform);
    const { org: org2 } = await createSecondOrg(platform);
    const ctx = await platform.authorization.buildContext(user);
    await assert.rejects(
      platform.authorization.assertSameOrganization(ctx, org2.id),
      CrossTenantError,
    );
  });
});
