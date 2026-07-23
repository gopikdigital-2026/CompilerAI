import type { Organization, OrganizationPlan, OrganizationSettings } from '../organizations/OrganizationModels';
import type { IOrganizationRepository } from '../repositories/RepositoryInterfaces';
import { OrganizationNotFoundError } from '../adapters/IdentityErrors';

export interface CreateOrganizationRequest {
  name: string;
  slug: string;
  plan: OrganizationPlan;
  ownerUserId: string;
  settings?: Partial<OrganizationSettings>;
}

export class OrganizationService {
  constructor(
    private readonly repo: IOrganizationRepository,
    private readonly idGen: () => string,
    private readonly clock: () => string,
  ) {}

  async create(request: CreateOrganizationRequest): Promise<Organization> {
    const now = this.clock();
    const id = this.idGen();
    const org: Organization = {
      id,
      version: 1,
      createdAt: now,
      updatedAt: now,
      metadata: {},
      name: request.name,
      slug: request.slug,
      status: 'ACTIVE',
      plan: request.plan,
      ownerUserId: request.ownerUserId,
      settings: { ...request.settings } as OrganizationSettings,
    };
    return this.repo.create(org);
  }

  async findById(id: string): Promise<Organization> {
    const org = await this.repo.findById(id);
    if (!org) throw new OrganizationNotFoundError(`Organization not found: ${id}`);
    return org;
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    return this.repo.findBySlug(slug);
  }

  async update(id: string, updates: Partial<Pick<Organization, 'name' | 'plan' | 'settings' | 'status' | 'ownerUserId'>>): Promise<Organization> {
    const org = await this.findById(id);
    const updated: Organization = {
      ...org,
      ...updates,
      version: org.version + 1,
      updatedAt: this.clock(),
    };
    return this.repo.update(updated);
  }

  async delete(id: string): Promise<boolean> {
    return this.repo.delete(id);
  }

  async assertExists(id: string): Promise<Organization> {
    return this.findById(id);
  }

  async assertActive(id: string): Promise<Organization> {
    const org = await this.findById(id);
    if (org.status !== 'ACTIVE') {
      throw new OrganizationNotFoundError(`Organization ${id} is not active (status: ${org.status})`);
    }
    return org;
  }
}
