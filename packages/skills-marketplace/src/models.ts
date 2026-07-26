// ---------------------------------------------------------------------------
// Core domain models for the AI Skills Marketplace
// ---------------------------------------------------------------------------

// ── Skill identity & declaration ─────────────────────────────────────────────

export type SkillStatus = 'registered' | 'installed' | 'disabled' | 'uninstalled';
export type SkillCategory = 'productivity' | 'development' | 'analytics' | 'communication' | 'integration' | 'security' | 'custom';

export interface SkillPermission {
  resource: PermissionResource;
  access: PermissionAccess[];
  reason: string;
}

export type PermissionResource =
  | 'gmail'
  | 'google_drive'
  | 'github'
  | 'knowledge_graph'
  | 'enterprise_rag'
  | 'multi_agent'
  | 'filesystem'
  | 'network'
  | 'environment'
  | 'secrets';

export type PermissionAccess = 'read' | 'write' | 'execute' | 'delete';

export interface SkillDependency {
  skillId: string;
  versionRange: string;
  optional: boolean;
}

export interface SkillVersion {
  version: string;
  releaseDate: string;
  changelog: string;
  deprecated: boolean;
}

export interface SkillManifest {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  organization: string;
  category: SkillCategory;
  tags: string[];
  dependencies: SkillDependency[];
  permissions: SkillPermission[];
  capabilities: string[];
  compatibleConnectors: string[];
  minPlatformVersion: string;
  commands: SkillCommand[];
  actions: SkillAction[];
  events: SkillEvent[];
}

export interface SkillCommand {
  name: string;
  description: string;
  parameters: SkillParameter[];
}

export interface SkillAction {
  name: string;
  description: string;
  handler: string;
}

export interface SkillEvent {
  name: string;
  description: string;
  payloadSchema?: Record<string, unknown>;
}

export interface SkillParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description: string;
  defaultValue?: unknown;
}

// ── Skill record (registry entry) ────────────────────────────────────────────

export interface SkillRecord {
  manifest: SkillManifest;
  status: SkillStatus;
  installedAt?: string;
  updatedAt?: string;
  enabledAt?: string;
  versionHistory: SkillVersion[];
  rating: SkillRating;
  installCount: number;
}

export interface SkillRating {
  average: number;
  count: number;
  distribution: Record<number, number>;
}

// ── Execution ─────────────────────────────────────────────────────────────────

export interface SkillExecutionContext {
  skillId: string;
  command: string;
  parameters: Record<string, unknown>;
  organizationId: string;
  userId: string;
  grantedPermissions: SkillPermission[];
  invocationId: string;
}

export interface SkillExecutionResult {
  invocationId: string;
  skillId: string;
  command: string;
  success: boolean;
  output: unknown;
  error?: string;
  durationMs: number;
  startedAt: string;
  completedAt: string;
  telemetry: Record<string, unknown>;
}

export interface SkillHandler {
  (context: SkillExecutionContext): Promise<SkillExecutionResult> | SkillExecutionResult;
}

// ── Sandbox ────────────────────────────────────────────────────────────────────

export interface SandboxPolicy {
  allowDiskAccess: boolean;
  allowNetwork: boolean;
  allowEnvironment: boolean;
  allowSecrets: boolean;
  allowedPaths: string[];
  allowedDomains: string[];
  maxExecutionTimeMs: number;
  maxMemoryMB: number;
}

export interface SandboxViolation {
  skillId: string;
  invocationId: string;
  violation: string;
  resource: string;
  timestamp: string;
  severity: 'warning' | 'error';
}

export interface ISandbox {
  execute(
    handler: SkillHandler,
    context: SkillExecutionContext,
    policy: SandboxPolicy,
  ): Promise<SkillExecutionResult>;
  getViolations(): SandboxViolation[];
  setPolicy(skillId: string, policy: SandboxPolicy): void;
  getPolicy(skillId: string): SandboxPolicy | undefined;
}

// ── Permissions ────────────────────────────────────────────────────────────────

export interface IPermissionEngine {
  validate(manifest: SkillManifest, granted: SkillPermission[]): PermissionValidationResult;
  checkAccess(resource: PermissionResource, access: PermissionAccess, granted: SkillPermission[]): boolean;
  getRequiredPermissions(manifest: SkillManifest): SkillPermission[];
  getMissingPermissions(manifest: SkillManifest, granted: SkillPermission[]): SkillPermission[];
}

export interface PermissionValidationResult {
  valid: boolean;
  missing: SkillPermission[];
  granted: SkillPermission[];
}

// ── Registry ───────────────────────────────────────────────────────────────────

export interface ISkillRegistry {
  register(manifest: SkillManifest): SkillRecord;
  unregister(skillId: string): boolean;
  get(skillId: string): SkillRecord | undefined;
  list(): SkillRecord[];
  listByCategory(category: SkillCategory): SkillRecord[];
  listByTag(tag: string): SkillRecord[];
  updateStatus(skillId: string, status: SkillStatus): void;
  addVersion(skillId: string, version: SkillVersion): void;
  incrementInstallCount(skillId: string): void;
  updateRating(skillId: string, rating: number): void;
}

// ── Installer ───────────────────────────────────────────────────────────────────

export interface InstallResult {
  skillId: string;
  success: boolean;
  installedVersion: string;
  dependenciesInstalled: string[];
  errors: string[];
}

export interface UninstallResult {
  skillId: string;
  success: boolean;
  dependenciesRemoved: string[];
  errors: string[];
}

export interface UpdateResult {
  skillId: string;
  success: boolean;
  previousVersion: string;
  newVersion: string;
  errors: string[];
}

// ── Lifecycle ───────────────────────────────────────────────────────────────────

export type LifecycleEventType =
  | 'install'
  | 'activate'
  | 'update'
  | 'deactivate'
  | 'uninstall';

export interface LifecycleEvent {
  type: LifecycleEventType;
  skillId: string;
  version: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface ILifecycleManager {
  recordEvent(event: LifecycleEvent): void;
  getEvents(skillId?: string): LifecycleEvent[];
  getEventsByType(type: LifecycleEventType): LifecycleEvent[];
  clear(): void;
}

// ── Marketplace ─────────────────────────────────────────────────────────────────

export interface MarketplaceQuery {
  category?: SkillCategory;
  tags?: string[];
  searchText?: string;
  compatibleConnectors?: string[];
  platformVersion?: string;
  status?: SkillStatus;
  limit?: number;
  offset?: number;
}

export interface MarketplaceEntry {
  record: SkillRecord;
  compatible: boolean;
  compatibilityIssues: string[];
  isInstalled: boolean;
  isEnabled: boolean;
}

// ── Telemetry ───────────────────────────────────────────────────────────────────

export type TelemetryEventType =
  | 'skill.installed'
  | 'skill.updated'
  | 'skill.enabled'
  | 'skill.disabled'
  | 'skill.executed'
  | 'permission.denied'
  | 'sandbox.violation';

export interface TelemetryEvent {
  type: TelemetryEventType;
  timestamp: string;
  skillId?: string;
  metadata: Record<string, unknown>;
}

export interface ITelemetryEngine {
  emit(event: TelemetryEvent): void;
  getEvents(): TelemetryEvent[];
  getEventsByType(type: TelemetryEventType): TelemetryEvent[];
  clear(): void;
}

// ── Public API interfaces ─────────────────────────────────────────────────────

export interface ISkillsMarketplace {
  registerSkill(manifest: SkillManifest, handler: SkillHandler): void;
  installSkill(skillId: string, grantedPermissions?: SkillPermission[]): InstallResult;
  uninstallSkill(skillId: string): UninstallResult;
  enableSkill(skillId: string): boolean;
  disableSkill(skillId: string): boolean;
  executeSkill(skillId: string, command: string, parameters: Record<string, unknown>, organizationId: string, userId: string): Promise<SkillExecutionResult>;
  listSkills(filter?: MarketplaceQuery): MarketplaceEntry[];
  updateSkill(skillId: string, targetVersion?: string): UpdateResult;
}
