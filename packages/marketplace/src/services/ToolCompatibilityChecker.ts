import type { ToolManifest, CompatibilityResult, RuntimeCompatibility } from '../models/ToolManifest';
import type { IMarketplaceRepository } from './MarketplaceRepository';

export class ToolCompatibilityChecker {
  constructor(private readonly repo: IMarketplaceRepository) {}

  check(
    manifest: ToolManifest,
    targetRuntime: RuntimeCompatibility,
    installedManifests: ToolManifest[] = [],
  ): CompatibilityResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!manifest.runtimeCompatibility.includes(targetRuntime)) {
      errors.push(
        `Tool ${manifest.id} does not support runtime: ${targetRuntime}. Supported: ${manifest.runtimeCompatibility.join(', ')}`,
      );
    }

    if (manifest.runtimeCompatibility.includes('universal')) {
      warnings.push('Tool claims universal compatibility — verify runtime-specific behavior');
    }

    for (const dep of manifest.dependencies) {
      const depTool = this.repo.getTool(dep.toolId);
      if (!depTool) {
        errors.push(`Dependency not found in registry: ${dep.toolId}`);
        continue;
      }

      if (!depTool.runtimeCompatibility.includes(targetRuntime)) {
        errors.push(
          `Dependency ${dep.toolId} does not support runtime: ${targetRuntime}`,
        );
      }

      const installed = installedManifests.find((m) => m.id === dep.toolId);
      if (installed && !this.versionSatisfies(installed.version, dep.versionRange)) {
        errors.push(
          `Installed version ${installed.version} of ${dep.toolId} does not satisfy required range: ${dep.versionRange}`,
        );
      }
    }

    for (const installed of installedManifests) {
      const incomingDep = manifest.dependencies.find((d) => d.toolId === installed.id);
      if (!incomingDep) continue;

      const installedDeps = installed.dependencies.find((d) => d.toolId === manifest.id);
      if (installedDeps && !this.versionSatisfies(manifest.version, installedDeps.versionRange)) {
        warnings.push(
          `Already-installed tool ${installed.id} expects ${manifest.id} version ${installedDeps.versionRange}, but installing ${manifest.version}`,
        );
      }
    }

    return { compatible: errors.length === 0, errors, warnings };
  }

  checkOrThrow(
    manifest: ToolManifest,
    targetRuntime: RuntimeCompatibility,
    installedManifests?: ToolManifest[],
  ): void {
    const result = this.check(manifest, targetRuntime, installedManifests);
    if (!result.compatible) {
      throw new (class extends Error {
        code = 'INCOMPATIBLE_TOOL';
        constructor(msg: string) {
          super(msg);
          this.name = 'IncompatibleToolError';
        }
      })(result.errors.join('; '));
    }
  }

  private versionSatisfies(version: string, range: string): boolean {
    const cleanRange = range.replace(/[\s>=^~]/g, '');
    if (cleanRange === '*') return true;
    const [majorV] = version.split('.');
    const [majorR] = cleanRange.split('.');
    return majorV === majorR;
  }
}
