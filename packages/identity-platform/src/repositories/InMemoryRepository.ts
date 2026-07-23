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
import type {
  IOrganizationRepository,
  IUserRepository,
  IRoleRepository,
  IPermissionRepository,
  IApiKeyRepository,
  ISessionRepository,
  IServiceAccountRepository,
  IPolicyRepository,
  IAuditRepository,
  IdentityRepository,
} from './RepositoryInterfaces';

function paginate<T>(items: T[], query?: PageQuery): PaginatedResult<T> {
  const page = query?.page ?? 1;
  const pageSize = query?.pageSize ?? 50;
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total: items.length,
    page,
    pageSize,
  };
}

class InMemoryOrganizationRepo implements IOrganizationRepository {
  private readonly items = new Map<string, Organization>();

  async create(org: Organization): Promise<Organization> {
    this.items.set(org.id, org);
    return org;
  }
  async findById(id: string): Promise<Organization | null> {
    return this.items.get(id) ?? null;
  }
  async findBySlug(slug: string): Promise<Organization | null> {
    for (const org of this.items.values()) {
      if (org.slug === slug) return org;
    }
    return null;
  }
  async update(org: Organization): Promise<Organization> {
    this.items.set(org.id, org);
    return org;
  }
  async delete(id: string): Promise<boolean> {
    return this.items.delete(id);
  }
  async list(query?: PageQuery): Promise<PaginatedResult<Organization>> {
    return paginate(Array.from(this.items.values()), query);
  }
  clear(): void { this.items.clear(); }
}

class InMemoryUserRepo implements IUserRepository {
  private readonly items = new Map<string, User>();

  async create(user: User): Promise<User> {
    this.items.set(user.id, user);
    return user;
  }
  async findById(id: string): Promise<User | null> {
    return this.items.get(id) ?? null;
  }
  async findByEmail(email: string, organizationId: string): Promise<User | null> {
    for (const user of this.items.values()) {
      if (user.email === email && user.organizationId === organizationId) return user;
    }
    return null;
  }
  async findByOrganization(organizationId: string, query?: PageQuery): Promise<PaginatedResult<User>> {
    return paginate(
      Array.from(this.items.values()).filter((u) => u.organizationId === organizationId),
      query,
    );
  }
  async update(user: User): Promise<User> {
    this.items.set(user.id, user);
    return user;
  }
  async delete(id: string): Promise<boolean> {
    return this.items.delete(id);
  }
  clear(): void { this.items.clear(); }
}

class InMemoryRoleRepo implements IRoleRepository {
  private readonly items = new Map<string, Role>();

  async create(role: Role): Promise<Role> {
    this.items.set(role.id, role);
    return role;
  }
  async findById(id: string): Promise<Role | null> {
    return this.items.get(id) ?? null;
  }
  async findByName(name: string, organizationId: string): Promise<Role | null> {
    for (const role of this.items.values()) {
      if (role.name === name && role.organizationId === organizationId) return role;
    }
    return null;
  }
  async findByOrganization(organizationId: string): Promise<Role[]> {
    return Array.from(this.items.values()).filter((r) => r.organizationId === organizationId);
  }
  async update(role: Role): Promise<Role> {
    this.items.set(role.id, role);
    return role;
  }
  async delete(id: string): Promise<boolean> {
    return this.items.delete(id);
  }
  clear(): void { this.items.clear(); }
}

class InMemoryPermissionRepo implements IPermissionRepository {
  private readonly items = new Map<string, Permission>();
  private readonly keyIndex = new Map<string, Permission>();

  async create(permission: Permission): Promise<Permission> {
    this.items.set(permission.id, permission);
    this.keyIndex.set(`${permission.resource}:${permission.action}`, permission);
    return permission;
  }
  async findById(id: string): Promise<Permission | null> {
    return this.items.get(id) ?? null;
  }
  async findByKey(key: string): Promise<Permission | null> {
    return this.keyIndex.get(key) ?? null;
  }
  async list(): Promise<Permission[]> {
    return Array.from(this.items.values());
  }
  async delete(id: string): Promise<boolean> {
    const perm = this.items.get(id);
    if (perm) this.keyIndex.delete(`${perm.resource}:${perm.action}`);
    return this.items.delete(id);
  }
  clear(): void { this.items.clear(); this.keyIndex.clear(); }
}

class InMemoryApiKeyRepo implements IApiKeyRepository {
  private readonly items = new Map<string, ApiKey>();
  private readonly hashIndex = new Map<string, ApiKey>();

  async create(apiKey: ApiKey): Promise<ApiKey> {
    this.items.set(apiKey.id, apiKey);
    this.hashIndex.set(apiKey.keyHash, apiKey);
    return apiKey;
  }
  async findById(id: string): Promise<ApiKey | null> {
    return this.items.get(id) ?? null;
  }
  async findByHash(hash: string): Promise<ApiKey | null> {
    return this.hashIndex.get(hash) ?? null;
  }
  async findByOrganization(organizationId: string): Promise<ApiKey[]> {
    return Array.from(this.items.values()).filter((k) => k.organizationId === organizationId);
  }
  async update(apiKey: ApiKey): Promise<ApiKey> {
    this.items.set(apiKey.id, apiKey);
    this.hashIndex.set(apiKey.keyHash, apiKey);
    return apiKey;
  }
  async delete(id: string): Promise<boolean> {
    const key = this.items.get(id);
    if (key) this.hashIndex.delete(key.keyHash);
    return this.items.delete(id);
  }
  clear(): void { this.items.clear(); this.hashIndex.clear(); }
}

class InMemorySessionRepo implements ISessionRepository {
  private readonly items = new Map<string, Session>();
  private readonly hashIndex = new Map<string, Session>();

  async create(session: Session): Promise<Session> {
    this.items.set(session.id, session);
    this.hashIndex.set(session.tokenHash, session);
    return session;
  }
  async findById(id: string): Promise<Session | null> {
    return this.items.get(id) ?? null;
  }
  async findByTokenHash(hash: string): Promise<Session | null> {
    return this.hashIndex.get(hash) ?? null;
  }
  async findByUser(userId: string, organizationId: string): Promise<Session[]> {
    return Array.from(this.items.values()).filter(
      (s) => s.userId === userId && s.organizationId === organizationId,
    );
  }
  async findByOrganization(organizationId: string): Promise<Session[]> {
    return Array.from(this.items.values()).filter((s) => s.organizationId === organizationId);
  }
  async update(session: Session): Promise<Session> {
    this.items.set(session.id, session);
    if (session.status !== 'ACTIVE') {
      this.hashIndex.delete(session.tokenHash);
    }
    return session;
  }
  async delete(id: string): Promise<boolean> {
    const session = this.items.get(id);
    if (session) this.hashIndex.delete(session.tokenHash);
    return this.items.delete(id);
  }
  async deleteExpiredBefore(timestamp: string): Promise<number> {
    let count = 0;
    for (const [id, session] of this.items) {
      if (session.expiresAt < timestamp) {
        this.items.delete(id);
        this.hashIndex.delete(session.tokenHash);
        count++;
      }
    }
    return count;
  }
  clear(): void { this.items.clear(); this.hashIndex.clear(); }
}

class InMemoryServiceAccountRepo implements IServiceAccountRepository {
  private readonly items = new Map<string, ServiceAccount>();

  async create(account: ServiceAccount): Promise<ServiceAccount> {
    this.items.set(account.id, account);
    return account;
  }
  async findById(id: string): Promise<ServiceAccount | null> {
    return this.items.get(id) ?? null;
  }
  async findByOrganization(organizationId: string): Promise<ServiceAccount[]> {
    return Array.from(this.items.values()).filter((a) => a.organizationId === organizationId);
  }
  async update(account: ServiceAccount): Promise<ServiceAccount> {
    this.items.set(account.id, account);
    return account;
  }
  async delete(id: string): Promise<boolean> {
    return this.items.delete(id);
  }
  clear(): void { this.items.clear(); }
}

class InMemoryPolicyRepo implements IPolicyRepository {
  private readonly items = new Map<string, Policy>();

  async create(policy: Policy): Promise<Policy> {
    this.items.set(policy.id, policy);
    return policy;
  }
  async findById(id: string): Promise<Policy | null> {
    return this.items.get(id) ?? null;
  }
  async findByOrganization(organizationId: string): Promise<Policy[]> {
    return Array.from(this.items.values())
      .filter((p) => p.organizationId === organizationId && p.enabled)
      .sort((a, b) => b.priority - a.priority);
  }
  async update(policy: Policy): Promise<Policy> {
    this.items.set(policy.id, policy);
    return policy;
  }
  async delete(id: string): Promise<boolean> {
    return this.items.delete(id);
  }
  clear(): void { this.items.clear(); }
}

class InMemoryAuditRepo implements IAuditRepository {
  private readonly items: AuditEntry[] = [];

  async create(entry: AuditEntry): Promise<AuditEntry> {
    this.items.push(entry);
    return entry;
  }
  async findByOrganization(organizationId: string, query?: PageQuery): Promise<PaginatedResult<AuditEntry>> {
    return paginate(
      this.items.filter((e) => e.organizationId === organizationId),
      query,
    );
  }
  async findByActor(actorId: string, organizationId: string): Promise<AuditEntry[]> {
    return this.items.filter((e) => e.actorId === actorId && e.organizationId === organizationId);
  }
  async findByAction(action: string, organizationId: string): Promise<AuditEntry[]> {
    return this.items.filter((e) => e.action === action && e.organizationId === organizationId);
  }
  clear(): void { this.items.length = 0; }
}

export class InMemoryIdentityRepository implements IdentityRepository {
  readonly organizations: IOrganizationRepository;
  readonly users: IUserRepository;
  readonly roles: IRoleRepository;
  readonly permissions: IPermissionRepository;
  readonly apiKeys: IApiKeyRepository;
  readonly sessions: ISessionRepository;
  readonly serviceAccounts: IServiceAccountRepository;
  readonly policies: IPolicyRepository;
  readonly audit: IAuditRepository;

  constructor() {
    this.organizations = new InMemoryOrganizationRepo();
    this.users = new InMemoryUserRepo();
    this.roles = new InMemoryRoleRepo();
    this.permissions = new InMemoryPermissionRepo();
    this.apiKeys = new InMemoryApiKeyRepo();
    this.sessions = new InMemorySessionRepo();
    this.serviceAccounts = new InMemoryServiceAccountRepo();
    this.policies = new InMemoryPolicyRepo();
    this.audit = new InMemoryAuditRepo();
  }

  clear(): void {
    (this.organizations as InMemoryOrganizationRepo).clear();
    (this.users as InMemoryUserRepo).clear();
    (this.roles as InMemoryRoleRepo).clear();
    (this.permissions as InMemoryPermissionRepo).clear();
    (this.apiKeys as InMemoryApiKeyRepo).clear();
    (this.sessions as InMemorySessionRepo).clear();
    (this.serviceAccounts as InMemoryServiceAccountRepo).clear();
    (this.policies as InMemoryPolicyRepo).clear();
    (this.audit as InMemoryAuditRepo).clear();
  }
}
