import type {
  Entity,
  IIndexManager,
  IKnowledgeGraph,
  IndexStats,
  Relationship,
} from '../models.js';

export class IndexManager implements IIndexManager {
  private readonly typeIndex = new Map<string, Set<string>>();
  private readonly tagIndex = new Map<string, Set<string>>();
  private readonly orgIndex = new Map<string, Set<string>>();
  private readonly ownerIndex = new Map<string, Set<string>>();
  private readonly connectorIndex = new Map<string, Set<string>>();
  private readonly dateIndex: { date: string; entityIds: Set<string> }[] = [];
  private readonly textIndex = new Map<string, string[]>();

  private lastUpdated = new Date().toISOString();

  indexEntity(entity: Entity): void {
    // Type index
    if (!this.typeIndex.has(entity.type)) this.typeIndex.set(entity.type, new Set());
    this.typeIndex.get(entity.type)!.add(entity.id);

    // Tag index
    for (const tag of entity.tags) {
      if (!this.tagIndex.has(tag)) this.tagIndex.set(tag, new Set());
      this.tagIndex.get(tag)!.add(entity.id);
    }

    // Organization index
    if (!this.orgIndex.has(entity.organizationId)) this.orgIndex.set(entity.organizationId, new Set());
    this.orgIndex.get(entity.organizationId)!.add(entity.id);

    // Owner index
    if (entity.metadata.ownerId) {
      if (!this.ownerIndex.has(entity.metadata.ownerId)) this.ownerIndex.set(entity.metadata.ownerId, new Set());
      this.ownerIndex.get(entity.metadata.ownerId)!.add(entity.id);
    }

    // Connector index
    if (entity.metadata.connector) {
      if (!this.connectorIndex.has(entity.metadata.connector)) this.connectorIndex.set(entity.metadata.connector, new Set());
      this.connectorIndex.get(entity.metadata.connector)!.add(entity.id);
    }

    // Date index (by day)
    const day = entity.createdAt.slice(0, 10);
    let dayEntry = this.dateIndex.find((d) => d.date === day);
    if (!dayEntry) {
      dayEntry = { date: day, entityIds: new Set() };
      this.dateIndex.push(dayEntry);
    }
    dayEntry.entityIds.add(entity.id);

    // Text index (tokenize property values)
    const tokens = this.tokenize(entity);
    for (const token of tokens) {
      if (!this.textIndex.has(token)) this.textIndex.set(token, []);
      const list = this.textIndex.get(token)!;
      if (!list.includes(entity.id)) list.push(entity.id);
    }

    this.lastUpdated = new Date().toISOString();
  }

  indexRelationship(_rel: Relationship): void {
    this.lastUpdated = new Date().toISOString();
  }

  removeEntity(id: string): void {
    for (const set of this.typeIndex.values()) set.delete(id);
    for (const set of this.tagIndex.values()) set.delete(id);
    for (const set of this.orgIndex.values()) set.delete(id);
    for (const set of this.ownerIndex.values()) set.delete(id);
    for (const set of this.connectorIndex.values()) set.delete(id);
    for (const entry of this.dateIndex) entry.entityIds.delete(id);
    for (const [token, ids] of this.textIndex) {
      this.textIndex.set(token, ids.filter((eid) => eid !== id));
    }
    this.lastUpdated = new Date().toISOString();
  }

  removeRelationship(_id: string): void {
    this.lastUpdated = new Date().toISOString();
  }

  getByType(type: string): string[] {
    return Array.from(this.typeIndex.get(type as Entity['type']) ?? []);
  }

  getByTag(tag: string): string[] {
    return Array.from(this.tagIndex.get(tag) ?? []);
  }

  getByOrganization(orgId: string): string[] {
    return Array.from(this.orgIndex.get(orgId) ?? []);
  }

  getByOwner(ownerId: string): string[] {
    return Array.from(this.ownerIndex.get(ownerId) ?? []);
  }

  getByConnector(connector: string): string[] {
    return Array.from(this.connectorIndex.get(connector) ?? []);
  }

  getByDateRange(start: string, end: string): string[] {
    const startDay = start.slice(0, 10);
    const endDay = end.slice(0, 10);
    const result = new Set<string>();
    for (const entry of this.dateIndex) {
      if (entry.date >= startDay && entry.date <= endDay) {
        for (const id of entry.entityIds) result.add(id);
      }
    }
    return Array.from(result);
  }

  searchText(text: string, limit: number = 50): string[] {
    const tokens = text.toLowerCase().split(/\s+/).filter((t) => t.length > 0);
    if (tokens.length === 0) return [];

    const scores = new Map<string, number>();
    for (const token of tokens) {
      const ids = this.textIndex.get(token) ?? [];
      for (const id of ids) {
        scores.set(id, (scores.get(id) ?? 0) + 1);
      }
      // Also try prefix matching
      for (const [indexedToken, entityIds] of this.textIndex) {
        if (indexedToken.startsWith(token) && indexedToken !== token) {
          for (const id of entityIds) {
            scores.set(id, (scores.get(id) ?? 0) + 0.5);
          }
        }
      }
    }

    return Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id);
  }

  getStats(): IndexStats[] {
    return [
      { type: 'entity_type', size: this.typeIndex.size, lastUpdated: this.lastUpdated },
      { type: 'tags', size: this.tagIndex.size, lastUpdated: this.lastUpdated },
      { type: 'organization', size: this.orgIndex.size, lastUpdated: this.lastUpdated },
      { type: 'owner', size: this.ownerIndex.size, lastUpdated: this.lastUpdated },
      { type: 'connector', size: this.connectorIndex.size, lastUpdated: this.lastUpdated },
      { type: 'dates', size: this.dateIndex.length, lastUpdated: this.lastUpdated },
      { type: 'text', size: this.textIndex.size, lastUpdated: this.lastUpdated },
    ];
  }

  rebuild(graph: IKnowledgeGraph): void {
    this.typeIndex.clear();
    this.tagIndex.clear();
    this.orgIndex.clear();
    this.ownerIndex.clear();
    this.connectorIndex.clear();
    this.dateIndex.length = 0;
    this.textIndex.clear();

    // We need to iterate all entities — use the query method to get everything
    const allResults = graph.query({ limit: Number.MAX_SAFE_INTEGER });
    for (const result of allResults) {
      this.indexEntity(result.entity);
    }
    this.lastUpdated = new Date().toISOString();
  }

  private tokenize(entity: Entity): string[] {
    const tokens: string[] = [];
    tokens.push(entity.id.toLowerCase());
    tokens.push(entity.type.toLowerCase());
    for (const tag of entity.tags) {
      tokens.push(tag.toLowerCase());
    }
    for (const value of Object.values(entity.properties)) {
      if (typeof value === 'string') {
        tokens.push(...value.toLowerCase().split(/\s+/));
      } else if (typeof value === 'number') {
        tokens.push(String(value));
      }
    }
    return tokens.filter((t) => t.length > 0);
  }
}
