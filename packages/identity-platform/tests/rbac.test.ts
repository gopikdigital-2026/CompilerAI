import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { IdentityPlatform, SYSTEM_ROLES, PermissionSet, isSystemRole } from '../src/index';
import { createPlatform, createTestOrg } from './helpers';

describe('RBAC', () => {
  let platform: IdentityPlatform;

  beforeEach(async () => {
    platform = await createPlatform();
  });

  it('should seed system roles for organization', async () => {
    const { roles } = await createTestOrg(platform);
    assert.ok(roles.length >= 6);
    const names = roles.map((r) => r.name);
    for (const expected of Object.keys(SYSTEM_ROLES)) {
      assert.ok(names.includes(expected), `Missing system role: ${expected}`);
    }
  });

  it('OrganizationAdmin should have user management permissions', async () => {
    const { user } = await createTestOrg(platform);
    const ctx = await platform.authorization.buildContext(user);
    assert.ok(ctx.permissionIds.includes('users:read'));
    assert.ok(ctx.permissionIds.includes('users:write'));
    assert.ok(ctx.permissionIds.includes('apikeys:read'));
  });

  it('Viewer should only have read permissions', async () => {
    const { user } = await createTestOrg(platform);
    const viewerRole = (await platform.roles.findByOrganization(user.organizationId)).find((r) => r.name === 'Viewer')!;
    const updatedUser = await platform.users.update(user.id, { roleIds: [viewerRole.id] });
    const ctx = await platform.authorization.buildContext(updatedUser);
    assert.ok(ctx.permissionIds.includes('users:read'));
    assert.ok(!ctx.permissionIds.includes('users:write'));
    assert.ok(!ctx.permissionIds.includes('users:delete'));
  });

  it('PlatformAdmin should have wildcard permission', async () => {
    const { user } = await createTestOrg(platform);
    const adminRole = (await platform.roles.findByOrganization(user.organizationId)).find((r) => r.name === 'PlatformAdmin')!;
    const updatedUser = await platform.users.update(user.id, { roleIds: [adminRole.id] });
    const ctx = await platform.authorization.buildContext(updatedUser);
    assert.ok(ctx.permissionIds.includes('*'));
  });

  it('should support role inheritance via parentRoleId', async () => {
    const { user } = await createTestOrg(platform);
    const developerRole = (await platform.roles.findByOrganization(user.organizationId)).find((r) => r.name === 'Developer')!;
    const customRole = await platform.roles.create({
      name: 'SeniorDeveloper',
      description: 'Developer with extra perms',
      organizationId: user.organizationId,
      permissionIds: ['policies:read'],
      parentRoleId: developerRole.id,
    });
    const updatedUser = await platform.users.update(user.id, { roleIds: [customRole.id] });
    const ctx = await platform.authorization.buildContext(updatedUser);
    assert.ok(ctx.permissionIds.includes('users:read'), 'Should inherit parent permissions');
    assert.ok(ctx.permissionIds.includes('policies:read'), 'Should have own permissions');
  });

  it('PermissionSet should work as expected', () => {
    const set = new PermissionSet(['users:read', 'users:write']);
    assert.ok(set.has('users:read'));
    assert.ok(!set.has('users:delete'));
    assert.ok(set.hasAny(['users:delete', 'users:read']));
    assert.ok(set.hasAll(['users:read', 'users:write']));
    assert.ok(!set.hasAll(['users:read', 'users:delete']));
  });

  it('PermissionSet wildcard should match everything', () => {
    const set = new PermissionSet(['*']);
    assert.ok(set.has('users:read'));
    assert.ok(set.has('anything:whatever'));
  });

  it('isSystemRole should identify system roles', () => {
    assert.ok(isSystemRole('PlatformAdmin'));
    assert.ok(isSystemRole('Viewer'));
    assert.ok(!isSystemRole('CustomRole'));
  });

  it('should create custom role', async () => {
    const { user } = await createTestOrg(platform);
    const role = await platform.roles.create({
      name: 'CustomRole',
      description: 'A custom role',
      organizationId: user.organizationId,
      permissionIds: ['users:read', 'audit:read'],
    });
    assert.equal(role.name, 'CustomRole');
    assert.equal(role.type, 'CUSTOM');
    assert.equal(role.isSystem, false);
  });
});
