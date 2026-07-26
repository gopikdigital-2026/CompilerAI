import type {
  InstallResult,
  ISkillRegistry,
  IPermissionEngine,
  ILifecycleManager,
  ITelemetryEngine,
  SkillPermission,
  UninstallResult,
  UpdateResult,
} from '../models.js';

export class SkillInstaller {
  private readonly registry: ISkillRegistry;
  private readonly permissions: IPermissionEngine;
  private readonly lifecycle: ILifecycleManager;
  private readonly telemetry: ITelemetryEngine;

  constructor(
    registry: ISkillRegistry,
    permissions: IPermissionEngine,
    lifecycle: ILifecycleManager,
    telemetry: ITelemetryEngine,
  ) {
    this.registry = registry;
    this.permissions = permissions;
    this.lifecycle = lifecycle;
    this.telemetry = telemetry;
  }

  install(skillId: string, grantedPermissions: SkillPermission[] = []): InstallResult {
    const record = this.registry.get(skillId);
    if (!record) {
      return { skillId, success: false, installedVersion: '', dependenciesInstalled: [], errors: [`Skill '${skillId}' not found in registry`] };
    }

    const errors: string[] = [];
    const dependenciesInstalled: string[] = [];

    // Check permissions
    const permResult = this.permissions.validate(record.manifest, grantedPermissions);
    if (!permResult.valid) {
      const missing = permResult.missing.map((p) => `${p.resource}: [${p.access.join(', ')}]`);
      errors.push(`Missing permissions: ${missing.join('; ')}`);
      this.telemetry.emit({
        type: 'permission.denied',
        timestamp: new Date().toISOString(),
        skillId,
        metadata: { missingPermissions: missing },
      });
      return { skillId, success: false, installedVersion: record.manifest.version, dependenciesInstalled, errors };
    }

    // Check dependencies
    for (const dep of record.manifest.dependencies) {
      const depRecord = this.registry.get(dep.skillId);
      if (!depRecord && !dep.optional) {
        errors.push(`Required dependency '${dep.skillId}' not found`);
      } else if (depRecord && depRecord.status !== 'installed' && !dep.optional) {
        // Auto-install required dependency
        const depResult = this.install(dep.skillId, grantedPermissions);
        if (depResult.success) {
          dependenciesInstalled.push(dep.skillId);
        } else {
          errors.push(`Failed to install dependency '${dep.skillId}': ${depResult.errors.join(', ')}`);
        }
      }
    }

    if (errors.length > 0) {
      return { skillId, success: false, installedVersion: record.manifest.version, dependenciesInstalled, errors };
    }

    // Install the skill
    this.registry.updateStatus(skillId, 'installed');
    this.registry.incrementInstallCount(skillId);

    this.lifecycle.recordEvent({
      type: 'install',
      skillId,
      version: record.manifest.version,
      timestamp: new Date().toISOString(),
      metadata: { dependenciesInstalled },
    });

    this.telemetry.emit({
      type: 'skill.installed',
      timestamp: new Date().toISOString(),
      skillId,
      metadata: { version: record.manifest.version, dependenciesInstalled },
    });

    return {
      skillId,
      success: true,
      installedVersion: record.manifest.version,
      dependenciesInstalled,
      errors: [],
    };
  }

  uninstall(skillId: string): UninstallResult {
    const record = this.registry.get(skillId);
    if (!record) {
      return { skillId, success: false, dependenciesRemoved: [], errors: [`Skill '${skillId}' not found`] };
    }

    // Check if other skills depend on this one
    const dependents = this.registry.list().filter((r) =>
      r.manifest.dependencies.some((d) => d.skillId === skillId) && r.status === 'installed',
    );

    const errors: string[] = [];
    const dependenciesRemoved: string[] = [];

    if (dependents.length > 0) {
      errors.push(`Cannot uninstall: ${dependents.length} skill(s) depend on this: ${dependents.map((d) => d.manifest.id).join(', ')}`);
      return { skillId, success: false, dependenciesRemoved, errors };
    }

    // Uninstall dependencies that are no longer needed
    for (const dep of record.manifest.dependencies) {
      const depRecord = this.registry.get(dep.skillId);
      if (depRecord && depRecord.status === 'installed' && !dep.optional) {
        // Check if any other skill still needs this dependency
        const stillNeeded = this.registry.list().some((r) =>
          r.manifest.id !== skillId &&
          r.status === 'installed' &&
          r.manifest.dependencies.some((d) => d.skillId === dep.skillId),
        );
        if (!stillNeeded) {
          this.registry.updateStatus(dep.skillId, 'uninstalled');
          dependenciesRemoved.push(dep.skillId);
        }
      }
    }

    this.registry.updateStatus(skillId, 'uninstalled');

    this.lifecycle.recordEvent({
      type: 'uninstall',
      skillId,
      version: record.manifest.version,
      timestamp: new Date().toISOString(),
      metadata: { dependenciesRemoved },
    });

    this.telemetry.emit({
      type: 'skill.disabled',
      timestamp: new Date().toISOString(),
      skillId,
      metadata: { reason: 'uninstalled' },
    });

    return {
      skillId,
      success: true,
      dependenciesRemoved,
      errors: [],
    };
  }

  update(skillId: string, targetVersion?: string): UpdateResult {
    const record = this.registry.get(skillId);
    if (!record) {
      return { skillId, success: false, previousVersion: '', newVersion: '', errors: [`Skill '${skillId}' not found`] };
    }

    const previousVersion = record.manifest.version;

    // Find target version in history
    let targetVersionEntry = record.versionHistory[record.versionHistory.length - 1];
    if (targetVersion) {
      const found = record.versionHistory.find((v) => v.version === targetVersion);
      if (!found) {
        return { skillId, success: false, previousVersion, newVersion: targetVersion, errors: [`Version '${targetVersion}' not found in version history`] };
      }
      targetVersionEntry = found;
    }

    if (targetVersionEntry.version === previousVersion) {
      return { skillId, success: false, previousVersion, newVersion: previousVersion, errors: ['Already at target version'] };
    }

    if (targetVersionEntry.deprecated) {
      return { skillId, success: false, previousVersion, newVersion: targetVersionEntry.version, errors: [`Version '${targetVersionEntry.version}' is deprecated`] };
    }

    // Update the manifest version
    record.manifest.version = targetVersionEntry.version;
    this.registry.updateStatus(skillId, 'installed');

    this.lifecycle.recordEvent({
      type: 'update',
      skillId,
      version: targetVersionEntry.version,
      timestamp: new Date().toISOString(),
      metadata: { previousVersion, changelog: targetVersionEntry.changelog },
    });

    this.telemetry.emit({
      type: 'skill.updated',
      timestamp: new Date().toISOString(),
      skillId,
      metadata: { previousVersion, newVersion: targetVersionEntry.version },
    });

    return {
      skillId,
      success: true,
      previousVersion,
      newVersion: targetVersionEntry.version,
      errors: [],
    };
  }

  enable(skillId: string): boolean {
    const record = this.registry.get(skillId);
    if (!record || record.status !== 'installed') return false;

    this.registry.updateStatus(skillId, 'installed');
    record.enabledAt = new Date().toISOString();

    this.lifecycle.recordEvent({
      type: 'activate',
      skillId,
      version: record.manifest.version,
      timestamp: new Date().toISOString(),
    });

    this.telemetry.emit({
      type: 'skill.enabled',
      timestamp: new Date().toISOString(),
      skillId,
      metadata: { version: record.manifest.version },
    });

    return true;
  }

  disable(skillId: string): boolean {
    const record = this.registry.get(skillId);
    if (!record || record.status !== 'installed') return false;

    this.registry.updateStatus(skillId, 'disabled');

    this.lifecycle.recordEvent({
      type: 'deactivate',
      skillId,
      version: record.manifest.version,
      timestamp: new Date().toISOString(),
    });

    this.telemetry.emit({
      type: 'skill.disabled',
      timestamp: new Date().toISOString(),
      skillId,
      metadata: { version: record.manifest.version },
    });

    return true;
  }
}
