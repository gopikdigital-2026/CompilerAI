import type {
  ToolManifest,
  InstalledTool,
  InstallResult,
  RuntimeCompatibility,
} from '../models/ToolManifest';
import type { IMarketplaceRepository } from './MarketplaceRepository';
import { ToolManifestValidator } from './ToolManifestValidator';
import { ToolSignatureVerifier } from './ToolSignatureVerifier';
import { ToolCompatibilityChecker } from './ToolCompatibilityChecker';
import { ToolPermissionAnalyzer } from './ToolPermissionAnalyzer';
import { ToolAlreadyInstalledError, ToolNotFoundError } from '../errors/MarketplaceErrors';

export interface InstallOptions {
  organizationId: string;
  installedBy: string;
  targetRuntime: RuntimeCompatibility;
  allowDangerousPermissions?: boolean;
  skipCompatibilityCheck?: boolean;
}

export class ToolInstaller {
  private readonly validator: ToolManifestValidator;
  private readonly signatureVerifier: ToolSignatureVerifier;
  private readonly compatibilityChecker: ToolCompatibilityChecker;
  private readonly permissionAnalyzer: ToolPermissionAnalyzer;

  constructor(private readonly repo: IMarketplaceRepository) {
    this.validator = new ToolManifestValidator();
    this.signatureVerifier = new ToolSignatureVerifier();
    this.compatibilityChecker = new ToolCompatibilityChecker(repo);
    this.permissionAnalyzer = new ToolPermissionAnalyzer();
  }

  install(manifest: ToolManifest, options: InstallOptions): InstallResult {
    try {
      const existing = this.repo.getInstalledTool(manifest.id, options.organizationId);
      if (existing) {
        throw new ToolAlreadyInstalledError(
          `Tool ${manifest.id} v${existing.version} is already installed for organization ${options.organizationId}`,
        );
      }

      const validation = this.validator.validate(manifest);
      if (!validation.valid) {
        return {
          success: false,
          installedTool: null,
          error: `Manifest validation failed: ${validation.errors.join('; ')}`,
        };
      }

      const sigResult = this.signatureVerifier.verify(manifest);
      if (!sigResult.valid) {
        return {
          success: false,
          installedTool: null,
          error: `Signature verification failed: ${sigResult.reason}`,
        };
      }

      if (!options.skipCompatibilityCheck) {
        const installedManifests = this.repo
          .getInstalledTools(options.organizationId)
          .map((t) => t.manifest);
        const compat = this.compatibilityChecker.check(
          manifest,
          options.targetRuntime,
          installedManifests,
        );
        if (!compat.compatible) {
          return {
            success: false,
            installedTool: null,
            error: `Compatibility check failed: ${compat.errors.join('; ')}`,
          };
        }
      }

      const permAnalysis = this.permissionAnalyzer.analyze(manifest);
      if (!permAnalysis.allowed) {
        return {
          success: false,
          installedTool: null,
          error: `Permission denied: ${permAnalysis.warnings.join('; ')}`,
        };
      }

      if (
        permAnalysis.dangerousPermissions.length > 0 &&
        !options.allowDangerousPermissions
      ) {
        return {
          success: false,
          installedTool: null,
          error: `Tool requests dangerous permissions (${permAnalysis.dangerousPermissions.join(', ')}) — set allowDangerousPermissions to confirm`,
        };
      }

      const installed: InstalledTool = {
        id: manifest.id,
        version: manifest.version,
        organizationId: options.organizationId,
        installedAt: new Date().toISOString(),
        installedBy: options.installedBy,
        manifest,
      };

      this.repo.installTool(installed);
      this.repo.recordAudit({
        id: `audit_${Date.now()}_${manifest.id}`,
        toolId: manifest.id,
        toolVersion: manifest.version,
        organizationId: options.organizationId,
        action: 'install',
        previousVersion: null,
        newVersion: manifest.version,
        performedBy: options.installedBy,
        timestamp: new Date().toISOString(),
        success: true,
        reason: 'Tool installed successfully',
      });

      return { success: true, installedTool: installed, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.repo.recordAudit({
        id: `audit_${Date.now()}_${manifest.id}_fail`,
        toolId: manifest.id,
        toolVersion: manifest.version,
        organizationId: options.organizationId,
        action: 'install',
        previousVersion: null,
        newVersion: manifest.version,
        performedBy: options.installedBy,
        timestamp: new Date().toISOString(),
        success: false,
        reason: message,
      });
      return { success: false, installedTool: null, error: message };
    }
  }

  installFromRegistry(
    toolId: string,
    options: InstallOptions,
  ): InstallResult {
    const manifest = this.repo.getTool(toolId);
    if (!manifest) {
      throw new ToolNotFoundError(`Tool not found in registry: ${toolId}`);
    }
    return this.install(manifest, options);
  }
}
