export type ToolCategory =
  | 'data'
  | 'ai'
  | 'integration'
  | 'utility'
  | 'security'
  | 'monitoring'
  | 'workflow'
  | 'communication';

export type ToolPermission =
  | 'read:memory'
  | 'write:memory'
  | 'read:executions'
  | 'write:executions'
  | 'read:workflows'
  | 'write:workflows'
  | 'execute:shell'
  | 'network:external'
  | 'file:read'
  | 'file:write'
  | 'env:read'
  | 'env:write'
  | 'org:admin';

export type RuntimeCompatibility =
  | 'compiler-runtime'
  | 'node'
  | 'browser'
  | 'edge'
  | 'universal';

export const DANGEROUS_PERMISSIONS: ReadonlySet<ToolPermission> = new Set([
  'execute:shell',
  'network:external',
  'env:read',
  'env:write',
  'org:admin',
]);

export const ALL_PERMISSIONS: readonly ToolPermission[] = [
  'read:memory',
  'write:memory',
  'read:executions',
  'write:executions',
  'read:workflows',
  'write:workflows',
  'execute:shell',
  'network:external',
  'file:read',
  'file:write',
  'env:read',
  'env:write',
  'org:admin',
];

export interface ToolManifest {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  category: ToolCategory;
  capabilities: string[];
  permissions: ToolPermission[];
  runtimeCompatibility: RuntimeCompatibility[];
  dependencies: ToolDependency[];
  entrypoint: string;
  checksum: string;
  signature: string;
  verified: boolean;
}

export interface ToolDependency {
  toolId: string;
  versionRange: string;
}

export interface InstalledTool {
  id: string;
  version: string;
  organizationId: string;
  installedAt: string;
  installedBy: string;
  manifest: ToolManifest;
}

export interface ToolInstallationRecord {
  id: string;
  toolId: string;
  toolVersion: string;
  organizationId: string;
  action: 'install' | 'update' | 'uninstall' | 'rollback';
  previousVersion: string | null;
  newVersion: string | null;
  performedBy: string;
  timestamp: string;
  success: boolean;
  reason: string;
}

export interface ToolVersion {
  toolId: string;
  version: string;
  manifest: ToolManifest;
  publishedAt: string;
  deprecated: boolean;
}

export interface ToolSearchQuery {
  text?: string;
  category?: ToolCategory;
  verifiedOnly?: boolean;
  runtime?: RuntimeCompatibility;
  tags?: string[];
  sortBy?: 'name' | 'version' | 'publishedAt' | 'relevance';
  limit?: number;
  offset?: number;
}

export interface ToolSearchResult {
  tool: ToolManifest;
  score: number;
  matchedFields: string[];
}

export interface CompatibilityResult {
  compatible: boolean;
  errors: string[];
  warnings: string[];
}

export interface PermissionAnalysis {
  permissions: ToolPermission[];
  dangerousPermissions: ToolPermission[];
  blockedPermissions: ToolPermission[];
  allowed: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  warnings: string[];
}

export interface SignatureVerificationResult {
  valid: boolean;
  reason: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface InstallResult {
  success: boolean;
  installedTool: InstalledTool | null;
  error: string | null;
}

export interface UninstallResult {
  success: boolean;
  error: string | null;
}

export interface UpdateResult {
  success: boolean;
  installedTool: InstalledTool | null;
  previousVersion: string | null;
  error: string | null;
}

export interface RollbackResult {
  success: boolean;
  installedTool: InstalledTool | null;
  rolledBackTo: string | null;
  error: string | null;
}
