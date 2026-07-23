import type { UninstallResult } from '../models/ToolManifest';
import type { IMarketplaceRepository } from './MarketplaceRepository';
import { ToolNotInstalledError } from '../errors/MarketplaceErrors';

export interface UninstallOptions {
  organizationId: string;
  performedBy: string;
  reason?: string;
}

export class ToolUninstaller {
  constructor(private readonly repo: IMarketplaceRepository) {}

  uninstall(toolId: string, options: UninstallOptions): UninstallResult {
    try {
      const installed = this.repo.getInstalledTool(toolId, options.organizationId);
      if (!installed) {
        throw new ToolNotInstalledError(
          `Tool ${toolId} is not installed for organization ${options.organizationId}`,
        );
      }

      const dependents = this.repo
        .getInstalledTools(options.organizationId)
        .filter(
          (t) =>
            t.id !== toolId &&
            t.manifest.dependencies.some((d) => d.toolId === toolId),
        );

      if (dependents.length > 0) {
        const dependentIds = dependents.map((d) => d.id).join(', ');
        return {
          success: false,
          error: `Cannot uninstall ${toolId} — installed tools depend on it: ${dependentIds}. Uninstall dependents first.`,
        };
      }

      const removed = this.repo.removeInstalledTool(toolId, options.organizationId);
      if (!removed) {
        return { success: false, error: 'Failed to remove tool from installed registry' };
      }

      this.repo.recordAudit({
        id: `audit_${Date.now()}_${toolId}_uninstall`,
        toolId,
        toolVersion: installed.version,
        organizationId: options.organizationId,
        action: 'uninstall',
        previousVersion: installed.version,
        newVersion: null,
        performedBy: options.performedBy,
        timestamp: new Date().toISOString(),
        success: true,
        reason: options.reason ?? 'Tool uninstalled successfully',
      });

      return { success: true, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.repo.recordAudit({
        id: `audit_${Date.now()}_${toolId}_uninstall_fail`,
        toolId,
        toolVersion: '',
        organizationId: options.organizationId,
        action: 'uninstall',
        previousVersion: null,
        newVersion: null,
        performedBy: options.performedBy,
        timestamp: new Date().toISOString(),
        success: false,
        reason: message,
      });
      return { success: false, error: message };
    }
  }
}
