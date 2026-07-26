import type {
  ISkillRegistry,
  SkillCategory,
  SkillManifest,
  SkillRecord,
  SkillStatus,
  SkillVersion,
} from '../models.js';

export class SkillRegistry implements ISkillRegistry {
  private readonly skills = new Map<string, SkillRecord>();

  register(manifest: SkillManifest): SkillRecord {
    const existing = this.skills.get(manifest.id);
    const record: SkillRecord = {
      manifest,
      status: existing?.status ?? 'registered',
      installedAt: existing?.installedAt,
      updatedAt: existing?.updatedAt,
      enabledAt: existing?.enabledAt,
      versionHistory: existing?.versionHistory ?? [
        { version: manifest.version, releaseDate: new Date().toISOString(), changelog: 'Initial release', deprecated: false },
      ],
      rating: existing?.rating ?? { average: 0, count: 0, distribution: {} },
      installCount: existing?.installCount ?? 0,
    };
    this.skills.set(manifest.id, record);
    return record;
  }

  unregister(skillId: string): boolean {
    return this.skills.delete(skillId);
  }

  get(skillId: string): SkillRecord | undefined {
    return this.skills.get(skillId);
  }

  list(): SkillRecord[] {
    return Array.from(this.skills.values());
  }

  listByCategory(category: SkillCategory): SkillRecord[] {
    return this.list().filter((r) => r.manifest.category === category);
  }

  listByTag(tag: string): SkillRecord[] {
    return this.list().filter((r) => r.manifest.tags.includes(tag));
  }

  updateStatus(skillId: string, status: SkillStatus): void {
    const record = this.skills.get(skillId);
    if (!record) return;
    record.status = status;
    const now = new Date().toISOString();
    if (status === 'installed') record.installedAt = now;
    if (status === 'disabled') record.updatedAt = now;
    if (status === 'installed' && !record.enabledAt) record.enabledAt = now;
  }

  addVersion(skillId: string, version: SkillVersion): void {
    const record = this.skills.get(skillId);
    if (!record) return;
    record.versionHistory.push(version);
    record.updatedAt = new Date().toISOString();
  }

  incrementInstallCount(skillId: string): void {
    const record = this.skills.get(skillId);
    if (!record) return;
    record.installCount++;
  }

  updateRating(skillId: string, rating: number): void {
    const record = this.skills.get(skillId);
    if (!record) return;
    const r = record.rating;
    const totalScore = r.average * r.count + rating;
    r.count++;
    r.average = totalScore / r.count;
    r.distribution[rating] = (r.distribution[rating] ?? 0) + 1;
  }
}
