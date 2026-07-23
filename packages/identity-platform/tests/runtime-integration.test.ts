import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  IdentityPlatform,
  CrossTenantError,
  PrivilegeEscalationError,
} from '../src/index';
import { createPlatform, createTestOrg } from './helpers';

describe('Agent Runtime integration', () => {
  let platform: IdentityPlatform;

  beforeEach(async () => {
    platform = await createPlatform();
  });

  it('should provide auth context usable by runtime for organization scoping', async () => {
    const { org, user } = await createTestOrg(platform);
    void org;
    const ctx = await platform.authorization.buildContext(user);
    assert.equal(ctx.organizationId, user.organizationId);
    assert.ok(ctx.roleNames.length > 0);
    assert.ok(ctx.permissionIds.length > 0);
  });

  it('should enforce that API key auth is scoped to its organization', async () => {
    const { org, user } = await createTestOrg(platform);
    const { rawKey } = await platform.apiKeys.create({
      name: 'runtime-key', organizationId: org.id, createdByUserId: user.id, scopes: ['read'], expiresAt: null,
    });
    const principal = await platform.authentication.authenticateWithApiKey(rawKey);
    assert.equal(principal.organizationId, org.id);
    assert.equal(principal.authContext.organizationId, org.id);
  });

  it('should allow permission check that runtime can use for agent authorization', async () => {
    const { user } = await createTestOrg(platform);
    const ctx = await platform.authorization.buildContext(user);
    const allowed = await platform.authorization.checkPermission(ctx, 'users:read', user.organizationId);
    assert.ok(allowed);
  });

  it('should deny cross-tenant access from runtime perspective', async () => {
    const { user } = await createTestOrg(platform);
    const { org: org2 } = await createTestOrg(platform);
    const ctx = await platform.authorization.buildContext(user);
    await assert.rejects(
      platform.authorization.checkPermission(ctx, 'users:read', org2.id),
      CrossTenantError,
    );
  });

  it('should prevent privilege escalation when assigning roles', async () => {
    const { user } = await createTestOrg(platform);
    const ctx = await platform.authorization.buildContext(user);
    await platform.authorization.assertCanAssignRole(ctx, 'OrganizationAdmin');
    await assert.rejects(
      platform.authorization.assertCanAssignRole(ctx, 'PlatformAdmin'),
      PrivilegeEscalationError,
    );
  });
});

describe('Privilege escalation protection', () => {
  let platform: IdentityPlatform;

  beforeEach(async () => {
    platform = await createPlatform();
  });

  it('should prevent Viewer from assigning any admin role', async () => {
    const { user } = await createTestOrg(platform);
    const viewerRole = (await platform.roles.findByOrganization(user.organizationId)).find((r) => r.name === 'Viewer')!;
    const updatedUser = await platform.users.update(user.id, { roleIds: [viewerRole.id] });
    const ctx = await platform.authorization.buildContext(updatedUser);
    await assert.rejects(
      platform.authorization.assertCanAssignRole(ctx, 'OrganizationAdmin'),
      PrivilegeEscalationError,
    );
  });

  it('should not allow modifying system roles', async () => {
    const { user } = await createTestOrg(platform);
    const adminRole = (await platform.roles.findByOrganization(user.organizationId)).find((r) => r.name === 'OrganizationAdmin')!;
    await assert.rejects(
      platform.roles.update(adminRole.id, { description: 'modified' }),
      PrivilegeEscalationError,
    );
  });

  it('should not allow deleting system roles', async () => {
    const { user } = await createTestOrg(platform);
    const viewerRole = (await platform.roles.findByOrganization(user.organizationId)).find((r) => r.name === 'Viewer')!;
    await assert.rejects(
      platform.roles.delete(viewerRole.id),
      PrivilegeEscalationError,
    );
  });
});

describe('Organization isolation enforcement', () => {
  let platform: IdentityPlatform;

  beforeEach(async () => {
    platform = await createPlatform();
  });

  it('should allow same-org user creation', async () => {
    const { org, user } = await createTestOrg(platform);
    const sameCtx = await platform.authorization.buildContext(user);
    await platform.authorization.assertSameOrganization(sameCtx, org.id);
  });

  it('should deny cross-org audit access', async () => {
    const { org: org1, user: user1 } = await createTestOrg(platform);
    const { org: org2 } = await createTestOrg(platform);
    void org2;
    const ctx = await platform.authorization.buildContext(user1);
    await assert.rejects(
      platform.authorization.assertSameOrganization(ctx, org2.id),
      CrossTenantError,
    );
    const log = await platform.audit.findByOrganization(org1.id);
    assert.ok(log.items.every((e) => e.organizationId === org1.id));
  });
});
