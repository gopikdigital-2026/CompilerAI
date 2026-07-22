// ─── Role-permission resolver ───────────────────────────────────────────────────
// Implements IRolePermissionResolver by querying user roles and their permissions.

import type { IRolePermissionResolver } from '../authorization/AuthorizationInterfaces';
import type { IUserRoleRepository, IRoleRepository } from '../repositories/RepositoryInterfaces';
import { SYSTEM_ROLE_PERMISSIONS, isSystemRole } from '../roles/Roles';

export class RolePermissionResolver implements IRolePermissionResolver {
  constructor(
    private userRoleRepo: IUserRoleRepository,
    private roleRepo: IRoleRepository,
  ) {}

  async resolvePermissions(actorId: string, organizationId: string): Promise<string[]> {
    const roleAssignments = await this.userRoleRepo.listByUserAndOrg(actorId, organizationId);
    const permSet = new Set<string>();
    for (const assignment of roleAssignments) {
      if (isSystemRole(assignment.roleName)) {
        SYSTEM_ROLE_PERMISSIONS[assignment.roleName as keyof typeof SYSTEM_ROLE_PERMISSIONS].forEach(p => permSet.add(p));
      } else {
        const role = await this.roleRepo.findById(assignment.roleId);
        if (role) role.permissions.forEach(p => permSet.add(p));
      }
    }
    return Array.from(permSet).sort();
  }

  async resolveRoles(actorId: string, organizationId: string): Promise<string[]> {
    const assignments = await this.userRoleRepo.listByUserAndOrg(actorId, organizationId);
    return assignments.map(a => a.roleName);
  }
}
