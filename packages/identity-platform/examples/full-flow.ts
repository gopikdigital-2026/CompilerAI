import { IdentityPlatform } from '../src/index';

let counter = 0;
const idGen = () => `id_${++counter}`;
const clock = () => `2026-01-01T00:00:${String(Math.floor(Date.now() / 1000) % 60).padStart(2, '0')}.000Z`;

async function main(): Promise<void> {
  const platform = new IdentityPlatform({ idGenerator: idGen, clock });
  await platform.seedSystemPermissions();

  // 1. Create organization with an admin user
  const { org, user, roles } = await platform.bootstrapOrganization({
    name: 'Acme Corporation',
    slug: 'acme',
    plan: 'PRO',
    ownerEmail: 'admin@acme.com',
    ownerPassword: 'SecurePass123!',
    ownerDisplayName: 'Acme Admin',
  });
  console.log(`Created org: ${org.name} (${org.id})`);
  console.log(`Created user: ${user.email} with ${roles.length} system roles`);

  // 2. Assign the Developer role to the admin user
  const developerRole = roles.find((r) => r.name === 'Developer');
  if (developerRole) {
    await platform.users.assignRole(user.id, developerRole.id);
    console.log(`Assigned Developer role to ${user.email}`);
  }

  // 3. Create an API key for the organization
  const { apiKey, rawKey } = await platform.apiKeys.create({
    name: 'CI/CD Pipeline Key',
    organizationId: org.id,
    createdByUserId: user.id,
    scopes: ['read', 'write'],
    expiresAt: null,
  });
  console.log(`Created API key: ${apiKey.name} (preview: ${apiKey.keyPreview})`);

  // 4. Authenticate with password (login)
  const { session, authContext } = await platform.authentication.login({
    email: 'admin@acme.com',
    password: 'SecurePass123!',
    organizationId: org.id,
    ipAddress: '192.168.1.1',
  });
  console.log(`Login successful. Session: ${session.id}`);
  console.log(`Auth context: roles=${authContext.roleNames.join(', ')}, perms=${authContext.permissionIds.length}`);

  // 5. Check permissions
  const canReadUsers = await platform.authorization.checkPermission(authContext, 'users:read');
  console.log(`Can read users? ${canReadUsers}`);

  const canDeleteUsers = await platform.authorization.checkPermission(authContext, 'users:delete');
  console.log(`Can delete users? ${canDeleteUsers}`);

  // 6. Authenticate with the API key
  const principal = await platform.authentication.authenticateWithApiKey(rawKey);
  console.log(`API key auth: type=${principal.type}, org=${principal.organizationId}`);

  // 7. View audit log
  const auditLog = await platform.audit.findByOrganization(org.id);
  console.log(`Audit log: ${auditLog.total} entries`);
  for (const entry of auditLog.items) {
    console.log(`  [${entry.createdAt}] ${entry.action} — ${entry.success ? 'OK' : 'FAIL'}`);
  }
}

main().catch(console.error);
