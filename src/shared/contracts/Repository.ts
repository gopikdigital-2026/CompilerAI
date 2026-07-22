import type { EntityId, OrganizationId } from './Ids';
import type { Version, Result } from './Result';

export interface IOrgScoped {
  organizationId: OrganizationId;
}

export interface IIdentifiable {
  id: EntityId;
}

export interface IVersioned {
  version: Version;
}

export interface IRepository<T extends IIdentifiable> {
  save(entity: T): Result<void, string>;
  findById(id: EntityId): T | null;
  findAll(): T[];
  update(entity: T): Result<void, string>;
  delete(id: EntityId): Result<void, string>;
  count(): number;
}

export interface IOrgScopedRepository<T extends IIdentifiable & IOrgScoped> extends IRepository<T> {
  findByOrganization(organizationId: OrganizationId): T[];
}

export abstract class InMemoryOrgScopedRepository<T extends IIdentifiable & IOrgScoped>
  implements IOrgScopedRepository<T>
{
  protected readonly store = new Map<EntityId, T>();
  protected readonly orgIndex = new Map<OrganizationId, Set<EntityId>>();

  save(entity: T): Result<void, string> {
    this.store.set(entity.id, entity);
    this.indexOrg(entity.organizationId, entity.id);
    return { ok: true, value: undefined } as Result<void, string>;
  }

  findById(id: EntityId): T | null {
    return this.store.get(id) ?? null;
  }

  findAll(): T[] {
    return [...this.store.values()];
  }

  findByOrganization(organizationId: OrganizationId): T[] {
    const ids = this.orgIndex.get(organizationId);
    if (!ids) return [];
    return [...ids].map((id) => this.store.get(id)).filter((e): e is T => e !== null);
  }

  update(entity: T): Result<void, string> {
    if (!this.store.has(entity.id)) {
      return { ok: false, error: `Entity ${entity.id} not found` };
    }
    this.store.set(entity.id, entity);
    this.indexOrg(entity.organizationId, entity.id);
    return { ok: true, value: undefined } as Result<void, string>;
  }

  delete(id: EntityId): Result<void, string> {
    const entity = this.store.get(id);
    if (!entity) {
      return { ok: false, error: `Entity ${id} not found` };
    }
    this.store.delete(id);
    this.orgIndex.get(entity.organizationId)?.delete(id);
    return { ok: true, value: undefined } as Result<void, string>;
  }

  count(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
    this.orgIndex.clear();
  }

  private indexOrg(orgId: OrganizationId, id: EntityId): void {
    let set = this.orgIndex.get(orgId);
    if (!set) {
      set = new Set();
      this.orgIndex.set(orgId, set);
    }
    set.add(id);
  }
}
