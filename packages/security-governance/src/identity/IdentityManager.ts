import type { Identity, IdentityType, IdentityStatus } from '../models.js';

let idCounter = 0;

export function generateIdentityId(): string {
  return `id-${(++idCounter).toString(36)}-${Date.now().toString(36)}`;
}

export class IdentityManager {
  private readonly identities = new Map<string, Identity>();
  private readonly orgIdentities = new Map<string, Set<string>>();

  create(
    type: IdentityType,
    name: string,
    organizationId: string,
    options?: {
      email?: string;
      ownerId?: string;
      status?: IdentityStatus;
      metadata?: Record<string, unknown>;
    },
  ): Identity {
    const id = generateIdentityId();
    const identity: Identity = {
      id,
      type,
      organizationId,
      status: options?.status ?? 'active',
      ownerId: options?.ownerId,
      name,
      email: options?.email,
      createdAt: new Date().toISOString(),
      metadata: options?.metadata ?? {},
    };
    this.identities.set(id, identity);
    if (!this.orgIdentities.has(organizationId)) {
      this.orgIdentities.set(organizationId, new Set());
    }
    this.orgIdentities.get(organizationId)!.add(id);
    return identity;
  }

  get(id: string): Identity | undefined {
    return this.identities.get(id);
  }

  update(id: string, updates: Partial<Identity>): Identity | undefined {
    const existing = this.identities.get(id);
    if (!existing) return undefined;
    const updated: Identity = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt,
      organizationId: existing.organizationId,
    };
    this.identities.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    const identity = this.identities.get(id);
    if (!identity) return false;
    this.identities.delete(id);
    this.orgIdentities.get(identity.organizationId)?.delete(id);
    return true;
  }

  list(organizationId?: string): Identity[] {
    if (!organizationId) return Array.from(this.identities.values());
    const ids = this.orgIdentities.get(organizationId) ?? new Set();
    return Array.from(ids).map((id) => this.identities.get(id)).filter((i): i is Identity => i !== undefined);
  }

  listByType(type: IdentityType, organizationId?: string): Identity[] {
    return this.list(organizationId).filter((i) => i.type === type);
  }

  setStatus(id: string, status: IdentityStatus): Identity | undefined {
    return this.update(id, { status });
  }

  exists(id: string): boolean {
    return this.identities.has(id);
  }

  count(): number {
    return this.identities.size;
  }
}
