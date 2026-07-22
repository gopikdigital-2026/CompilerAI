// ─── In-memory repository implementations ───────────────────────────────────────

import type {
  IOrganizationRepository, IUserRepository, IRoleRepository, IUserRoleRepository,
  IApiKeyRepository, ISessionRepository, IInvitationRepository, ILoginAttemptRepository,
} from './RepositoryInterfaces';
import type { Organization } from '../organizations/OrganizationModels';
import { DEFAULT_ORG_SETTINGS, PLAN_LIMITS } from '../organizations/OrganizationModels';
import type { UserProfile, User, Invitation, UserStatus, UserRoleAssignment } from '../users/UserModels';
import { DEFAULT_USER_PREFERENCES } from '../users/UserModels';
import type { ApiKey, ApiKeyScope } from '../api-keys/ApiKeyModels';
import type { Session } from '../sessions/SessionModels';
import type { RoleDefinition } from '../roles/Roles';
import { SYSTEM_ROLE_PERMISSIONS, SYSTEM_ROLE_NAMES } from '../roles/Roles';

export class InMemoryOrganizationRepository implements IOrganizationRepository {
  private orgs = new Map<string, Organization>();
  private idGen: () => string;
  private clock: () => string;

  constructor(idGen: () => string, clock: () => string) {
    this.idGen = idGen;
    this.clock = clock;
  }

  async create(name: string, slug: string, plan: string): Promise<Organization> {
    const id = this.idGen();
    const now = this.clock();
    const org: Organization = {
      organizationId: id, name, slug, plan: plan as Organization['plan'],
      status: 'ACTIVE', settings: { ...DEFAULT_ORG_SETTINGS },
      limits: { ...PLAN_LIMITS[plan as Organization['plan']] ?? PLAN_LIMITS.free },
      logoUrl: null, createdAt: now, updatedAt: now,
    };
    this.orgs.set(id, org);
    return org;
  }

  async findById(id: string): Promise<Organization | null> {
    return this.orgs.get(id) ?? null;
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    for (const org of this.orgs.values()) {
      if (org.slug === slug && org.status !== 'DELETED') return org;
    }
    return null;
  }

  async list(): Promise<Organization[]> {
    return Array.from(this.orgs.values()).filter(o => o.status !== 'DELETED');
  }

  async listByMember(_userId: string): Promise<Organization[]> {
    return this.list();
  }

  async update(id: string, updates: Partial<Pick<Organization, 'name' | 'plan' | 'settings' | 'limits' | 'logoUrl'>>): Promise<Organization> {
    const org = this.orgs.get(id);
    if (!org) throw new Error(`Organization ${id} not found`);
    const updated = { ...org, ...updates, updatedAt: this.clock() };
    this.orgs.set(id, updated);
    return updated;
  }

  async updateStatus(id: string, status: string): Promise<Organization> {
    const org = this.orgs.get(id);
    if (!org) throw new Error(`Organization ${id} not found`);
    const updated = { ...org, status: status as Organization['status'], updatedAt: this.clock() };
    this.orgs.set(id, updated);
    return updated;
  }

  async softDelete(id: string): Promise<void> {
    const org = this.orgs.get(id);
    if (!org) return;
    this.orgs.set(id, { ...org, status: 'DELETED', updatedAt: this.clock() });
  }
}

export class InMemoryUserRepository implements IUserRepository {
  private profiles = new Map<string, UserProfile>();
  private userEmails = new Map<string, string>();
  private rolesByUserOrg = new Map<string, UserRoleAssignment[]>();
  private clock: () => string;

  constructor(_idGen: () => string, clock: () => string) {
    this.clock = clock;
  }

  async findById(id: string): Promise<User | null> {
    const profile = this.profiles.get(id);
    if (!profile) return null;
    const roles = this.rolesByUserOrg.get(id) ?? [];
    return {
      userId: id, email: this.userEmails.get(id) ?? '', profile, roles,
      failedLoginCount: 0, lockedUntil: null,
    };
  }

  async findByEmail(email: string): Promise<User | null> {
    for (const [userId, em] of this.userEmails) {
      if (em === email) return this.findById(userId);
    }
    return null;
  }

  async listByOrganization(orgId: string): Promise<User[]> {
    const users: User[] = [];
    for (const [userId, roles] of this.rolesByUserOrg) {
      if (roles.some(r => r.organizationId === orgId)) {
        const user = await this.findById(userId);
        if (user) users.push(user);
      }
    }
    return users;
  }

  async createProfile(userId: string, email: string, fullName: string): Promise<UserProfile> {
    const now = this.clock();
    const profile: UserProfile = {
      userId, email, fullName, avatarUrl: null, jobTitle: '',
      status: 'ACTIVE', preferences: { ...DEFAULT_USER_PREFERENCES },
      lastLoginAt: null, createdAt: now, updatedAt: now,
    };
    this.profiles.set(userId, profile);
    this.userEmails.set(userId, email);
    return profile;
  }

  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    const profile = this.profiles.get(userId);
    if (!profile) throw new Error(`User ${userId} not found`);
    const updated = { ...profile, ...updates, userId: profile.userId, updatedAt: this.clock() };
    this.profiles.set(userId, updated);
    return updated;
  }

  async updateStatus(userId: string, status: UserStatus): Promise<UserProfile> {
    return this.updateProfile(userId, { status });
  }

  async recordFailedLogin(userId: string): Promise<void> {
    const profile = this.profiles.get(userId);
    if (!profile) return;
    // Simplified — in production would persist to DB
  }

  async resetFailedLogins(_userId: string): Promise<void> {}

  async lockAccount(userId: string, _until: string): Promise<void> {
    const profile = this.profiles.get(userId);
    if (!profile) return;
    // Simplified
  }

  assignRole(userId: string, orgId: string, roleId: string, roleName: string, assignedBy: string | null): void {
    const existing = this.rolesByUserOrg.get(userId) ?? [];
    if (!existing.some(r => r.roleId === roleId && r.organizationId === orgId)) {
      existing.push({ roleId, roleName, organizationId: orgId, assignedBy, assignedAt: this.clock() });
      this.rolesByUserOrg.set(userId, existing);
    }
  }

  getRoles(userId: string, orgId: string): { roleId: string; roleName: string }[] {
    const roles = this.rolesByUserOrg.get(userId) ?? [];
    return roles.filter(r => r.organizationId === orgId).map(r => ({ roleId: r.roleId, roleName: r.roleName }));
  }
}

export class InMemoryRoleRepository implements IRoleRepository {
  private roles = new Map<string, RoleDefinition>();
  private idGen: () => string;
  private clock: () => string;

  constructor(idGen: () => string, clock: () => string) {
    this.idGen = idGen;
    this.clock = clock;
    this.seedSystemRoles();
  }

  private seedSystemRoles(): void {
    const now = this.clock();
    for (const name of SYSTEM_ROLE_NAMES) {
      const id = this.idGen();
      this.roles.set(id, {
        roleId: id, name, organizationId: null,
        description: `System role: ${name}`,
        isSystem: true,
        permissions: [...SYSTEM_ROLE_PERMISSIONS[name]],
        createdAt: now, updatedAt: now,
      });
    }
  }

  async findSystemRoles(): Promise<RoleDefinition[]> {
    return Array.from(this.roles.values()).filter(r => r.isSystem);
  }

  async findByName(name: string, orgId: string | null): Promise<RoleDefinition | null> {
    for (const role of this.roles.values()) {
      if (role.name === name && role.organizationId === orgId) return role;
    }
    return null;
  }

  async findById(id: string): Promise<RoleDefinition | null> {
    return this.roles.get(id) ?? null;
  }

  async createCustomRole(name: string, orgId: string, description: string, permissions: string[]): Promise<RoleDefinition> {
    const id = this.idGen();
    const now = this.clock();
    const role: RoleDefinition = {
      roleId: id, name, organizationId: orgId, description,
      isSystem: false, permissions, createdAt: now, updatedAt: now,
    };
    this.roles.set(id, role);
    return role;
  }

  async listByOrganization(orgId: string): Promise<RoleDefinition[]> {
    const system = await this.findSystemRoles();
    const custom = Array.from(this.roles.values()).filter(r => r.organizationId === orgId);
    return [...system, ...custom];
  }
}

export class InMemoryUserRoleRepository implements IUserRoleRepository {
  private assignments = new Map<string, { userId: string; orgId: string; roleId: string; roleName: string; assignedBy: string }>();

  constructor(private roleRepo: InMemoryRoleRepository) {}

  async assign(userId: string, orgId: string, roleId: string, assignedBy: string): Promise<void> {
    const role = await this.roleRepo.findById(roleId);
    if (!role) throw new Error(`Role ${roleId} not found`);
    const key = `${userId}:${orgId}:${roleId}`;
    this.assignments.set(key, { userId, orgId, roleId, roleName: role.name, assignedBy });
  }

  async revoke(userId: string, orgId: string, roleId: string): Promise<void> {
    this.assignments.delete(`${userId}:${orgId}:${roleId}`);
  }

  async listByUserAndOrg(userId: string, orgId: string): Promise<{ roleId: string; roleName: string }[]> {
    const result: { roleId: string; roleName: string }[] = [];
    for (const a of this.assignments.values()) {
      if (a.userId === userId && a.orgId === orgId) result.push({ roleId: a.roleId, roleName: a.roleName });
    }
    return result;
  }

  async listByOrganization(orgId: string): Promise<{ userId: string; roleId: string; roleName: string }[]> {
    const result: { userId: string; roleId: string; roleName: string }[] = [];
    for (const a of this.assignments.values()) {
      if (a.orgId === orgId) result.push({ userId: a.userId, roleId: a.roleId, roleName: a.roleName });
    }
    return result;
  }
}

export class InMemoryApiKeyRepository implements IApiKeyRepository {
  private keys = new Map<string, ApiKey>();
  private keysByHash = new Map<string, ApiKey>();
  private idGen: () => string;
  private clock: () => string;

  constructor(idGen: () => string, clock: () => string) {
    this.idGen = idGen;
    this.clock = clock;
  }

  async create(orgId: string, name: string, keyPreview: string, keyHash: string, scopes: ApiKeyScope[], createdBy: string, expiresAt: string | null): Promise<ApiKey> {
    const id = this.idGen();
    const now = this.clock();
    const apiKey: ApiKey = {
      apiKeyId: id, organizationId: orgId, name, keyPreview, keyHash,
      scopes, createdBy, expiresAt, revokedAt: null, lastUsedAt: null, createdAt: now,
    };
    this.keys.set(id, apiKey);
    this.keysByHash.set(keyHash, apiKey);
    return apiKey;
  }

  async findById(id: string): Promise<ApiKey | null> {
    return this.keys.get(id) ?? null;
  }

  async findByHash(hash: string): Promise<ApiKey | null> {
    return this.keysByHash.get(hash) ?? null;
  }

  async listByOrganization(orgId: string): Promise<ApiKey[]> {
    return Array.from(this.keys.values()).filter(k => k.organizationId === orgId);
  }

  async revoke(id: string): Promise<void> {
    const key = this.keys.get(id);
    if (key) {
      const revoked = { ...key, revokedAt: this.clock() };
      this.keys.set(id, revoked);
      this.keysByHash.delete(key.keyHash);
    }
  }

  async updateLastUsed(id: string): Promise<void> {
    const key = this.keys.get(id);
    if (key) {
      this.keys.set(id, { ...key, lastUsedAt: this.clock() });
    }
  }
}

export class InMemorySessionRepository implements ISessionRepository {
  private sessions = new Map<string, Session>();
  private sessionsByHash = new Map<string, Session>();
  private idGen: () => string;
  private clock: () => string;

  constructor(idGen: () => string, clock: () => string) {
    this.idGen = idGen;
    this.clock = clock;
  }

  async create(userId: string, orgId: string | null, tokenHash: string, ip: string | null, ua: string | null, expiresAt: string): Promise<Session> {
    const id = this.idGen();
    const now = this.clock();
    const session: Session = {
      sessionId: id, userId, organizationId: orgId, tokenHash,
      ipAddress: ip, userAgent: ua, expiresAt, createdAt: now, invalidatedAt: null,
    };
    this.sessions.set(id, session);
    this.sessionsByHash.set(tokenHash, session);
    return session;
  }

  async findByTokenHash(tokenHash: string): Promise<Session | null> {
    return this.sessionsByHash.get(tokenHash) ?? null;
  }

  async findById(id: string): Promise<Session | null> {
    return this.sessions.get(id) ?? null;
  }

  async listByUser(userId: string): Promise<Session[]> {
    return Array.from(this.sessions.values()).filter(s => s.userId === userId && s.invalidatedAt === null);
  }

  async invalidate(id: string): Promise<void> {
    const session = this.sessions.get(id);
    if (session) {
      const invalidated = { ...session, invalidatedAt: this.clock() };
      this.sessions.set(id, invalidated);
      this.sessionsByHash.delete(session.tokenHash);
    }
  }

  async invalidateAllForUser(userId: string): Promise<void> {
    for (const [id, session] of this.sessions) {
      if (session.userId === userId && session.invalidatedAt === null) {
        await this.invalidate(id);
      }
    }
  }

  async deleteExpired(): Promise<number> {
    const now = new Date(this.clock()).getTime();
    let count = 0;
    for (const [id, session] of this.sessions) {
      if (new Date(session.expiresAt).getTime() < now) {
        this.sessions.delete(id);
        this.sessionsByHash.delete(session.tokenHash);
        count++;
      }
    }
    return count;
  }
}

export class InMemoryInvitationRepository implements IInvitationRepository {
  private invitations = new Map<string, Invitation>();
  private invitationsByHash = new Map<string, Invitation>();
  private idGen: () => string;
  private clock: () => string;

  constructor(idGen: () => string, clock: () => string) {
    this.idGen = idGen;
    this.clock = clock;
  }

  async create(orgId: string, email: string, invitedBy: string, roleName: string, tokenHash: string, expiresAt: string): Promise<Invitation> {
    const id = this.idGen();
    const now = this.clock();
    const invitation: Invitation = {
      invitationId: id, organizationId: orgId, email, invitedBy, roleName,
      status: 'PENDING', expiresAt, acceptedAt: null, acceptedBy: null, createdAt: now,
    };
    this.invitations.set(id, invitation);
    this.invitationsByHash.set(tokenHash, invitation);
    return invitation;
  }

  async findById(id: string): Promise<Invitation | null> {
    return this.invitations.get(id) ?? null;
  }

  async findByTokenHash(tokenHash: string): Promise<Invitation | null> {
    return this.invitationsByHash.get(tokenHash) ?? null;
  }

  async findByEmail(email: string): Promise<Invitation[]> {
    return Array.from(this.invitations.values()).filter(i => i.email === email);
  }

  async listByOrganization(orgId: string): Promise<Invitation[]> {
    return Array.from(this.invitations.values()).filter(i => i.organizationId === orgId);
  }

  async accept(id: string, acceptedBy: string): Promise<void> {
    const inv = this.invitations.get(id);
    if (inv) {
      const now = this.clock();
      this.invitations.set(id, { ...inv, status: 'ACCEPTED', acceptedAt: now, acceptedBy });
    }
  }

  async revoke(id: string): Promise<void> {
    const inv = this.invitations.get(id);
    if (inv) this.invitations.set(id, { ...inv, status: 'REVOKED' });
  }

  async expire(id: string): Promise<void> {
    const inv = this.invitations.get(id);
    if (inv) this.invitations.set(id, { ...inv, status: 'EXPIRED' });
  }
}

export class InMemoryLoginAttemptRepository implements ILoginAttemptRepository {
  private attempts: { email: string; userId: string | null; ip: string | null; success: boolean; timestamp: number }[] = [];
  private clock: () => string;

  constructor(clock: () => string) {
    this.clock = clock;
  }

  async record(email: string, userId: string | null, ip: string | null, success: boolean): Promise<void> {
    this.attempts.push({ email, userId, ip, success, timestamp: new Date(this.clock()).getTime() });
  }

  async countRecentFailures(email: string, sinceMs: number): Promise<number> {
    const now = new Date(this.clock()).getTime();
    return this.attempts.filter(a => a.email === email && !a.success && a.timestamp > now - sinceMs).length;
  }
}
