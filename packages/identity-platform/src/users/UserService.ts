import type { User, CreateUserRequest, UpdateUserRequest } from '../users/UserModels';
import { isUserActive, MAX_FAILED_LOGINS } from '../users/UserModels';
import type { IUserRepository } from '../repositories/RepositoryInterfaces';
import type { IPasswordHasher } from '../adapters/SecurityAdapters';
import { UserNotFoundError, UserAlreadyExistsError, UserLockedError } from '../adapters/IdentityErrors';

export class UserService {
  constructor(
    private readonly repo: IUserRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly idGen: () => string,
    private readonly clock: () => string,
  ) {}

  async create(request: CreateUserRequest): Promise<User> {
    const existing = await this.repo.findByEmail(request.email, request.organizationId);
    if (existing) {
      throw new UserAlreadyExistsError(`User with email ${request.email} already exists in this organization`);
    }

    const now = this.clock();
    const id = this.idGen();
    const user: User = {
      id,
      version: 1,
      createdAt: now,
      updatedAt: now,
      metadata: request.metadata ?? {},
      organizationId: request.organizationId,
      email: request.email,
      displayName: request.displayName,
      status: 'ACTIVE',
      passwordHash: this.passwordHasher.hash(request.password),
      roleIds: request.roleIds ?? [],
      failedLoginCount: 0,
      lockedUntil: null,
      lastLoginAt: null,
      preferences: { language: 'en', timezone: 'UTC', notifications: true },
      mfaEnabled: false,
    };
    return this.repo.create(user);
  }

  async findById(id: string): Promise<User> {
    const user = await this.repo.findById(id);
    if (!user) throw new UserNotFoundError(`User not found: ${id}`);
    return user;
  }

  async findByEmail(email: string, organizationId: string): Promise<User | null> {
    return this.repo.findByEmail(email, organizationId);
  }

  async findByOrganization(organizationId: string): Promise<User[]> {
    const result = await this.repo.findByOrganization(organizationId);
    return result.items;
  }

  async update(id: string, updates: UpdateUserRequest): Promise<User> {
    const user = await this.findById(id);
    const updated: User = {
      ...user,
      ...updates,
      version: user.version + 1,
      updatedAt: this.clock(),
    };
    return this.repo.update(updated);
  }

  async delete(id: string): Promise<boolean> {
    return this.repo.delete(id);
  }

  async assignRole(userId: string, roleId: string): Promise<User> {
    const user = await this.findById(userId);
    if (user.roleIds.includes(roleId)) return user;
    return this.update(user.id, { roleIds: [...user.roleIds, roleId] });
  }

  async revokeRole(userId: string, roleId: string): Promise<User> {
    const user = await this.findById(userId);
    return this.update(user.id, { roleIds: user.roleIds.filter((r) => r !== roleId) });
  }

  async recordFailedLogin(userId: string): Promise<User> {
    const user = await this.findById(userId);
    const newCount = user.failedLoginCount + 1;
    const shouldLock = newCount >= MAX_FAILED_LOGINS;
    return this.update(user.id, {
      failedLoginCount: newCount,
      lockedUntil: shouldLock ? this.clock() : user.lockedUntil,
    });
  }

  async recordSuccessfulLogin(userId: string): Promise<User> {
    const user = await this.findById(userId);
    return this.update(user.id, {
      failedLoginCount: 0,
      lockedUntil: null,
      lastLoginAt: this.clock(),
    });
  }

  async assertActive(userId: string): Promise<User> {
    const user = await this.findById(userId);
    if (!isUserActive(user)) {
      throw new UserLockedError(`User ${userId} is not active (status: ${user.status})`);
    }
    return user;
  }

  async verifyPassword(userId: string, password: string): Promise<boolean> {
    const user = await this.findById(userId);
    if (!user.passwordHash) return false;
    return this.passwordHasher.verify(password, user.passwordHash);
  }
}
