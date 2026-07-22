// ─── Repository interfaces ──────────────────────────────────────────────────────
// All repositories are async and replaceable. In-memory implementations for testing.

import type { Organization } from '../organizations/OrganizationModels';
import type { UserProfile, User, Invitation, UserStatus } from '../users/UserModels';
import type { ApiKey, ApiKeyScope } from '../api-keys/ApiKeyModels';
import type { Session } from '../sessions/SessionModels';
import type { RoleDefinition } from '../roles/Roles';

export interface IOrganizationRepository {
  create(name: string, slug: string, plan: string): Promise<Organization>;
  findById(id: string): Promise<Organization | null>;
  findBySlug(slug: string): Promise<Organization | null>;
  list(): Promise<Organization[]>;
  listByMember(userId: string): Promise<Organization[]>;
  update(id: string, updates: Partial<Pick<Organization, 'name' | 'plan' | 'settings' | 'limits' | 'logoUrl'>>): Promise<Organization>;
  updateStatus(id: string, status: string): Promise<Organization>;
  softDelete(id: string): Promise<void>;
}

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  listByOrganization(orgId: string): Promise<User[]>;
  createProfile(userId: string, email: string, fullName: string): Promise<UserProfile>;
  updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile>;
  updateStatus(userId: string, status: UserStatus): Promise<UserProfile>;
  recordFailedLogin(userId: string): Promise<void>;
  resetFailedLogins(userId: string): Promise<void>;
  lockAccount(userId: string, until: string): Promise<void>;
}

export interface IRoleRepository {
  findSystemRoles(): Promise<RoleDefinition[]>;
  findByName(name: string, orgId: string | null): Promise<RoleDefinition | null>;
  findById(id: string): Promise<RoleDefinition | null>;
  createCustomRole(name: string, orgId: string, description: string, permissions: string[]): Promise<RoleDefinition>;
  listByOrganization(orgId: string): Promise<RoleDefinition[]>;
}

export interface IUserRoleRepository {
  assign(userId: string, orgId: string, roleId: string, assignedBy: string): Promise<void>;
  revoke(userId: string, orgId: string, roleId: string): Promise<void>;
  listByUserAndOrg(userId: string, orgId: string): Promise<{ roleId: string; roleName: string }[]>;
  listByOrganization(orgId: string): Promise<{ userId: string; roleId: string; roleName: string }[]>;
}

export interface IApiKeyRepository {
  create(orgId: string, name: string, keyPreview: string, keyHash: string, scopes: ApiKeyScope[], createdBy: string, expiresAt: string | null): Promise<ApiKey>;
  findById(id: string): Promise<ApiKey | null>;
  findByHash(hash: string): Promise<ApiKey | null>;
  listByOrganization(orgId: string): Promise<ApiKey[]>;
  revoke(id: string): Promise<void>;
  updateLastUsed(id: string): Promise<void>;
}

export interface ISessionRepository {
  create(userId: string, orgId: string | null, tokenHash: string, ip: string | null, ua: string | null, expiresAt: string): Promise<Session>;
  findByTokenHash(tokenHash: string): Promise<Session | null>;
  findById(id: string): Promise<Session | null>;
  listByUser(userId: string): Promise<Session[]>;
  invalidate(id: string): Promise<void>;
  invalidateAllForUser(userId: string): Promise<void>;
  deleteExpired(): Promise<number>;
}

export interface IInvitationRepository {
  create(orgId: string, email: string, invitedBy: string, roleName: string, tokenHash: string, expiresAt: string): Promise<Invitation>;
  findById(id: string): Promise<Invitation | null>;
  findByTokenHash(tokenHash: string): Promise<Invitation | null>;
  findByEmail(email: string): Promise<Invitation[]>;
  listByOrganization(orgId: string): Promise<Invitation[]>;
  accept(id: string, acceptedBy: string): Promise<void>;
  revoke(id: string): Promise<void>;
  expire(id: string): Promise<void>;
}

export interface ILoginAttemptRepository {
  record(email: string, userId: string | null, ip: string | null, success: boolean): Promise<void>;
  countRecentFailures(email: string, sinceMs: number): Promise<number>;
}
