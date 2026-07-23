import type { Organization } from '../organizations/OrganizationModels';
import type { User } from '../users/UserModels';
import type { Role } from '../roles/RoleModels';
import type { Permission } from '../permissions/PermissionModels';
import type { ApiKey } from '../api-keys/ApiKeyModels';
import type { Session } from '../sessions/SessionModels';
import type { ServiceAccount } from '../service-accounts/ServiceAccountModels';
import type { Policy } from '../policies/PolicyModels';
import type { AuditEntry } from '../audit/AuditModels';
import type { PageQuery, PaginatedResult } from '../types/shared';

export interface IOrganizationRepository {
  create(org: Organization): Promise<Organization>;
  findById(id: string): Promise<Organization | null>;
  findBySlug(slug: string): Promise<Organization | null>;
  update(org: Organization): Promise<Organization>;
  delete(id: string): Promise<boolean>;
  list(query?: PageQuery): Promise<PaginatedResult<Organization>>;
}

export interface IUserRepository {
  create(user: User): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string, organizationId: string): Promise<User | null>;
  findByOrganization(organizationId: string, query?: PageQuery): Promise<PaginatedResult<User>>;
  update(user: User): Promise<User>;
  delete(id: string): Promise<boolean>;
}

export interface IRoleRepository {
  create(role: Role): Promise<Role>;
  findById(id: string): Promise<Role | null>;
  findByName(name: string, organizationId: string): Promise<Role | null>;
  findByOrganization(organizationId: string): Promise<Role[]>;
  update(role: Role): Promise<Role>;
  delete(id: string): Promise<boolean>;
}

export interface IPermissionRepository {
  create(permission: Permission): Promise<Permission>;
  findById(id: string): Promise<Permission | null>;
  findByKey(key: string): Promise<Permission | null>;
  list(): Promise<Permission[]>;
  delete(id: string): Promise<boolean>;
}

export interface IApiKeyRepository {
  create(apiKey: ApiKey): Promise<ApiKey>;
  findById(id: string): Promise<ApiKey | null>;
  findByHash(hash: string): Promise<ApiKey | null>;
  findByOrganization(organizationId: string): Promise<ApiKey[]>;
  update(apiKey: ApiKey): Promise<ApiKey>;
  delete(id: string): Promise<boolean>;
}

export interface ISessionRepository {
  create(session: Session): Promise<Session>;
  findById(id: string): Promise<Session | null>;
  findByTokenHash(hash: string): Promise<Session | null>;
  findByUser(userId: string, organizationId: string): Promise<Session[]>;
  findByOrganization(organizationId: string): Promise<Session[]>;
  update(session: Session): Promise<Session>;
  delete(id: string): Promise<boolean>;
  deleteExpiredBefore(timestamp: string): Promise<number>;
}

export interface IServiceAccountRepository {
  create(account: ServiceAccount): Promise<ServiceAccount>;
  findById(id: string): Promise<ServiceAccount | null>;
  findByOrganization(organizationId: string): Promise<ServiceAccount[]>;
  update(account: ServiceAccount): Promise<ServiceAccount>;
  delete(id: string): Promise<boolean>;
}

export interface IPolicyRepository {
  create(policy: Policy): Promise<Policy>;
  findById(id: string): Promise<Policy | null>;
  findByOrganization(organizationId: string): Promise<Policy[]>;
  update(policy: Policy): Promise<Policy>;
  delete(id: string): Promise<boolean>;
}

export interface IAuditRepository {
  create(entry: AuditEntry): Promise<AuditEntry>;
  findByOrganization(organizationId: string, query?: PageQuery): Promise<PaginatedResult<AuditEntry>>;
  findByActor(actorId: string, organizationId: string): Promise<AuditEntry[]>;
  findByAction(action: string, organizationId: string): Promise<AuditEntry[]>;
}

export interface IdentityRepository {
  organizations: IOrganizationRepository;
  users: IUserRepository;
  roles: IRoleRepository;
  permissions: IPermissionRepository;
  apiKeys: IApiKeyRepository;
  sessions: ISessionRepository;
  serviceAccounts: IServiceAccountRepository;
  policies: IPolicyRepository;
  audit: IAuditRepository;
}
