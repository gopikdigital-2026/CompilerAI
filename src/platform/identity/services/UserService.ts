// ─── User service ───────────────────────────────────────────────────────────────

import type { IUserRepository, IUserRoleRepository, IInvitationRepository, ILoginAttemptRepository, IRoleRepository } from '../repositories/RepositoryInterfaces';
import type { UserProfile, User } from '../users/UserModels';
import {
  AccountSuspendedError, AccountDisabledError,
  InvitationExpiredError, InvitationRevokedError,
} from '../errors/IdentityErrors';
import { sha256Hex } from '../auth/PasswordHasher';

const MAX_FAILED_LOGINS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

export class UserService {
  constructor(
    private userRepo: IUserRepository,
    private roleRepo: IRoleRepository,
    private userRoleRepo: IUserRoleRepository,
    private invitationRepo: IInvitationRepository,
    private loginAttemptRepo: ILoginAttemptRepository,
    private clock: () => string,
    private idGen: () => string,
  ) {}

  async createUser(userId: string, email: string, fullName: string): Promise<UserProfile> {
    return this.userRepo.createProfile(userId, email, fullName);
  }

  async inviteUser(orgId: string, email: string, invitedBy: string, roleName: string, expiresInSeconds = 7 * 24 * 60 * 60): Promise<{ invitationId: string; token: string }> {
    const token = `inv_${this.idGen()}_${Date.now().toString(36)}`;
    const tokenHash = await sha256Hex(token);
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();
    const invitation = await this.invitationRepo.create(orgId, email, invitedBy, roleName, tokenHash, expiresAt);
    return { invitationId: invitation.invitationId, token };
  }

  async acceptInvitation(invitationToken: string, userId: string): Promise<void> {
    const tokenHash = await sha256Hex(invitationToken);
    const invitation = await this.invitationRepo.findByTokenHash(tokenHash);
    if (!invitation) throw new InvitationExpiredError('Invitation not found');
    if (invitation.status === 'EXPIRED') throw new InvitationExpiredError();
    if (invitation.status === 'REVOKED') throw new InvitationRevokedError();
    if (new Date(invitation.expiresAt).getTime() < new Date(this.clock()).getTime()) {
      throw new InvitationExpiredError();
    }
    let role = await this.roleRepo.findByName(invitation.roleName, invitation.organizationId);
    if (!role) role = await this.roleRepo.findByName(invitation.roleName, null);
    if (!role) throw new Error(`Role ${invitation.roleName} not found`);
    await this.userRoleRepo.assign(userId, invitation.organizationId, role.roleId, invitation.invitedBy);
    await this.invitationRepo.accept(invitation.invitationId, userId);
  }

  async suspendUser(userId: string): Promise<UserProfile> {
    return this.userRepo.updateStatus(userId, 'SUSPENDED');
  }

  async activateUser(userId: string): Promise<UserProfile> {
    return this.userRepo.updateStatus(userId, 'ACTIVE');
  }

  async disableUser(userId: string): Promise<UserProfile> {
    return this.userRepo.updateStatus(userId, 'DISABLED');
  }

  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    return this.userRepo.updateProfile(userId, updates);
  }

  async getUser(userId: string): Promise<User | null> {
    return this.userRepo.findById(userId);
  }

  async assertUserActive(userId: string): Promise<void> {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new Error(`User ${userId} not found`);
    if (user.profile.status === 'SUSPENDED') throw new AccountSuspendedError();
    if (user.profile.status === 'DISABLED') throw new AccountDisabledError();
  }

  async recordLoginAttempt(email: string, userId: string | null, ip: string | null, success: boolean): Promise<void> {
    await this.loginAttemptRepo.record(email, userId, ip, success);
    if (!success && userId) {
      const failures = await this.loginAttemptRepo.countRecentFailures(email, 60 * 60 * 1000);
      if (failures >= MAX_FAILED_LOGINS) {
        const lockedUntil = new Date(Date.now() + LOCK_DURATION_MS).toISOString();
        await this.userRepo.lockAccount(userId, lockedUntil);
      }
    } else if (success && userId) {
      await this.userRepo.resetFailedLogins(userId);
    }
  }

  async isAccountLocked(userId: string): Promise<boolean> {
    const user = await this.userRepo.findById(userId);
    if (!user || !user.lockedUntil) return false;
    return new Date(user.lockedUntil).getTime() > new Date(this.clock()).getTime();
  }
}
