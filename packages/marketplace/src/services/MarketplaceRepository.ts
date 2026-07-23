import type {
  ToolManifest,
  ToolVersion,
  InstalledTool,
  ToolInstallationRecord,
} from '../models/ToolManifest';

export interface IMarketplaceRepository {
  registerTool(manifest: ToolManifest): void;
  getTool(toolId: string): ToolManifest | null;
  getAllTools(): ToolManifest[];
  removeTool(toolId: string): boolean;

  publishVersion(toolId: string, manifest: ToolManifest): void;
  getVersions(toolId: string): ToolVersion[];
  getLatestVersion(toolId: string): ToolVersion | null;

  installTool(installed: InstalledTool): void;
  getInstalledTool(toolId: string, organizationId: string): InstalledTool | null;
  getInstalledTools(organizationId: string): InstalledTool[];
  removeInstalledTool(toolId: string, organizationId: string): boolean;

  recordAudit(record: ToolInstallationRecord): void;
  getAuditLog(organizationId: string): ToolInstallationRecord[];
  getToolAuditLog(toolId: string, organizationId: string): ToolInstallationRecord[];
}

export class InMemoryMarketplaceRepository implements IMarketplaceRepository {
  private readonly tools = new Map<string, ToolManifest>();
  private readonly versions = new Map<string, ToolVersion[]>();
  private readonly installed = new Map<string, Map<string, InstalledTool>>();
  private readonly auditLogs: ToolInstallationRecord[] = [];

  registerTool(manifest: ToolManifest): void {
    this.tools.set(manifest.id, manifest);
  }

  getTool(toolId: string): ToolManifest | null {
    return this.tools.get(toolId) ?? null;
  }

  getAllTools(): ToolManifest[] {
    return Array.from(this.tools.values());
  }

  removeTool(toolId: string): boolean {
    return this.tools.delete(toolId);
  }

  publishVersion(toolId: string, manifest: ToolManifest): void {
    const existing = this.versions.get(toolId) ?? [];
    existing.push({
      toolId,
      version: manifest.version,
      manifest,
      publishedAt: new Date().toISOString(),
      deprecated: false,
    });
    this.versions.set(toolId, existing);
    this.tools.set(toolId, manifest);
  }

  getVersions(toolId: string): ToolVersion[] {
    return this.versions.get(toolId) ?? [];
  }

  getLatestVersion(toolId: string): ToolVersion | null {
    const versions = this.versions.get(toolId);
    if (!versions || versions.length === 0) return null;
    return versions[versions.length - 1] ?? null;
  }

  installTool(installed: InstalledTool): void {
    let orgMap = this.installed.get(installed.organizationId);
    if (!orgMap) {
      orgMap = new Map();
      this.installed.set(installed.organizationId, orgMap);
    }
    orgMap.set(installed.id, installed);
  }

  getInstalledTool(toolId: string, organizationId: string): InstalledTool | null {
    const orgMap = this.installed.get(organizationId);
    if (!orgMap) return null;
    return orgMap.get(toolId) ?? null;
  }

  getInstalledTools(organizationId: string): InstalledTool[] {
    const orgMap = this.installed.get(organizationId);
    if (!orgMap) return [];
    return Array.from(orgMap.values());
  }

  removeInstalledTool(toolId: string, organizationId: string): boolean {
    const orgMap = this.installed.get(organizationId);
    if (!orgMap) return false;
    return orgMap.delete(toolId);
  }

  recordAudit(record: ToolInstallationRecord): void {
    this.auditLogs.push(record);
  }

  getAuditLog(organizationId: string): ToolInstallationRecord[] {
    return this.auditLogs.filter((r) => r.organizationId === organizationId);
  }

  getToolAuditLog(toolId: string, organizationId: string): ToolInstallationRecord[] {
    return this.auditLogs.filter(
      (r) => r.toolId === toolId && r.organizationId === organizationId,
    );
  }
}
