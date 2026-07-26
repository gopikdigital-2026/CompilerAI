import type {
  ISkillRegistry,
  MarketplaceEntry,
  MarketplaceQuery,
} from '../models.js';

export class Marketplace {
  private readonly registry: ISkillRegistry;
  private currentPlatformVersion: string;

  constructor(registry: ISkillRegistry, platformVersion: string = '1.0.0') {
    this.registry = registry;
    this.currentPlatformVersion = platformVersion;
  }

  setPlatformVersion(version: string): void {
    this.currentPlatformVersion = version;
  }

  search(query: MarketplaceQuery): MarketplaceEntry[] {
    let records = this.registry.list();

    if (query.category) {
      records = records.filter((r) => r.manifest.category === query.category);
    }

    if (query.tags && query.tags.length > 0) {
      records = records.filter((r) => query.tags!.some((t) => r.manifest.tags.includes(t)));
    }

    if (query.status) {
      records = records.filter((r) => r.status === query.status);
    }

    if (query.searchText) {
      const text = query.searchText.toLowerCase();
      records = records.filter((r) =>
        r.manifest.name.toLowerCase().includes(text) ||
        r.manifest.description.toLowerCase().includes(text) ||
        r.manifest.tags.some((t) => t.toLowerCase().includes(text)),
      );
    }

    const entries: MarketplaceEntry[] = records.map((record) => {
      const compatibility = this.checkCompatibility(record.manifest, query);
      return {
        record,
        compatible: compatibility.compatible,
        compatibilityIssues: compatibility.issues,
        isInstalled: record.status === 'installed',
        isEnabled: record.status === 'installed' && record.enabledAt !== undefined,
      };
    });

    if (query.compatibleConnectors && query.compatibleConnectors.length > 0) {
      // Filter to only compatible entries if connector filter is specified
      return entries.filter((e) => e.compatible || !query.compatibleConnectors);
    }

    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;
    return entries.slice(offset, offset + limit);
  }

  getById(skillId: string): MarketplaceEntry | undefined {
    const record = this.registry.get(skillId);
    if (!record) return undefined;
    const compatibility = this.checkCompatibility(record.manifest, {});
    return {
      record,
      compatible: compatibility.compatible,
      compatibilityIssues: compatibility.issues,
      isInstalled: record.status === 'installed',
      isEnabled: record.status === 'installed' && record.enabledAt !== undefined,
    };
  }

  getByCategory(category: MarketplaceQuery['category']): MarketplaceEntry[] {
    return this.search({ category });
  }

  getPopular(limit: number = 10): MarketplaceEntry[] {
    return this.search({})
      .sort((a, b) => b.record.installCount - a.record.installCount)
      .slice(0, limit);
  }

  getTopRated(limit: number = 10): MarketplaceEntry[] {
    return this.search({})
      .filter((e) => e.record.rating.count > 0)
      .sort((a, b) => b.record.rating.average - a.record.rating.average)
      .slice(0, limit);
  }

  private checkCompatibility(
    manifest: MarketplaceEntry['record']['manifest'],
    query: MarketplaceQuery,
  ): { compatible: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check platform version compatibility
    if (!this.isVersionCompatible(manifest.minPlatformVersion, this.currentPlatformVersion)) {
      issues.push(`Requires platform version >= ${manifest.minPlatformVersion}, current is ${this.currentPlatformVersion}`);
    }

    // Check connector compatibility
    if (query.compatibleConnectors && query.compatibleConnectors.length > 0) {
      const hasMatch = query.compatibleConnectors.some((c) => manifest.compatibleConnectors.includes(c));
      if (!hasMatch && manifest.compatibleConnectors.length > 0) {
        issues.push(`No compatible connectors match: ${query.compatibleConnectors.join(', ')}`);
      }
    }

    return { compatible: issues.length === 0, issues };
  }

  private isVersionCompatible(required: string, current: string): boolean {
    const reqParts = required.split('.').map(Number);
    const curParts = current.split('.').map(Number);
    for (let i = 0; i < Math.max(reqParts.length, curParts.length); i++) {
      const req = reqParts[i] ?? 0;
      const cur = curParts[i] ?? 0;
      if (cur > req) return true;
      if (cur < req) return false;
    }
    return true;
  }
}
