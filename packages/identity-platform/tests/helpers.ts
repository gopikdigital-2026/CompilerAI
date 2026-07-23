import type { IdentityPlatform } from '../src/index';

export function makeIdGenerator(): () => string {
  let n = 0;
  return () => `test_id_${++n}`;
}

export function makeClock(): () => string {
  let tick = 0;
  return () => `2026-01-01T00:00:${String(tick++).padStart(2, '0')}.000Z`;
}

export async function createPlatform(): Promise<IdentityPlatform> {
  const { IdentityPlatform } = await import('../src/index');
  const platform = new IdentityPlatform({
    idGenerator: makeIdGenerator(),
    clock: makeClock(),
  });
  await platform.seedSystemPermissions();
  return platform;
}

export async function createTestOrg(platform: IdentityPlatform): Promise<{
  org: Awaited<ReturnType<typeof platform.organizations.create>>;
  user: Awaited<ReturnType<typeof platform.users.create>>;
  roles: Awaited<ReturnType<typeof platform.roles.seedSystemRoles>>;
}> {
  const org = await platform.organizations.create({
    name: 'Test Org',
    slug: 'test-org',
    plan: 'PRO',
    ownerUserId: 'test-owner',
  });
  const roles = await platform.roles.seedSystemRoles(org.id);
  const orgAdminRole = roles.find((r) => r.name === 'OrganizationAdmin')!;
  const user = await platform.users.create({
    email: 'admin@test.com',
    displayName: 'Test Admin',
    password: 'TestPass123!',
    organizationId: org.id,
    roleIds: [orgAdminRole.id],
  });
  return { org, user, roles };
}

export async function createSecondOrg(platform: IdentityPlatform): Promise<{
  org: Awaited<ReturnType<typeof platform.organizations.create>>;
  user: Awaited<ReturnType<typeof platform.users.create>>;
}> {
  const org = await platform.organizations.create({
    name: 'Second Org',
    slug: 'second-org',
    plan: 'STARTER',
    ownerUserId: 'second-owner',
  });
  const roles = await platform.roles.seedSystemRoles(org.id);
  const viewerRole = roles.find((r) => r.name === 'Viewer')!;
  const user = await platform.users.create({
    email: 'viewer@second.com',
    displayName: 'Second Viewer',
    password: 'SecondPass123!',
    organizationId: org.id,
    roleIds: [viewerRole.id],
  });
  return { org, user };
}
