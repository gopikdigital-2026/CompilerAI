import type { Permission } from './PermissionModels';
import { SYSTEM_PERMISSIONS, formatPermission, PermissionSet } from './PermissionModels';
import type { IPermissionRepository } from '../repositories/RepositoryInterfaces';
import { PermissionNotFoundError } from '../adapters/IdentityErrors';

export class PermissionService {
  constructor(
    private readonly repo: IPermissionRepository,
    private readonly idGen: () => string,
    private readonly clock: () => string,
  ) {}

  async create(resource: string, action: Permission['action'], description: string): Promise<Permission> {
    const now = this.clock();
    const perm: Permission = {
      id: this.idGen(),
      version: 1,
      createdAt: now,
      updatedAt: now,
      metadata: {},
      resource,
      action,
      description,
      isSystem: false,
    };
    return this.repo.create(perm);
  }

  async findById(id: string): Promise<Permission> {
    const perm = await this.repo.findById(id);
    if (!perm) throw new PermissionNotFoundError(`Permission not found: ${id}`);
    return perm;
  }

  async findByKey(key: string): Promise<Permission | null> {
    return this.repo.findByKey(key);
  }

  async list(): Promise<Permission[]> {
    return this.repo.list();
  }

  async seedSystemPermissions(): Promise<Permission[]> {
    const existing = await this.repo.list();
    if (existing.length > 0) return existing;

    const now = this.clock();
    const perms: Permission[] = [];
    for (const def of SYSTEM_PERMISSIONS) {
      const perm: Permission = {
        id: this.idGen(),
        version: 1,
        createdAt: now,
        updatedAt: now,
        metadata: {},
        resource: def.resource,
        action: def.action,
        description: def.description,
        isSystem: def.isSystem,
      };
      perms.push(await this.repo.create(perm));
    }
    return perms;
  }

  buildPermissionSet(permissionIds: string[]): PermissionSet {
    return new PermissionSet(permissionIds);
  }

  formatKey(resource: string, action: Permission['action']): string {
    return formatPermission(resource, action);
  }
}
