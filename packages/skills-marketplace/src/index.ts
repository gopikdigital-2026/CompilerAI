// Core API facade
export { SkillsMarketplace } from './api/SkillsMarketplace.js';

// SDK for skill development
export { SkillBuilder, createSkill, createCommand, createParameter, createPermission, createDependency } from './sdk/SkillBuilder.js';

// Concrete implementations
export { SkillRegistry } from './registry/SkillRegistry.js';
export { PermissionEngine } from './permissions/PermissionEngine.js';
export { SkillSandbox } from './sandbox/SkillSandbox.js';
export { SkillInstaller } from './installer/SkillInstaller.js';
export { LifecycleManager } from './lifecycle/LifecycleManager.js';
export { TelemetryEngine } from './telemetry/TelemetryEngine.js';
export { Marketplace } from './marketplace/Marketplace.js';

// Example skills
export { createGitHubRepoAnalyzer } from './examples/GitHubRepoAnalyzer.js';
export { createGmailSummarizer } from './examples/GmailSummarizer.js';
export { createDriveImporter } from './examples/DriveImporter.js';

// All domain models & types
export type {
  SkillManifest,
  SkillRecord,
  SkillStatus,
  SkillCategory,
  SkillPermission,
  PermissionResource,
  PermissionAccess,
  SkillDependency,
  SkillVersion,
  SkillCommand,
  SkillAction,
  SkillEvent,
  SkillParameter,
  SkillExecutionContext,
  SkillExecutionResult,
  SkillHandler,
  SandboxPolicy,
  SandboxViolation,
  ISandbox,
  IPermissionEngine,
  PermissionValidationResult,
  ISkillRegistry,
  InstallResult,
  UninstallResult,
  UpdateResult,
  LifecycleEvent,
  LifecycleEventType,
  ILifecycleManager,
  MarketplaceQuery,
  MarketplaceEntry,
  TelemetryEvent,
  TelemetryEventType,
  ITelemetryEngine,
  ISkillsMarketplace,
} from './models.js';
