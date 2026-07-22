// ─── Identity Layer — comprehensive test suite ──────────────────────────────────
// Run with: npx vite-node src/platform/identity/tests/IdentityLayer.test.ts

import assert from 'node:assert/strict';

import {
  // Errors
  IdentityError, AuthenticationError, InvalidCredentialsError, TokenExpiredError,
  TokenInvalidError, ApiKeyInvalidError, ApiKeyRevokedError, ApiKeyExpiredError,
  AuthorizationError, InsufficientPermissionsError, WrongOrganizationError,
  AccountLockedError, AccountSuspendedError, OrganizationSuspendedError,
  InvitationExpiredError, InvitationRevokedError, SessionExpiredError,
  PrivilegeEscalationError, toSafeIdentityMessage, isIdentityError,
  // Permissions
  PERMISSIONS, PermissionSet, getPermission, isValidPermission,
  // Roles
  SYSTEM_ROLE_NAMES, SYSTEM_ROLE_PERMISSIONS, isSystemRole,
  isPlatformAdminRole, isOrgAdminRole,
  // Auth
  PBKDF2PasswordHasher, sha256Hex, JwtTokenValidator, ApiKeyValidator,
  CompositeAuthenticationProvider,
  // Authorization
  AuthorizationService, PrivilegeGuard,
  // Repositories
  InMemoryOrganizationRepository, InMemoryUserRepository, InMemoryRoleRepository,
  InMemoryUserRoleRepository, InMemoryApiKeyRepository, InMemorySessionRepository,
  InMemoryInvitationRepository, InMemoryLoginAttemptRepository,
  // Services
  OrganizationService, UserService, ApiKeyService, SessionManager, RolePermissionResolver,
  // Middleware
  AuthenticationMiddleware, AuthorizationMiddleware, OrganizationContextMiddleware,
  PermissionMiddleware, AuditMiddleware,
} from '../index';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void | Promise<void>): void {
  void Promise.resolve(fn()).then(() => { passed++; console.log(`  ✓ ${name}`); })
    .catch((err) => {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ ${name}\n      ${msg}`);
    });
}

const FIXED_CLOCK = () => '2026-07-22T12:00:00.000Z';
let idCounter = 0;
const makeIdGen = () => () => `id-${(++idCounter).toString().padStart(4, '0')}`;

function makeTestDeps() {
  const idGen = makeIdGen();
  const clock = FIXED_CLOCK;
  const orgRepo = new InMemoryOrganizationRepository(idGen, clock);
  const userRepo = new InMemoryUserRepository(idGen, clock);
  const roleRepo = new InMemoryRoleRepository(idGen, clock);
  const userRoleRepo = new InMemoryUserRoleRepository(roleRepo);
  const apiKeyRepo = new InMemoryApiKeyRepository(idGen, clock);
  const sessionRepo = new InMemorySessionRepository(idGen, clock);
  const invitationRepo = new InMemoryInvitationRepository(idGen, clock);
  const loginAttemptRepo = new InMemoryLoginAttemptRepository(clock);
  const resolver = new RolePermissionResolver(userRoleRepo, roleRepo);
  const orgService = new OrganizationService(orgRepo, clock);
  const userService = new UserService(userRepo, roleRepo, userRoleRepo, invitationRepo, loginAttemptRepo, clock, idGen);
  const apiKeyService = new ApiKeyService(apiKeyRepo, idGen, clock);
  const sessionManager = new SessionManager(sessionRepo, idGen, clock);
  return { idGen, clock, orgRepo, userRepo, roleRepo, userRoleRepo, apiKeyRepo, sessionRepo,
    invitationRepo, loginAttemptRepo, resolver, orgService, userService, apiKeyService, sessionManager };
}

async function run(): Promise<void> {

  // ══════════════════════════════════════════════════════════════════════════════
  // 1. ERRORS
  // ══════════════════════════════════════════════════════════════════════════════

  test('1. errors — AuthenticationError has 401 status', () => {
    const err = new AuthenticationError();
    assert.equal(err.statusCode, 401);
    assert.equal(err.code, 'AUTHENTICATION_ERROR');
    assert.ok(err instanceof IdentityError);
  });

  test('2. errors — InvalidCredentialsError is AuthenticationError subclass', () => {
    const err = new InvalidCredentialsError();
    assert.equal(err.statusCode, 401);
    assert.ok(err instanceof IdentityError);
  });

  test('3. errors — TokenExpiredError has TOKEN_EXPIRED code', () => {
    const err = new TokenExpiredError();
    assert.equal(err.code, 'TOKEN_EXPIRED');
    assert.equal(err.statusCode, 401);
  });

  test('4. errors — ApiKeyRevokedError has 401 status', () => {
    const err = new ApiKeyRevokedError();
    assert.equal(err.code, 'API_KEY_REVOKED');
    assert.equal(err.statusCode, 401);
  });

  test('5. errors — InsufficientPermissionsError carries required permissions', () => {
    const err = new InsufficientPermissionsError(['workflow:create', 'workflow:publish']);
    assert.deepEqual(err.requiredPermissions, ['workflow:create', 'workflow:publish']);
    assert.equal(err.statusCode, 403);
  });

  test('6. errors — WrongOrganizationError has 403 status', () => {
    const err = new WrongOrganizationError();
    assert.equal(err.statusCode, 403);
  });

  test('7. errors — AccountLockedError has 423 status and lockedUntil', () => {
    const err = new AccountLockedError('2026-07-22T13:00:00Z');
    assert.equal(err.statusCode, 423);
    assert.equal(err.lockedUntil, '2026-07-22T13:00:00Z');
  });

  test('8. errors — OrganizationSuspendedError has 403 status', () => {
    const err = new OrganizationSuspendedError();
    assert.equal(err.statusCode, 403);
  });

  test('9. errors — PrivilegeEscalationError has 403 status', () => {
    const err = new PrivilegeEscalationError();
    assert.equal(err.statusCode, 403);
    assert.equal(err.code, 'PRIVILEGE_ESCALATION');
  });

  test('10. errors — toSafeIdentityMessage masks non-identity errors', () => {
    assert.equal(toSafeIdentityMessage(new AuthenticationError('bad token')), 'bad token');
    assert.equal(toSafeIdentityMessage(new Error('internal leak')), 'An identity error occurred.');
  });

  test('11. errors — isIdentityError checks type', () => {
    assert.ok(isIdentityError(new AuthenticationError()));
    assert.ok(!isIdentityError(new Error('plain')));
  });

  test('12. errors — all 19 error classes are IdentityError subclasses', () => {
    const instances = [
      new AuthenticationError(), new InvalidCredentialsError(), new TokenExpiredError(),
      new TokenInvalidError(), new ApiKeyInvalidError(), new ApiKeyRevokedError(),
      new ApiKeyExpiredError(), new AuthorizationError(), new InsufficientPermissionsError([]),
      new WrongOrganizationError(), new AccountLockedError(null), new AccountSuspendedError(),
      new OrganizationSuspendedError(), new InvitationExpiredError(), new InvitationRevokedError(),
      new SessionExpiredError(), new PrivilegeEscalationError(),
    ];
    for (const inst of instances) {
      assert.ok(inst instanceof IdentityError, `${inst.constructor.name} should extend IdentityError`);
    }
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // 2. PERMISSIONS
  // ══════════════════════════════════════════════════════════════════════════════

  test('13. permissions — catalog has 18 permissions', () => {
    assert.equal(PERMISSIONS.length, 18);
  });

  test('14. permissions — all permission names are unique', () => {
    const names = PERMISSIONS.map(p => p.name);
    assert.equal(new Set(names).size, names.length);
  });

  test('15. permissions — getPermission returns definition', () => {
    const perm = getPermission('workflow:create');
    assert.ok(perm);
    assert.equal(perm.resource, 'workflow');
    assert.equal(perm.action, 'create');
  });

  test('16. permissions — isValidPermission checks existence', () => {
    assert.ok(isValidPermission('execution:read'));
    assert.ok(!isValidPermission('invalid:perm'));
  });

  test('17. permissions — PermissionSet has/hasAny/hasAll', () => {
    const ps = new PermissionSet(['a', 'b', 'c']);
    assert.ok(ps.has('a'));
    assert.ok(ps.hasAny(['a', 'z']));
    assert.ok(!ps.hasAll(['a', 'z']));
    assert.ok(ps.hasAll(['a', 'b']));
  });

  test('18. permissions — PermissionSet union/intersect', () => {
    const ps1 = new PermissionSet(['a', 'b']);
    const ps2 = new PermissionSet(['b', 'c']);
    assert.deepEqual(ps1.union(ps2).toArray().sort(), ['a', 'b', 'c']);
    assert.deepEqual(ps1.intersect(ps2).toArray(), ['b']);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // 3. ROLES
  // ══════════════════════════════════════════════════════════════════════════════

  test('19. roles — 6 system roles defined', () => {
    assert.equal(SYSTEM_ROLE_NAMES.length, 6);
  });

  test('20. roles — PLATFORM_ADMIN has all 18 permissions', () => {
    assert.equal(SYSTEM_ROLE_PERMISSIONS.PLATFORM_ADMIN.length, 18);
  });

  test('21. roles — VIEWER has 5 read-only permissions', () => {
    assert.equal(SYSTEM_ROLE_PERMISSIONS.VIEWER.length, 5);
    for (const p of SYSTEM_ROLE_PERMISSIONS.VIEWER) {
      assert.ok(p.endsWith(':read'), `VIEWER permission ${p} should be read-only`);
    }
  });

  test('22. roles — isSystemRole checks', () => {
    assert.ok(isSystemRole('PLATFORM_ADMIN'));
    assert.ok(isSystemRole('VIEWER'));
    assert.ok(!isSystemRole('CUSTOM_ROLE'));
  });

  test('23. roles — isPlatformAdminRole / isOrgAdminRole', () => {
    assert.ok(isPlatformAdminRole('PLATFORM_ADMIN'));
    assert.ok(!isPlatformAdminRole('ORGANIZATION_ADMIN'));
    assert.ok(isOrgAdminRole('PLATFORM_ADMIN'));
    assert.ok(isOrgAdminRole('ORGANIZATION_ADMIN'));
    assert.ok(!isOrgAdminRole('VIEWER'));
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // 4. AUTHENTICATION — JWT
  // ══════════════════════════════════════════════════════════════════════════════

  test('24. jwt — issue and validate token', async () => {
    const validator = new JwtTokenValidator(FIXED_CLOCK, makeIdGen());
    const { token } = await validator.issueToken({
      actorId: 'user-1', organizationId: 'org-1', roles: ['VIEWER'],
      sessionId: 'sess-1', expiresInSeconds: 3600,
    });
    const result = await validator.validateToken(token);
    assert.ok(result);
    assert.equal(result.actorId, 'user-1');
    assert.equal(result.organizationId, 'org-1');
    assert.equal(result.roles[0], 'VIEWER');
  });

  test('25. jwt — expired token throws TokenExpiredError', async () => {
    let now = Date.now();
    const clock = () => new Date(now).toISOString();
    const validator = new JwtTokenValidator(clock, makeIdGen());
    const { token } = await validator.issueToken({
      actorId: 'user-1', organizationId: 'org-1', roles: ['VIEWER'],
      sessionId: 'sess-1', expiresInSeconds: 1,
    });
    now += 2000;
    await assert.rejects(() => validator.validateToken(token), TokenExpiredError);
  });

  test('26. jwt — revoked token throws TokenInvalidError', async () => {
    const validator = new JwtTokenValidator(FIXED_CLOCK, makeIdGen());
    const { token } = await validator.issueToken({
      actorId: 'user-1', organizationId: 'org-1', roles: ['VIEWER'],
      sessionId: 'sess-1', expiresInSeconds: 3600,
    });
    await validator.revokeToken(token);
    await assert.rejects(() => validator.validateToken(token), TokenInvalidError);
  });

  test('27. jwt — invalid token returns null', async () => {
    const validator = new JwtTokenValidator(FIXED_CLOCK, makeIdGen());
    const result = await validator.validateToken('invalid-token');
    assert.equal(result, null);
  });

  test('28. jwt — non-jwt token returns null', async () => {
    const validator = new JwtTokenValidator(FIXED_CLOCK, makeIdGen());
    const result = await validator.validateToken('api_key_12345');
    assert.equal(result, null);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // 5. AUTHENTICATION — API Keys
  // ══════════════════════════════════════════════════════════════════════════════

  test('29. apikey — valid key validates successfully', async () => {
    const validator = new ApiKeyValidator(FIXED_CLOCK);
    const secretKey = 'ck_live_test123';
    const keyHash = await sha256Hex(secretKey);
    validator.storeApiKey({
      apiKeyId: 'key-1', organizationId: 'org-1', name: 'test',
      keyPreview: 'ck_live_••••1234', keyHash, secretKeyHash: keyHash,
      scopes: ['execution:read'], createdBy: 'user-1',
      expiresAt: null, revokedAt: null, lastUsedAt: null, createdAt: FIXED_CLOCK(),
    });
    const result = await validator.validateApiKey(secretKey);
    assert.ok(result);
    assert.equal(result.apiKeyId, 'key-1');
    assert.equal(result.organizationId, 'org-1');
  });

  test('30. apikey — revoked key throws ApiKeyRevokedError', async () => {
    const validator = new ApiKeyValidator(FIXED_CLOCK);
    const secretKey = 'ck_live_revoked';
    const keyHash = await sha256Hex(secretKey);
    validator.storeApiKey({
      apiKeyId: 'key-2', organizationId: 'org-1', name: 'test',
      keyPreview: 'ck_live_••••', keyHash, secretKeyHash: keyHash,
      scopes: ['execution:read'], createdBy: 'user-1',
      expiresAt: null, revokedAt: FIXED_CLOCK(), lastUsedAt: null, createdAt: FIXED_CLOCK(),
    });
    await assert.rejects(() => validator.validateApiKey(secretKey), ApiKeyRevokedError);
  });

  test('31. apikey — expired key throws ApiKeyExpiredError', async () => {
    const now = Date.now();
    const clock = () => new Date(now).toISOString();
    const validator = new ApiKeyValidator(clock);
    const secretKey = 'ck_live_expired';
    const keyHash = await sha256Hex(secretKey);
    validator.storeApiKey({
      apiKeyId: 'key-3', organizationId: 'org-1', name: 'test',
      keyPreview: 'ck_live_••••', keyHash, secretKeyHash: keyHash,
      scopes: ['execution:read'], createdBy: 'user-1',
      expiresAt: new Date(now - 1000).toISOString(), revokedAt: null, lastUsedAt: null,
      createdAt: new Date(now - 2000).toISOString(),
    });
    await assert.rejects(() => validator.validateApiKey(secretKey), ApiKeyExpiredError);
  });

  test('32. apikey — invalid format returns null', async () => {
    const validator = new ApiKeyValidator(FIXED_CLOCK);
    const result = await validator.validateApiKey('not_a_key');
    assert.equal(result, null);
  });

  test('33. apikey — unknown key returns null', async () => {
    const validator = new ApiKeyValidator(FIXED_CLOCK);
    const result = await validator.validateApiKey('ck_live_unknown');
    assert.equal(result, null);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // 6. AUTHENTICATION — Composite
  // ══════════════════════════════════════════════════════════════════════════════

  test('34. composite — authenticates with API key', async () => {
    const { resolver } = makeTestDeps();
    const tokenValidator = new JwtTokenValidator(FIXED_CLOCK, makeIdGen());
    const apiKeyValidator = new ApiKeyValidator(FIXED_CLOCK);
    const secretKey = 'ck_live_composite1';
    const keyHash = await sha256Hex(secretKey);
    apiKeyValidator.storeApiKey({
      apiKeyId: 'key-1', organizationId: 'org-1', name: 'test',
      keyPreview: '••••', keyHash, secretKeyHash: keyHash,
      scopes: ['execution:read'], createdBy: 'user-1',
      expiresAt: null, revokedAt: null, lastUsedAt: null, createdAt: FIXED_CLOCK(),
    });
    const provider = new CompositeAuthenticationProvider(apiKeyValidator, tokenValidator, resolver);
    const principal = await provider.authenticate({ headers: { 'x-api-key': secretKey } });
    assert.ok(principal);
    assert.equal(principal.authMethod, 'API_KEY');
    assert.equal(principal.organizationId, 'org-1');
  });

  test('35. composite — authenticates with JWT token', async () => {
    const { resolver } = makeTestDeps();
    const tokenValidator = new JwtTokenValidator(FIXED_CLOCK, makeIdGen());
    const apiKeyValidator = new ApiKeyValidator(FIXED_CLOCK);
    const { token } = await tokenValidator.issueToken({
      actorId: 'user-1', organizationId: 'org-1', roles: ['VIEWER'],
      sessionId: 'sess-1', expiresInSeconds: 3600,
    });
    const provider = new CompositeAuthenticationProvider(apiKeyValidator, tokenValidator, resolver);
    const principal = await provider.authenticate({ headers: { authorization: `Bearer ${token}` } });
    assert.ok(principal);
    assert.equal(principal.authMethod, 'JWT');
  });

  test('36. composite — no credentials returns null', async () => {
    const { resolver } = makeTestDeps();
    const tokenValidator = new JwtTokenValidator(FIXED_CLOCK, makeIdGen());
    const apiKeyValidator = new ApiKeyValidator(FIXED_CLOCK);
    const provider = new CompositeAuthenticationProvider(apiKeyValidator, tokenValidator, resolver);
    const principal = await provider.authenticate({ headers: {} });
    assert.equal(principal, null);
  });

  test('37. composite — invalid credentials throws AuthenticationError', async () => {
    const { resolver } = makeTestDeps();
    const tokenValidator = new JwtTokenValidator(FIXED_CLOCK, makeIdGen());
    const apiKeyValidator = new ApiKeyValidator(FIXED_CLOCK);
    const provider = new CompositeAuthenticationProvider(apiKeyValidator, tokenValidator, resolver);
    await assert.rejects(
      () => provider.authenticate({ headers: { 'x-api-key': 'ck_live_bad' } }),
      AuthenticationError,
    );
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // 7. AUTHORIZATION
  // ══════════════════════════════════════════════════════════════════════════════

  test('38. authz — access allowed with correct permission', async () => {
    const { resolver } = makeTestDeps();
    const authService = new AuthorizationService(resolver);
    const principal = {
      actorId: 'user-1', organizationId: 'org-1', roles: ['WORKFLOW_EDITOR'],
      permissions: ['workflow:create', 'workflow:read'], scopes: [],
      authMethod: 'JWT' as const, sessionId: 's1', expiresAt: null,
    };
    const allowed = await authService.checkAccess(principal, 'workflow:create');
    assert.ok(allowed);
  });

  test('39. authz — access denied with insufficient permissions', async () => {
    const { resolver } = makeTestDeps();
    const authService = new AuthorizationService(resolver);
    const principal = {
      actorId: 'user-1', organizationId: 'org-1', roles: ['VIEWER'],
      permissions: ['workflow:read'], scopes: [],
      authMethod: 'JWT' as const, sessionId: 's1', expiresAt: null,
    };
    const allowed = await authService.checkAccess(principal, 'workflow:create');
    assert.ok(!allowed);
  });

  test('40. authz — assertAccess throws InsufficientPermissionsError', async () => {
    const { resolver } = makeTestDeps();
    const authService = new AuthorizationService(resolver);
    const principal = {
      actorId: 'user-1', organizationId: 'org-1', roles: ['VIEWER'],
      permissions: ['workflow:read'], scopes: [],
      authMethod: 'JWT' as const, sessionId: 's1', expiresAt: null,
    };
    await assert.rejects(
      () => authService.assertAccess(principal, 'workflow:create'),
      InsufficientPermissionsError,
    );
  });

  test('41. authz — cross-organization access denied', async () => {
    const { resolver } = makeTestDeps();
    const authService = new AuthorizationService(resolver);
    const principal = {
      actorId: 'user-1', organizationId: 'org-1', roles: ['VIEWER'],
      permissions: ['workflow:read'], scopes: [],
      authMethod: 'JWT' as const, sessionId: 's1', expiresAt: null,
    };
    const allowed = await authService.checkAccess(principal, 'workflow:read', 'org-2');
    assert.ok(!allowed);
  });

  test('42. authz — cross-org access throws WrongOrganizationError', async () => {
    const { resolver } = makeTestDeps();
    const authService = new AuthorizationService(resolver);
    const principal = {
      actorId: 'user-1', organizationId: 'org-1', roles: ['VIEWER'],
      permissions: ['workflow:read'], scopes: [],
      authMethod: 'JWT' as const, sessionId: 's1', expiresAt: null,
    };
    await assert.rejects(
      () => authService.assertAccess(principal, 'workflow:read', 'org-2'),
      WrongOrganizationError,
    );
  });

  test('43. authz — PLATFORM_ADMIN bypasses all checks', async () => {
    const { resolver } = makeTestDeps();
    const authService = new AuthorizationService(resolver);
    const principal = {
      actorId: 'admin', organizationId: 'org-1', roles: ['PLATFORM_ADMIN'],
      permissions: [], scopes: [],
      authMethod: 'JWT' as const, sessionId: 's1', expiresAt: null,
    };
    assert.ok(await authService.checkAccess(principal, 'workflow:create', 'org-other'));
    assert.ok(await authService.checkAccess(principal, 'any:permission', 'org-other'));
  });

  test('44. authz — checkAccessAll requires all permissions', async () => {
    const { resolver } = makeTestDeps();
    const authService = new AuthorizationService(resolver);
    const principal = {
      actorId: 'user-1', organizationId: 'org-1', roles: ['WORKFLOW_EDITOR'],
      permissions: ['workflow:create', 'workflow:read'], scopes: [],
      authMethod: 'JWT' as const, sessionId: 's1', expiresAt: null,
    };
    assert.ok(await authService.checkAccessAll(principal, ['workflow:create', 'workflow:read']));
    assert.ok(!await authService.checkAccessAll(principal, ['workflow:create', 'workflow:delete']));
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // 8. PRIVILEGE ESCALATION
  // ══════════════════════════════════════════════════════════════════════════════

  test('45. privilege — non-admin cannot assign roles', () => {
    const guard = new PrivilegeGuard();
    assert.ok(!guard.canAssignRole(['VIEWER'], 'WORKFLOW_EDITOR'));
  });

  test('46. privilege — ORG_ADMIN cannot assign PLATFORM_ADMIN', () => {
    const guard = new PrivilegeGuard();
    assert.ok(!guard.canAssignRole(['ORGANIZATION_ADMIN'], 'PLATFORM_ADMIN'));
  });

  test('47. privilege — PLATFORM_ADMIN can assign any role', () => {
    const guard = new PrivilegeGuard();
    assert.ok(guard.canAssignRole(['PLATFORM_ADMIN'], 'PLATFORM_ADMIN'));
    assert.ok(guard.canAssignRole(['PLATFORM_ADMIN'], 'ORGANIZATION_ADMIN'));
  });

  test('48. privilege — assertCanAssignRole throws on escalation', () => {
    const guard = new PrivilegeGuard();
    assert.throws(
      () => guard.assertCanAssignRole(['ORGANIZATION_ADMIN'], 'PLATFORM_ADMIN'),
      PrivilegeEscalationError,
    );
  });

  test('49. privilege — cannot manage user with higher role', () => {
    const guard = new PrivilegeGuard();
    assert.ok(!guard.canManageUser(['ORGANIZATION_ADMIN'], ['PLATFORM_ADMIN']));
    assert.ok(guard.canManageUser(['ORGANIZATION_ADMIN'], ['WORKFLOW_EDITOR']));
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // 9. ORGANIZATIONS
  // ══════════════════════════════════════════════════════════════════════════════

  test('50. org — create organization', async () => {
    const { orgService } = makeTestDeps();
    const org = await orgService.createOrganization('Acme Inc', 'pro');
    assert.equal(org.name, 'Acme Inc');
    assert.equal(org.status, 'ACTIVE');
    assert.equal(org.plan, 'pro');
    assert.ok(org.slug);
  });

  test('51. org — suspend organization', async () => {
    const { orgService } = makeTestDeps();
    const org = await orgService.createOrganization('Test Org', 'free');
    const suspended = await orgService.suspendOrganization(org.organizationId);
    assert.equal(suspended.status, 'SUSPENDED');
  });

  test('52. org — reactivate organization', async () => {
    const { orgService } = makeTestDeps();
    const org = await orgService.createOrganization('Test Org', 'free');
    await orgService.suspendOrganization(org.organizationId);
    const reactivated = await orgService.reactivateOrganization(org.organizationId);
    assert.equal(reactivated.status, 'ACTIVE');
  });

  test('53. org — soft delete organization', async () => {
    const { orgService, orgRepo } = makeTestDeps();
    const org = await orgService.createOrganization('Test Org', 'free');
    await orgService.deleteOrganization(org.organizationId);
    const found = await orgRepo.findById(org.organizationId);
    assert.ok(found);
    assert.equal(found.status, 'DELETED');
  });

  test('54. org — update settings', async () => {
    const { orgService } = makeTestDeps();
    const org = await orgService.createOrganization('Test Org', 'pro');
    const updated = await orgService.updateSettings(org.organizationId, { allowPublicWorkflows: true });
    assert.equal(updated.settings.allowPublicWorkflows, true);
  });

  test('55. org — assertActive throws on suspended org', async () => {
    const { orgService } = makeTestDeps();
    const org = await orgService.createOrganization('Test Org', 'free');
    await orgService.suspendOrganization(org.organizationId);
    await assert.rejects(() => orgService.assertActive(org.organizationId), OrganizationSuspendedError);
  });

  test('56. org — plan limits are correct', () => {
    assert.equal(PLAN_LIMITS.free.maxWorkflows, 10);
    assert.equal(PLAN_LIMITS.pro.maxWorkflows, 100);
    assert.equal(PLAN_LIMITS.enterprise.maxWorkflows, -1);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // 10. USERS
  // ══════════════════════════════════════════════════════════════════════════════

  test('57. users — create user profile', async () => {
    const { userService } = makeTestDeps();
    const profile = await userService.createUser('user-1', 'test@example.com', 'Test User');
    assert.equal(profile.email, 'test@example.com');
    assert.equal(profile.fullName, 'Test User');
    assert.equal(profile.status, 'ACTIVE');
  });

  test('58. users — invite user creates invitation', async () => {
    const { userService } = makeTestDeps();
    const { invitationId, token } = await userService.inviteUser('org-1', 'invitee@example.com', 'inviter-1', 'VIEWER');
    assert.ok(invitationId);
    assert.ok(token.startsWith('inv_'));
  });

  test('59. users — accept invitation assigns role', async () => {
    const { userService, orgService, userRoleRepo, roleRepo } = makeTestDeps();
    await orgService.createOrganization('Test', 'free');
    const { token } = await userService.inviteUser('id-0001', 'invitee@example.com', 'inviter-1', 'VIEWER');
    const role = await roleRepo.findByName('VIEWER', null);
    assert.ok(role);
    await userService.acceptInvitation(token, 'new-user-1');
    const roles = await userRoleRepo.listByUserAndOrg('new-user-1', 'id-0001');
    assert.equal(roles.length, 1);
    assert.equal(roles[0].roleName, 'VIEWER');
  });

  test('60. users — suspend user', async () => {
    const { userService } = makeTestDeps();
    await userService.createUser('user-1', 'test@example.com', 'Test');
    const profile = await userService.suspendUser('user-1');
    assert.equal(profile.status, 'SUSPENDED');
  });

  test('61. users — activate user', async () => {
    const { userService } = makeTestDeps();
    await userService.createUser('user-1', 'test@example.com', 'Test');
    await userService.suspendUser('user-1');
    const profile = await userService.activateUser('user-1');
    assert.equal(profile.status, 'ACTIVE');
  });

  test('62. users — update profile', async () => {
    const { userService } = makeTestDeps();
    await userService.createUser('user-1', 'test@example.com', 'Test');
    const profile = await userService.updateProfile('user-1', { fullName: 'Updated Name', jobTitle: 'Engineer' });
    assert.equal(profile.fullName, 'Updated Name');
    assert.equal(profile.jobTitle, 'Engineer');
  });

  test('63. users — assertUserActive throws on suspended user', async () => {
    const { userService } = makeTestDeps();
    await userService.createUser('user-1', 'test@example.com', 'Test');
    await userService.suspendUser('user-1');
    await assert.rejects(() => userService.assertUserActive('user-1'), AccountSuspendedError);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // 11. API KEYS
  // ══════════════════════════════════════════════════════════════════════════════

  test('64. apikeys — create returns secret key', async () => {
    const { apiKeyService } = makeTestDeps();
    const result = await apiKeyService.createApiKey('org-1', 'Test Key', ['execution:read'], 'user-1');
    assert.ok(result.secretKey.startsWith('ck_live_'));
    assert.equal(result.scopes[0], 'execution:read');
    assert.ok(result.keyPreview.startsWith('ck_live_'));
  });

  test('65. apikeys — revoke sets revokedAt', async () => {
    const { apiKeyService, apiKeyRepo } = makeTestDeps();
    const result = await apiKeyService.createApiKey('org-1', 'Test Key', ['execution:read'], 'user-1');
    await apiKeyService.revokeApiKey(result.apiKeyId);
    const key = await apiKeyRepo.findById(result.apiKeyId);
    assert.ok(key);
    assert.ok(key.revokedAt !== null);
  });

  test('66. apikeys — list by organization', async () => {
    const { apiKeyService } = makeTestDeps();
    await apiKeyService.createApiKey('org-1', 'Key 1', ['execution:read'], 'user-1');
    await apiKeyService.createApiKey('org-1', 'Key 2', ['workflow:read'], 'user-1');
    await apiKeyService.createApiKey('org-2', 'Key 3', ['execution:read'], 'user-2');
    const keys = await apiKeyService.listApiKeys('org-1');
    assert.equal(keys.length, 2);
  });

  test('67. apikeys — invalid scope throws', async () => {
    const { apiKeyService } = makeTestDeps();
    await assert.rejects(
      () => apiKeyService.createApiKey('org-1', 'Bad Key', ['invalid:scope'], 'user-1'),
      Error,
    );
  });

  test('68. apikeys — regenerate creates new key and revokes old', async () => {
    const { apiKeyService, apiKeyRepo } = makeTestDeps();
    const original = await apiKeyService.createApiKey('org-1', 'Test', ['execution:read'], 'user-1');
    const regenerated = await apiKeyService.regenerateApiKey(original.apiKeyId);
    assert.notEqual(regenerated.secretKey, original.secretKey);
    const oldKey = await apiKeyRepo.findById(original.apiKeyId);
    assert.ok(oldKey?.revokedAt !== null);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // 12. SESSIONS
  // ══════════════════════════════════════════════════════════════════════════════

  test('69. sessions — create session returns token', async () => {
    const { sessionManager } = makeTestDeps();
    const { session, token } = await sessionManager.createSession('user-1', 'org-1', null, null);
    assert.ok(token.startsWith('sess_'));
    assert.equal(session.userId, 'user-1');
    assert.equal(session.organizationId, 'org-1');
    assert.equal(session.invalidatedAt, null);
  });

  test('70. sessions — validate active session', async () => {
    const { sessionManager } = makeTestDeps();
    const { token } = await sessionManager.createSession('user-1', 'org-1', null, null);
    const session = await sessionManager.validateSession(token);
    assert.ok(session);
    assert.equal(session.userId, 'user-1');
  });

  test('71. sessions — invalidate session', async () => {
    const { sessionManager } = makeTestDeps();
    const { session, token } = await sessionManager.createSession('user-1', 'org-1', null, null);
    await sessionManager.invalidateSession(session.sessionId);
    const result = await sessionManager.validateSession(token);
    assert.equal(result, null);
  });

  test('72. sessions — invalidate all for user', async () => {
    const { sessionManager } = makeTestDeps();
    const s1 = await sessionManager.createSession('user-1', 'org-1', null, null);
    const s2 = await sessionManager.createSession('user-1', 'org-1', null, null);
    await sessionManager.invalidateAllForUser('user-1');
    assert.equal(await sessionManager.validateSession(s1.token), null);
    assert.equal(await sessionManager.validateSession(s2.token), null);
  });

  test('73. sessions — expired session returns null', async () => {
    let now = Date.now();
    const clock = () => new Date(now).toISOString();
    const idGen = makeIdGen();
    const sessionRepo = new InMemorySessionRepository(idGen, clock);
    const sessionManager = new SessionManager(sessionRepo, idGen, clock);
    const { token } = await sessionManager.createSession('user-1', 'org-1', null, null, 1);
    now += 2000;
    const session = await sessionManager.validateSession(token);
    assert.equal(session, null);
  });

  test('74. sessions — list user sessions', async () => {
    const { sessionManager } = makeTestDeps();
    await sessionManager.createSession('user-1', 'org-1', null, null);
    await sessionManager.createSession('user-1', 'org-1', null, null);
    const sessions = await sessionManager.listUserSessions('user-1');
    assert.equal(sessions.length, 2);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // 13. MIDDLEWARE
  // ══════════════════════════════════════════════════════════════════════════════

  test('75. middleware — AuthenticationMiddleware rejects no credentials', async () => {
    const { resolver } = makeTestDeps();
    const tokenValidator = new JwtTokenValidator(FIXED_CLOCK, makeIdGen());
    const apiKeyValidator = new ApiKeyValidator(FIXED_CLOCK);
    const provider = new CompositeAuthenticationProvider(apiKeyValidator, tokenValidator, resolver);
    const mw = new AuthenticationMiddleware(provider);
    const result = await mw.handle({ headers: {}, path: '/test', method: 'GET' }, 'req-1', 'corr-1');
    assert.ok(!result.ok);
    assert.equal(result.status, 401);
  });

  test('76. middleware — AuthenticationMiddleware accepts valid JWT', async () => {
    const { resolver } = makeTestDeps();
    const tokenValidator = new JwtTokenValidator(FIXED_CLOCK, makeIdGen());
    const apiKeyValidator = new ApiKeyValidator(FIXED_CLOCK);
    const { token } = await tokenValidator.issueToken({
      actorId: 'user-1', organizationId: 'org-1', roles: ['VIEWER'],
      sessionId: 's1', expiresInSeconds: 3600,
    });
    const provider = new CompositeAuthenticationProvider(apiKeyValidator, tokenValidator, resolver);
    const mw = new AuthenticationMiddleware(provider);
    const result = await mw.handle({ headers: { authorization: `Bearer ${token}` }, path: '/test', method: 'GET' }, 'req-1', 'corr-1');
    assert.ok(result.ok);
    assert.equal(result.context.principal?.actorId, 'user-1');
  });

  test('77. middleware — AuthorizationMiddleware denies insufficient permissions', async () => {
    const { resolver } = makeTestDeps();
    const authService = new AuthorizationService(resolver);
    const mw = new AuthorizationMiddleware(authService);
    const context = {
      principal: {
        actorId: 'user-1', organizationId: 'org-1', roles: ['VIEWER'],
        permissions: ['workflow:read'], scopes: [],
        authMethod: 'JWT' as const, sessionId: 's1', expiresAt: null,
      },
      requestId: 'req-1', correlationId: 'corr-1', startTime: Date.now(),
    };
    const result = await mw.handle(context, 'workflow:create');
    assert.ok(!result.ok);
    assert.equal(result.status, 403);
  });

  test('78. middleware — OrganizationContextMiddleware rejects cross-org', () => {
    const mw = new OrganizationContextMiddleware();
    const context = {
      principal: {
        actorId: 'user-1', organizationId: 'org-1', roles: ['VIEWER'],
        permissions: [], scopes: [],
        authMethod: 'JWT' as const, sessionId: 's1', expiresAt: null,
      },
      requestId: 'req-1', correlationId: 'corr-1', startTime: Date.now(),
    };
    const result = mw.handle(context, 'org-2');
    assert.ok(!result.ok);
    assert.equal(result.status, 403);
  });

  test('79. middleware — PermissionMiddleware checks all required permissions', async () => {
    const { resolver } = makeTestDeps();
    const authService = new AuthorizationService(resolver);
    const mw = new PermissionMiddleware(authService);
    const context = {
      principal: {
        actorId: 'user-1', organizationId: 'org-1', roles: ['WORKFLOW_EDITOR'],
        permissions: ['workflow:create', 'workflow:read'], scopes: [],
        authMethod: 'JWT' as const, sessionId: 's1', expiresAt: null,
      },
      requestId: 'req-1', correlationId: 'corr-1', startTime: Date.now(),
    };
    const okResult = await mw.handle(context, ['workflow:create', 'workflow:read']);
    assert.ok(okResult.ok);
    const failResult = await mw.handle(context, ['workflow:create', 'workflow:delete']);
    assert.ok(!failResult.ok);
  });

  test('80. middleware — AuditMiddleware logs entries', () => {
    let logged: { action: string; result: string } | null = null;
    const mw = new AuditMiddleware((entry) => { logged = { action: entry.action, result: entry.result }; });
    const context = {
      principal: {
        actorId: 'user-1', organizationId: 'org-1', roles: [],
        permissions: [], scopes: [],
        authMethod: 'JWT' as const, sessionId: 's1', expiresAt: null,
      },
      requestId: 'req-1', correlationId: 'corr-1', startTime: Date.now(),
    };
    mw.handle(context, 'workflow.create', 'workflow', 'wf-1', 'SUCCESS');
    assert.ok(logged);
    assert.equal((logged as unknown as { action: string }).action, 'workflow.create');
    assert.equal((logged as unknown as { result: string }).result, 'SUCCESS');
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // 14. PASSWORD HASHER
  // ══════════════════════════════════════════════════════════════════════════════

  test('81. password — hash and verify round trip', async () => {
    const hasher = new PBKDF2PasswordHasher();
    const hash = await hasher.hash('mypassword123');
    assert.ok(hash.startsWith('pbkdf2$'));
    assert.ok(await hasher.verify('mypassword123', hash));
  });

  test('82. password — wrong password fails verification', async () => {
    const hasher = new PBKDF2PasswordHasher();
    const hash = await hasher.hash('correctpass');
    assert.ok(!await hasher.verify('wrongpass', hash));
  });

  test('83. password — different hashes for same password (salt)', async () => {
    const hasher = new PBKDF2PasswordHasher();
    const h1 = await hasher.hash('samepass');
    const h2 = await hasher.hash('samepass');
    assert.notEqual(h1, h2);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // 15. SHA-256 UTILITY
  // ══════════════════════════════════════════════════════════════════════════════

  test('84. sha256 — deterministic hash', async () => {
    const h1 = await sha256Hex('test');
    const h2 = await sha256Hex('test');
    assert.equal(h1, h2);
    assert.equal(h1.length, 64);
  });

  test('85. sha256 — different inputs produce different hashes', async () => {
    const h1 = await sha256Hex('a');
    const h2 = await sha256Hex('b');
    assert.notEqual(h1, h2);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // 16. MULTITENANT ISOLATION
  // ══════════════════════════════════════════════════════════════════════════════

  test('86. multitenant — api keys are org-scoped', async () => {
    const { apiKeyService } = makeTestDeps();
    await apiKeyService.createApiKey('org-A', 'Key A', ['execution:read'], 'user-1');
    await apiKeyService.createApiKey('org-B', 'Key B', ['execution:read'], 'user-2');
    const keysA = await apiKeyService.listApiKeys('org-A');
    const keysB = await apiKeyService.listApiKeys('org-B');
    assert.equal(keysA.length, 1);
    assert.equal(keysB.length, 1);
    assert.notEqual(keysA[0].organizationId, keysB[0].organizationId);
  });

  test('87. multitenant — sessions track organization', async () => {
    const { sessionManager } = makeTestDeps();
    const { session: s1 } = await sessionManager.createSession('user-1', 'org-A', null, null);
    const { session: s2 } = await sessionManager.createSession('user-2', 'org-B', null, null);
    assert.equal(s1.organizationId, 'org-A');
    assert.equal(s2.organizationId, 'org-B');
  });

  test('88. multitenant — authorization enforces org boundary', async () => {
    const { resolver } = makeTestDeps();
    const authService = new AuthorizationService(resolver);
    const principal = {
      actorId: 'user-1', organizationId: 'org-A', roles: ['WORKFLOW_EDITOR'],
      permissions: ['workflow:create', 'workflow:read'], scopes: [],
      authMethod: 'JWT' as const, sessionId: 's1', expiresAt: null,
    };
    assert.ok(await authService.checkAccess(principal, 'workflow:create', 'org-A'));
    assert.ok(!await authService.checkAccess(principal, 'workflow:create', 'org-B'));
  });

  console.log(`\n  ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

// Import PLAN_LIMITS for test 56
import { PLAN_LIMITS } from '../index';

run();
