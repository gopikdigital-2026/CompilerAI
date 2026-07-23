import type {
  ToolManifest,
  InstalledTool,
  ToolSearchQuery,
  ToolSearchResult,
  ToolInstallationRecord,
  RuntimeCompatibility,
  InstallResult,
  UninstallResult,
  UpdateResult,
  RollbackResult,
  CompatibilityResult,
  PermissionAnalysis,
  SignatureVerificationResult,
  ValidationResult,
  ToolVersion,
} from '../models/ToolManifest';
import type { IMarketplaceRepository } from '../services/MarketplaceRepository';
import { ToolRegistry } from '../services/ToolRegistry';
import { ToolManifestValidator } from '../services/ToolManifestValidator';
import { ToolInstaller, type InstallOptions } from '../services/ToolInstaller';
import { ToolUninstaller, type UninstallOptions } from '../services/ToolUninstaller';
import { ToolVersionManager } from '../services/ToolVersionManager';
import { ToolCompatibilityChecker } from '../services/ToolCompatibilityChecker';
import { ToolPermissionAnalyzer } from '../services/ToolPermissionAnalyzer';
import { ToolSignatureVerifier } from '../services/ToolSignatureVerifier';
import { ToolSearchService } from '../services/ToolSearchService';
import { ToolNotFoundError } from '../errors/MarketplaceErrors';

export interface UpdateOptions {
  organizationId: string;
  performedBy: string;
  targetRuntime: RuntimeCompatibility;
  allowDangerousPermissions?: boolean;
}

export class MarketplaceService {
  private readonly registry: ToolRegistry;
  private readonly validator: ToolManifestValidator;
  private readonly installer: ToolInstaller;
  private readonly uninstaller: ToolUninstaller;
  private readonly versionManager: ToolVersionManager;
  private readonly compatibilityChecker: ToolCompatibilityChecker;
  private readonly permissionAnalyzer: ToolPermissionAnalyzer;
  private readonly signatureVerifier: ToolSignatureVerifier;
  private readonly searchService: ToolSearchService;

  constructor(private readonly repo: IMarketplaceRepository) {
    this.registry = new ToolRegistry(repo);
    this.validator = new ToolManifestValidator();
    this.installer = new ToolInstaller(repo);
    this.uninstaller = new ToolUninstaller(repo);
    this.versionManager = new ToolVersionManager(repo);
    this.compatibilityChecker = new ToolCompatibilityChecker(repo);
    this.permissionAnalyzer = new ToolPermissionAnalyzer();
    this.signatureVerifier = new ToolSignatureVerifier();
    this.searchService = new ToolSearchService(repo);
  }

  list(): ToolManifest[] {
    return this.registry.list();
  }

  search(query: ToolSearchQuery): ToolSearchResult[] {
    return this.searchService.search(query);
  }

  getDetail(toolId: string): ToolManifest {
    return this.registry.get(toolId);
  }

  getVersions(toolId: string): ToolVersion[] {
    return this.versionManager.getVersions(toolId);
  }

  install(manifest: ToolManifest, options: InstallOptions): InstallResult {
    return this.installer.install(manifest, options);
  }

  installFromRegistry(toolId: string, options: InstallOptions): InstallResult {
    return this.installer.installFromRegistry(toolId, options);
  }

  update(toolId: string, options: UpdateOptions): UpdateResult {
    const installed = this.repo.getInstalledTool(toolId, options.organizationId);
    if (!installed) {
      return {
        success: false,
        installedTool: null,
        previousVersion: null,
        error: `Tool ${toolId} is not installed for organization ${options.organizationId}`,
      };
    }

    const latest = this.repo.getLatestVersion(toolId);
    if (!latest) {
      return {
        success: false,
        installedTool: null,
        previousVersion: installed.version,
        error: `No versions found for tool: ${toolId}`,
      };
    }

    if (latest.version === installed.version) {
      return {
        success: false,
        installedTool: installed,
        previousVersion: installed.version,
        error: `Tool ${toolId} is already at version ${installed.version}`,
      };
    }

    this.repo.removeInstalledTool(toolId, options.organizationId);

    const installResult = this.installer.install(latest.manifest, {
      organizationId: options.organizationId,
      installedBy: options.performedBy,
      targetRuntime: options.targetRuntime,
      allowDangerousPermissions: options.allowDangerousPermissions,
    });

    if (!installResult.success) {
      return {
        success: false,
        installedTool: null,
        previousVersion: installed.version,
        error: installResult.error,
      };
    }

    const previousVersion = installed.version;
    this.repo.recordAudit({
      id: `audit_${Date.now()}_${toolId}_update`,
      toolId,
      toolVersion: latest.version,
      organizationId: options.organizationId,
      action: 'update',
      previousVersion,
      newVersion: latest.version,
      performedBy: options.performedBy,
      timestamp: new Date().toISOString(),
      success: true,
      reason: `Updated from v${previousVersion} to v${latest.version}`,
    });

    return {
      success: true,
      installedTool: installResult.installedTool,
      previousVersion,
      error: null,
    };
  }

  uninstall(toolId: string, options: UninstallOptions): UninstallResult {
    return this.uninstaller.uninstall(toolId, options);
  }

  verify(toolId: string): SignatureVerificationResult {
    const manifest = this.repo.getTool(toolId);
    if (!manifest) throw new ToolNotFoundError(`Tool not found: ${toolId}`);
    return this.signatureVerifier.verify(manifest);
  }

  listInstalled(organizationId: string): InstalledTool[] {
    return this.repo.getInstalledTools(organizationId);
  }

  getAuditLog(organizationId: string): ToolInstallationRecord[] {
    return this.repo.getAuditLog(organizationId);
  }

  getToolAuditLog(toolId: string, organizationId: string): ToolInstallationRecord[] {
    return this.repo.getToolAuditLog(toolId, organizationId);
  }

  validateManifest(manifest: unknown): ValidationResult {
    return this.validator.validate(manifest);
  }

  checkCompatibility(
    manifest: ToolManifest,
    targetRuntime: RuntimeCompatibility,
    installedManifests?: ToolManifest[],
  ): CompatibilityResult {
    return this.compatibilityChecker.check(manifest, targetRuntime, installedManifests);
  }

  analyzePermissions(manifest: ToolManifest): PermissionAnalysis {
    return this.permissionAnalyzer.analyze(manifest);
  }

  rollback(
    toolId: string,
    targetVersion: string,
    organizationId: string,
    performedBy: string,
  ): RollbackResult {
    return this.versionManager.rollback(toolId, targetVersion, organizationId, performedBy);
  }

  registerTool(manifest: ToolManifest): void {
    this.registry.register(manifest);
  }

  publishVersion(manifest: ToolManifest): void {
    this.versionManager.publishVersion(manifest);
  }
}
