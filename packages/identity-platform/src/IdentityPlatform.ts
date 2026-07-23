import type { IdentityRepository } from './repositories/RepositoryInterfaces';
import { InMemoryIdentityRepository } from './repositories/InMemoryRepository';
import { PasswordHasher, TokenGenerator } from './adapters/SecurityAdapters';
import type { IPasswordHasher, ITokenGenerator } from './adapters/SecurityAdapters';

import { OrganizationService } from './organizations/OrganizationService';
import { UserService } from './users/UserService';
import { RoleService } from './roles/RoleService';
import { PermissionService } from './permissions/PermissionService';
import { ApiKeyService } from './api-keys/ApiKeyService';
import { SessionService } from './sessions/SessionService';
import { PolicyEngine } from './policies/PolicyEngine';
import { AuditService } from './audit/AuditService';
import { AuthorizationService } from './authorization/AuthorizationService';
import { AuthenticationService } from './auth/AuthenticationService';

import type { Organization } from './organizations/OrganizationModels';
import type { User } from './users/UserModels';
import type { Role } from './roles/RoleModels';

export interface IdentityPlatformDeps {
  repository?: IdentityRepository;
  passwordHasher?: IPasswordHasher;
  tokenGenerator?: ITokenGenerator;
  idGenerator: () => string;
  clock: () => string;
}

export class IdentityPlatform {
  readonly id = 'identity-platform-v2';

  readonly repository: IdentityRepository;
  readonly passwordHasher: IPasswordHasher;
  readonly tokenGenerator: ITokenGenerator;

  readonly organizations: OrganizationService;
  readonly users: UserService;
  readonly roles: RoleService;
  readonly permissions: PermissionService;
  readonly apiKeys: ApiKeyService;
  readonly sessions: SessionService;
  readonly policies: PolicyEngine;
  readonly audit: AuditService;
  readonly authorization: AuthorizationService;
  readonly authentication: AuthenticationService;

  constructor(deps: IdentityPlatformDeps) {
    this.repository = deps.repository ?? new InMemoryIdentityRepository();
    this.passwordHasher = deps.passwordHasher ?? new PasswordHasher();
    this.tokenGenerator = deps.tokenGenerator ?? new TokenGenerator();

    this.organizations = new OrganizationService(this.repository.organizations, deps.idGenerator, deps.clock);
    this.users = new UserService(this.repository.users, this.passwordHasher, deps.idGenerator, deps.clock);
    this.roles = new RoleService(this.repository.roles, deps.idGenerator, deps.clock);
    this.permissions = new PermissionService(this.repository.permissions, deps.idGenerator, deps.clock);
    this.apiKeys = new ApiKeyService(this.repository.apiKeys, this.tokenGenerator, deps.idGenerator, deps.clock);
    this.sessions = new SessionService(this.repository.sessions, this.tokenGenerator, deps.idGenerator, deps.clock);
    this.policies = new PolicyEngine(this.repository.policies, deps.idGenerator, deps.clock);
    this.audit = new AuditService(this.repository.audit, deps.idGenerator, deps.clock);
    this.authorization = new AuthorizationService(this.roles, this.policies);
    this.authentication = new AuthenticationService(
      this.users,
      this.sessions,
      this.apiKeys,
      this.audit,
      this.authorization,
    );
  }

  async seedSystemPermissions(): Promise<void> {
    await this.permissions.seedSystemPermissions();
  }

  async seedSystemRoles(organizationId: string): Promise<void> {
    await this.roles.seedSystemRoles(organizationId);
  }

  async bootstrapOrganization(params: {
    name: string;
    slug: string;
    plan?: 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE';
    ownerEmail: string;
    ownerPassword: string;
    ownerDisplayName: string;
  }): Promise<{ org: Organization; user: User; roles: Role[] }> {
    const org = await this.organizations.create({
      name: params.name,
      slug: params.slug,
      plan: params.plan ?? 'STARTER',
      ownerUserId: '',
    });

    const roles = await this.roles.seedSystemRoles(org.id);
    const orgAdminRole = roles.find((r) => r.name === 'OrganizationAdmin');

    const user = await this.users.create({
      email: params.ownerEmail,
      displayName: params.ownerDisplayName,
      password: params.ownerPassword,
      organizationId: org.id,
      roleIds: orgAdminRole ? [orgAdminRole.id] : [],
    });

    const updatedOrg = await this.organizations.update(org.id, { ownerUserId: user.id });

    await this.audit.record({
      organizationId: org.id,
      action: 'ORG_CREATED',
      actorId: user.id,
      actorType: 'USER',
      targetType: 'ORGANIZATION',
      targetId: org.id,
      severity: 'HIGH',
      detail: { name: params.name, slug: params.slug },
      success: true,
    });

    return { org: updatedOrg, user, roles };
  }

  clear(): void {
    if (this.repository instanceof InMemoryIdentityRepository) {
      this.repository.clear();
    }
  }
}
