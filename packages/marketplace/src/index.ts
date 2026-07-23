export { MarketplaceService } from './api/MarketplaceService';
export type { UpdateOptions } from './api/MarketplaceService';
export { InMemoryMarketplaceRepository } from './services/MarketplaceRepository';
export type { IMarketplaceRepository } from './services/MarketplaceRepository';
export { ToolRegistry } from './services/ToolRegistry';
export { ToolManifestValidator } from './services/ToolManifestValidator';
export { ToolInstaller } from './services/ToolInstaller';
export type { InstallOptions } from './services/ToolInstaller';
export { ToolUninstaller } from './services/ToolUninstaller';
export type { UninstallOptions } from './services/ToolUninstaller';
export { ToolVersionManager } from './services/ToolVersionManager';
export { ToolCompatibilityChecker } from './services/ToolCompatibilityChecker';
export { ToolPermissionAnalyzer } from './services/ToolPermissionAnalyzer';
export { ToolSignatureVerifier } from './services/ToolSignatureVerifier';
export { ToolSearchService } from './services/ToolSearchService';

export type {
  ToolManifest,
  ToolDependency,
  InstalledTool,
  ToolInstallationRecord,
  ToolVersion,
  ToolSearchQuery,
  ToolSearchResult,
  ToolCategory,
  ToolPermission,
  RuntimeCompatibility,
  CompatibilityResult,
  PermissionAnalysis,
  SignatureVerificationResult,
  ValidationResult,
  InstallResult,
  UninstallResult,
  UpdateResult,
  RollbackResult,
} from './models/ToolManifest';

export { DANGEROUS_PERMISSIONS, ALL_PERMISSIONS } from './models/ToolManifest';

export {
  MarketplaceError,
  ManifestValidationError,
  SignatureVerificationError,
  ChecksumMismatchError,
  ToolNotFoundError,
  ToolAlreadyInstalledError,
  ToolNotInstalledError,
  PermissionDeniedError,
  IncompatibleToolError,
  DependencyResolutionError,
  VersionConflictError,
} from './errors/MarketplaceErrors';
