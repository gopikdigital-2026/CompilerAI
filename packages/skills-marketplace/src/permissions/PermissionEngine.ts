import type {
  PermissionAccess,
  PermissionResource,
  SkillPermission,
  SkillManifest,
  IPermissionEngine,
  PermissionValidationResult,
} from '../models.js';

export class PermissionEngine implements IPermissionEngine {
  validate(manifest: SkillManifest, granted: SkillPermission[]): PermissionValidationResult {
    const missing = this.getMissingPermissions(manifest, granted);
    return {
      valid: missing.length === 0,
      missing,
      granted,
    };
  }

  checkAccess(resource: PermissionResource, access: PermissionAccess, granted: SkillPermission[]): boolean {
    for (const perm of granted) {
      if (perm.resource === resource && perm.access.includes(access)) {
        return true;
      }
    }
    return false;
  }

  getRequiredPermissions(manifest: SkillManifest): SkillPermission[] {
    return [...manifest.permissions];
  }

  getMissingPermissions(manifest: SkillManifest, granted: SkillPermission[]): SkillPermission[] {
    const missing: SkillPermission[] = [];
    for (const req of manifest.permissions) {
      const hasAll = req.access.every((access) =>
        granted.some((g) => g.resource === req.resource && g.access.includes(access)),
      );
      if (!hasAll) {
        missing.push(req);
      }
    }
    return missing;
  }

  summarizePermissions(permissions: SkillPermission[]): string {
    return permissions.map((p) => `${p.resource}: [${p.access.join(', ')}]`).join('; ');
  }
}
