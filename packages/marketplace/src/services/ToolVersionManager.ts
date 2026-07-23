import type { ToolManifest, ToolVersion, RollbackResult } from '../models/ToolManifest';
import type { IMarketplaceRepository } from './MarketplaceRepository';
import { ToolNotFoundError, VersionConflictError } from '../errors/MarketplaceErrors';

export class ToolVersionManager {
  constructor(private readonly repo: IMarketplaceRepository) {}

  publishVersion(manifest: ToolManifest): void {
    const existing = this.repo.getTool(manifest.id);
    if (existing) {
      const versions = this.repo.getVersions(manifest.id);
      const alreadyPublished = versions.some((v) => v.version === manifest.version);
      if (alreadyPublished) {
        throw new VersionConflictError(
          `Version ${manifest.version} of tool ${manifest.id} is already published`,
        );
      }
      if (this.compareVersions(manifest.version, existing.version) <= 0) {
        throw new VersionConflictError(
          `New version ${manifest.version} must be greater than current version ${existing.version}`,
        );
      }
    }
    this.repo.publishVersion(manifest.id, manifest);
  }

  getVersions(toolId: string): ToolVersion[] {
    const versions = this.repo.getVersions(toolId);
    if (versions.length === 0) throw new ToolNotFoundError(`No versions found for tool: ${toolId}`);
    return versions;
  }

  getLatestVersion(toolId: string): ToolVersion {
    const latest = this.repo.getLatestVersion(toolId);
    if (!latest) throw new ToolNotFoundError(`Tool not found: ${toolId}`);
    return latest;
  }

  deprecateVersion(toolId: string, version: string): void {
    const versions = this.repo.getVersions(toolId);
    const target = versions.find((v) => v.version === version);
    if (!target) {
      throw new ToolNotFoundError(`Version ${version} not found for tool: ${toolId}`);
    }
    target.deprecated = true;
  }

  rollback(
    toolId: string,
    targetVersion: string,
    organizationId: string,
    performedBy: string,
  ): RollbackResult {
    const versions = this.repo.getVersions(toolId);
    const target = versions.find((v) => v.version === targetVersion);
    if (!target) {
      return {
        success: false,
        installedTool: null,
        rolledBackTo: null,
        error: `Version ${targetVersion} not found for tool: ${toolId}`,
      };
    }

    if (target.deprecated) {
      return {
        success: false,
        installedTool: null,
        rolledBackTo: null,
        error: `Version ${targetVersion} is deprecated and cannot be used for rollback`,
      };
    }

    const installed = this.repo.getInstalledTool(toolId, organizationId);
    const previousVersion = installed?.version ?? null;

    const rolledBack: typeof installed & object = {
      id: toolId,
      version: targetVersion,
      organizationId,
      installedAt: new Date().toISOString(),
      installedBy: performedBy,
      manifest: target.manifest,
    };

    this.repo.installTool(rolledBack);
    this.repo.recordAudit({
      id: `audit_${Date.now()}_${toolId}`,
      toolId,
      toolVersion: targetVersion,
      organizationId,
      action: 'rollback',
      previousVersion,
      newVersion: targetVersion,
      performedBy,
      timestamp: new Date().toISOString(),
      success: true,
      reason: `Rolled back to version ${targetVersion}`,
    });

    return {
      success: true,
      installedTool: rolledBack,
      rolledBackTo: targetVersion,
      error: null,
    };
  }

  compareVersions(a: string, b: string): number {
    const partsA = a.split('.').map((n) => parseInt(n, 10));
    const partsB = b.split('.').map((n) => parseInt(n, 10));
    for (let i = 0; i < 3; i++) {
      const va = partsA[i] ?? 0;
      const vb = partsB[i] ?? 0;
      if (va > vb) return 1;
      if (va < vb) return -1;
    }
    return 0;
  }
}
