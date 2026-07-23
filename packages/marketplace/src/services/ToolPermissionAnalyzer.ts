import type { ToolManifest, ToolPermission, PermissionAnalysis } from '../models/ToolManifest';
import { DANGEROUS_PERMISSIONS } from '../models/ToolManifest';

const RISK_LEVELS: Record<ToolPermission, 'low' | 'medium' | 'high' | 'critical'> = {
  'read:memory': 'low',
  'write:memory': 'medium',
  'read:executions': 'low',
  'write:executions': 'high',
  'read:workflows': 'low',
  'write:workflows': 'medium',
  'execute:shell': 'critical',
  'network:external': 'critical',
  'file:read': 'medium',
  'file:write': 'high',
  'env:read': 'critical',
  'env:write': 'critical',
  'org:admin': 'critical',
};

export class ToolPermissionAnalyzer {
  private readonly blockedPermissions: ReadonlySet<ToolPermission>;

  constructor(
    blockedPermissions: ToolPermission[] = ['execute:shell', 'env:write', 'org:admin'],
  ) {
    this.blockedPermissions = new Set(blockedPermissions);
  }

  analyze(manifest: ToolManifest): PermissionAnalysis {
    const permissions = manifest.permissions;
    const dangerousPermissions = permissions.filter((p) => DANGEROUS_PERMISSIONS.has(p));
    const blockedPermissions = permissions.filter((p) => this.blockedPermissions.has(p));
    const allowed = blockedPermissions.length === 0;

    let maxRisk: 'low' | 'medium' | 'high' | 'critical' = 'low';
    for (const perm of permissions) {
      const risk = RISK_LEVELS[perm] ?? 'low';
      if (risk === 'critical') maxRisk = 'critical';
      else if (risk === 'high' && maxRisk !== 'critical') maxRisk = 'high';
      else if (risk === 'medium' && maxRisk !== 'high' && maxRisk !== 'critical') maxRisk = 'medium';
    }

    const warnings: string[] = [];
    if (dangerousPermissions.length > 0) {
      warnings.push(
        `Tool requests dangerous permissions: ${dangerousPermissions.join(', ')}`,
      );
    }
    for (const blocked of blockedPermissions) {
      warnings.push(`Permission ${blocked} is blocked by policy`);
    }
    if (permissions.includes('network:external')) {
      warnings.push('Tool requests external network access — review data egress policy');
    }

    return {
      permissions,
      dangerousPermissions,
      blockedPermissions,
      allowed,
      riskLevel: maxRisk,
      warnings,
    };
  }

  analyzeOrThrow(manifest: ToolManifest): PermissionAnalysis {
    const analysis = this.analyze(manifest);
    if (!analysis.allowed) {
      throw new (class extends Error {
        code = 'PERMISSION_DENIED';
        constructor(msg: string) {
          super(msg);
          this.name = 'PermissionDeniedError';
        }
      })(`Tool ${manifest.id} requests blocked permissions: ${analysis.blockedPermissions.join(', ')}`);
    }
    return analysis;
  }
}
