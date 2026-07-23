import type { Role } from './RoleModels';
import { SYSTEM_ROLES, isSystemRole } from './RoleModels';
import type { IRoleRepository } from '../repositories/RepositoryInterfaces';
import { RoleNotFoundError, PrivilegeEscalationError } from '../adapters/IdentityErrors';

export interface CreateRoleRequest {
  name: string;
  description: string;
  organizationId: string;
  permissionIds: string[];
  parentRoleId?: string;
}

export class RoleService {
  constructor(
    private readonly repo: IRoleRepository,
    private readonly idGen: () => string,
    private readonly clock: () => string,
  ) {}

  async create(request: CreateRoleRequest, creatorRoleNames: string[] = []): Promise<Role> {
    const canManagePrivileged = creatorRoleNames.includes('PlatformAdmin');
    if (request.name === 'PlatformAdmin' && !canManagePrivileged) {
      throw new PrivilegeEscalationError('Only PlatformAdmin can create PlatformAdmin role');
    }

    const now = this.clock();
    const id = this.idGen();
    const role: Role = {
      id,
      version: 1,
      createdAt: now,
      updatedAt: now,
      metadata: {},
      organizationId: request.organizationId,
      name: request.name,
      description: request.description,
      type: 'CUSTOM',
      permissionIds: request.permissionIds,
      parentRoleId: request.parentRoleId ?? null,
      isSystem: false,
    };
    return this.repo.create(role);
  }

  async findById(id: string): Promise<Role> {
    const role = await this.repo.findById(id);
    if (!role) throw new RoleNotFoundError(`Role not found: ${id}`);
    return role;
  }

  async findByName(name: string, organizationId: string): Promise<Role | null> {
    return this.repo.findByName(name, organizationId);
  }

  async findByOrganization(organizationId: string): Promise<Role[]> {
    return this.repo.findByOrganization(organizationId);
  }

  async update(id: string, updates: Partial<Pick<Role, 'name' | 'description' | 'permissionIds' | 'parentRoleId'>>): Promise<Role> {
    const role = await this.findById(id);
    if (role.isSystem) {
      throw new PrivilegeEscalationError(`Cannot modify system role: ${role.name}`);
    }
    const updated: Role = {
      ...role,
      ...updates,
      version: role.version + 1,
      updatedAt: this.clock(),
    };
    return this.repo.update(updated);
  }

  async delete(id: string): Promise<boolean> {
    const role = await this.findById(id);
    if (role.isSystem) {
      throw new PrivilegeEscalationError(`Cannot delete system role: ${role.name}`);
    }
    return this.repo.delete(id);
  }

  async getPermissionIds(roleIds: string[]): Promise<string[]> {
    const permissions = new Set<string>();
    for (const roleId of roleIds) {
      const role = await this.repo.findById(roleId);
      if (!role) continue;
      for (const p of role.permissionIds) permissions.add(p);
      if (role.parentRoleId) {
        const parentPerms = await this.getPermissionIds([role.parentRoleId]);
        for (const p of parentPerms) permissions.add(p);
      }
    }
    return Array.from(permissions);
  }

  async assertCanAssignRole(assignerRoleNames: string[], targetRoleName: string): Promise<void> {
    if (isSystemRole(targetRoleName) && targetRoleName === 'PlatformAdmin' && !assignerRoleNames.includes('PlatformAdmin')) {
      throw new PrivilegeEscalationError(`Only PlatformAdmin can assign PlatformAdmin role`);
    }
  }

  async seedSystemRoles(organizationId: string): Promise<Role[]> {
    const existing = await this.repo.findByOrganization(organizationId);
    if (existing.some((r) => r.isSystem)) return existing;

    const roles: Role[] = [];
    const now = this.clock();
    for (const [name, perms] of Object.entries(SYSTEM_ROLES)) {
      const role: Role = {
        id: this.idGen(),
        version: 1,
        createdAt: now,
        updatedAt: now,
        metadata: {},
        organizationId,
        name,
        description: `System role: ${name}`,
        type: 'SYSTEM',
        permissionIds: perms,
        parentRoleId: null,
        isSystem: true,
      };
      roles.push(await this.repo.create(role));
    }
    return roles;
  }
}
