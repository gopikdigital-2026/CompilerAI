// ─── Identity services ──────────────────────────────────────────────────────────

import type { IOrganizationRepository } from '../repositories/RepositoryInterfaces';
import type { Organization } from '../organizations/OrganizationModels';
import type { OrganizationSettings } from '../organizations/OrganizationModels';
import { OrganizationSuspendedError } from '../errors/IdentityErrors';

export class OrganizationService {
  constructor(
    private orgRepo: IOrganizationRepository,
    _clock: () => string,
  ) {}

  async createOrganization(name: string, plan: string, slug?: string): Promise<Organization> {
    const generatedSlug = slug ?? this.slugify(name);
    const org = await this.orgRepo.create(name, generatedSlug, plan);
    return org;
  }

  async updateOrganization(orgId: string, updates: Partial<Pick<Organization, 'name' | 'plan' | 'settings' | 'logoUrl'>>): Promise<Organization> {
    return this.orgRepo.update(orgId, updates);
  }

  async suspendOrganization(orgId: string): Promise<Organization> {
    return this.orgRepo.updateStatus(orgId, 'SUSPENDED');
  }

  async reactivateOrganization(orgId: string): Promise<Organization> {
    return this.orgRepo.updateStatus(orgId, 'ACTIVE');
  }

  async deleteOrganization(orgId: string): Promise<void> {
    await this.orgRepo.softDelete(orgId);
  }

  async getOrganization(orgId: string): Promise<Organization | null> {
    return this.orgRepo.findById(orgId);
  }

  async listOrganizations(): Promise<Organization[]> {
    return this.orgRepo.list();
  }

  async updateSettings(orgId: string, settings: Partial<OrganizationSettings>): Promise<Organization> {
    const org = await this.orgRepo.findById(orgId);
    if (!org) throw new Error(`Organization ${orgId} not found`);
    return this.orgRepo.update(orgId, { settings: { ...org.settings, ...settings } });
  }

  async assertActive(orgId: string): Promise<void> {
    const org = await this.orgRepo.findById(orgId);
    if (!org) throw new Error(`Organization ${orgId} not found`);
    if (org.status === 'SUSPENDED') throw new OrganizationSuspendedError();
    if (org.status === 'DELETED') throw new Error(`Organization ${orgId} is deleted`);
  }

  private slugify(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + '-' + Math.random().toString(36).slice(2, 6);
  }
}
