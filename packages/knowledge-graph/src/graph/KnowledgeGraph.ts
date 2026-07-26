import type {
  Entity,
  IKnowledgeGraph,
  NeighborResult,
  PathResult,
  Relationship,
  SearchQuery,
  SearchResult,
  TelemetryEvent,
} from '../models.js';
import type { Ontology } from '../ontology/Ontology.js';

let idCounter = 0;

function nextId(prefix: string): string {
  return `${prefix}-${++idCounter}`;
}

export class KnowledgeGraph implements IKnowledgeGraph {
  private readonly entities = new Map<string, Entity>();
  private readonly relationships = new Map<string, Relationship>();
  private readonly outgoingRels = new Map<string, string[]>();
  private readonly incomingRels = new Map<string, string[]>();
  private readonly ontology: Ontology;
  private readonly telemetrySink?: { emit: (e: TelemetryEvent) => void };

  constructor(ontology: Ontology, telemetry?: { emit: (e: TelemetryEvent) => void }) {
    this.ontology = ontology;
    this.telemetrySink = telemetry;
  }

  addEntity(entity: Entity): Entity {
    const validation = this.ontology.validateEntity(entity.type, entity.properties);
    if (!validation.valid) {
      throw new Error(`Entity validation failed: missing required properties: ${validation.missing.join(', ')}`);
    }
    this.entities.set(entity.id, entity);
    this.outgoingRels.set(entity.id, []);
    this.incomingRels.set(entity.id, []);

    this.emitTelemetry('entity.created', {
      entityId: entity.id,
      entityType: entity.type,
      organizationId: entity.organizationId,
    });

    return entity;
  }

  updateEntity(id: string, updates: Partial<Entity>): Entity | undefined {
    const existing = this.entities.get(id);
    if (!existing) return undefined;

    const updated: Entity = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };
    this.entities.set(id, updated);

    this.emitTelemetry('entity.updated', {
      entityId: id,
      organizationId: existing.organizationId,
    });

    return updated;
  }

  getEntity(id: string): Entity | undefined {
    return this.entities.get(id);
  }

  deleteEntity(id: string): boolean {
    // Remove all relationships involving this entity
    const outRels = this.outgoingRels.get(id) ?? [];
    const inRels = this.incomingRels.get(id) ?? [];
    for (const relId of [...outRels, ...inRels]) {
      this.relationships.delete(relId);
    }
    this.outgoingRels.delete(id);
    this.incomingRels.delete(id);

    // Clean up references in other entities' rel lists
    for (const [eid, rels] of this.outgoingRels) {
      this.outgoingRels.set(eid, rels.filter((r) => {
        const rel = this.relationships.get(r);
        return rel && rel.sourceId !== id && rel.targetId !== id;
      }));
    }
    for (const [eid, rels] of this.incomingRels) {
      this.incomingRels.set(eid, rels.filter((r) => {
        const rel = this.relationships.get(r);
        return rel && rel.sourceId !== id && rel.targetId !== id;
      }));
    }

    return this.entities.delete(id);
  }

  addRelationship(rel: Relationship): Relationship {
    if (!this.entities.has(rel.sourceId)) {
      throw new Error(`Source entity '${rel.sourceId}' not found`);
    }
    if (!this.entities.has(rel.targetId)) {
      throw new Error(`Target entity '${rel.targetId}' not found`);
    }

    const sourceEntity = this.entities.get(rel.sourceId)!;
    const targetEntity = this.entities.get(rel.targetId)!;

    const validation = this.ontology.validateRelationship(rel.type, sourceEntity.type, targetEntity.type);
    if (!validation.valid) {
      throw new Error(`Relationship validation failed: ${validation.reason}`);
    }

    this.relationships.set(rel.id, rel);
    const outList = this.outgoingRels.get(rel.sourceId) ?? [];
    outList.push(rel.id);
    this.outgoingRels.set(rel.sourceId, outList);

    const inList = this.incomingRels.get(rel.targetId) ?? [];
    inList.push(rel.id);
    this.incomingRels.set(rel.targetId, inList);

    // If bidirectional, also add reverse
    if (rel.bidirectional) {
      const inListReverse = this.incomingRels.get(rel.sourceId) ?? [];
      inListReverse.push(rel.id);
      this.incomingRels.set(rel.sourceId, inListReverse);

      const outListReverse = this.outgoingRels.get(rel.targetId) ?? [];
      outListReverse.push(rel.id);
      this.outgoingRels.set(rel.targetId, outListReverse);
    }

    this.emitTelemetry('relationship.created', {
      relationshipId: rel.id,
      relationshipType: rel.type,
      sourceId: rel.sourceId,
      targetId: rel.targetId,
      organizationId: rel.organizationId,
    });

    return rel;
  }

  getRelationship(id: string): Relationship | undefined {
    return this.relationships.get(id);
  }

  deleteRelationship(id: string): boolean {
    const rel = this.relationships.get(id);
    if (!rel) return false;

    this.relationships.delete(id);

    // Remove from adjacency lists
    const outList = this.outgoingRels.get(rel.sourceId);
    if (outList) this.outgoingRels.set(rel.sourceId, outList.filter((r) => r !== id));

    const inList = this.incomingRels.get(rel.targetId);
    if (inList) this.incomingRels.set(rel.targetId, inList.filter((r) => r !== id));

    if (rel.bidirectional) {
      const inListRev = this.incomingRels.get(rel.sourceId);
      if (inListRev) this.incomingRels.set(rel.sourceId, inListRev.filter((r) => r !== id));

      const outListRev = this.outgoingRels.get(rel.targetId);
      if (outListRev) this.outgoingRels.set(rel.targetId, outListRev.filter((r) => r !== id));
    }

    this.emitTelemetry('relationship.deleted', {
      relationshipId: id,
      organizationId: rel.organizationId,
    });

    return true;
  }

  getRelationships(entityId: string): Relationship[] {
    const outIds = this.outgoingRels.get(entityId) ?? [];
    const inIds = this.incomingRels.get(entityId) ?? [];
    const allIds = new Set([...outIds, ...inIds]);
    return Array.from(allIds)
      .map((id) => this.relationships.get(id))
      .filter((r): r is Relationship => r !== undefined);
  }

  getNeighbors(entityId: string): NeighborResult[] {
    const results: NeighborResult[] = [];
    const seen = new Set<string>();

    const outIds = this.outgoingRels.get(entityId) ?? [];
    for (const relId of outIds) {
      const rel = this.relationships.get(relId);
      if (!rel) continue;
      const target = this.entities.get(rel.targetId);
      if (!target) continue;
      if (seen.has(rel.targetId)) continue;
      seen.add(rel.targetId);
      results.push({ entity: target, relationship: rel, direction: 'outgoing' });
    }

    const inIds = this.incomingRels.get(entityId) ?? [];
    for (const relId of inIds) {
      const rel = this.relationships.get(relId);
      if (!rel) continue;
      const source = this.entities.get(rel.sourceId);
      if (!source) continue;
      if (seen.has(rel.sourceId)) continue;
      seen.add(rel.sourceId);
      results.push({ entity: source, relationship: rel, direction: 'incoming' });
    }

    return results;
  }

  findPath(startId: string, endId: string): PathResult {
    if (startId === endId) {
      return { startId, endId, path: [startId], relationships: [], found: true };
    }

    if (!this.entities.has(startId) || !this.entities.has(endId)) {
      return { startId, endId, path: [], relationships: [], found: false };
    }

    // BFS
    const queue: string[] = [startId];
    const visited = new Set<string>([startId]);
    const parent = new Map<string, { nodeId: string; relId: string }>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      const neighbors = this.getNeighbors(current);

      for (const neighbor of neighbors) {
        const neighborId = neighbor.entity.id;
        if (visited.has(neighborId)) continue;
        visited.add(neighborId);
        parent.set(neighborId, { nodeId: current, relId: neighbor.relationship.id });

        if (neighborId === endId) {
          // Reconstruct path
          const path: string[] = [endId];
          const rels: Relationship[] = [];
          let node: string = endId;
          while (node !== startId) {
            const p = parent.get(node)!;
            path.unshift(p.nodeId);
            const rel = this.relationships.get(p.relId);
            if (rel) rels.unshift(rel);
            node = p.nodeId;
          }
          return { startId, endId, path, relationships: rels, found: true };
        }
        queue.push(neighborId);
      }
    }

    return { startId, endId, path: [], relationships: [], found: false };
  }

  query(searchQuery: SearchQuery): SearchResult[] {
    let candidates = Array.from(this.entities.values());

    if (searchQuery.organizationId) {
      candidates = candidates.filter((e) => e.organizationId === searchQuery.organizationId);
    }
    if (searchQuery.type) {
      candidates = candidates.filter((e) => e.type === searchQuery.type);
    }
    if (searchQuery.tags && searchQuery.tags.length > 0) {
      candidates = candidates.filter((e) => searchQuery.tags!.some((t) => e.tags.includes(t)));
    }
    if (searchQuery.properties) {
      candidates = candidates.filter((e) => {
        return Object.entries(searchQuery.properties!).every(([key, value]) =>
          e.properties[key] === value,
        );
      });
    }
    if (searchQuery.text) {
      const text = searchQuery.text.toLowerCase();
      candidates = candidates.filter((e) => this.entityMatchesText(e, text));
    }

    const limit = searchQuery.limit ?? 50;
    const offset = searchQuery.offset ?? 0;
    const sliced = candidates.slice(offset, offset + limit);

    this.emitTelemetry('graph.query.executed', {
      query: searchQuery,
      resultCount: sliced.length,
    });

    return sliced.map((entity) => ({
      entity,
      score: 1.0,
      matchedFields: this.getMatchedFields(entity, searchQuery),
    }));
  }

  countEntities(): number {
    return this.entities.size;
  }

  countRelationships(): number {
    return this.relationships.size;
  }

  getAllEntities(): Entity[] {
    return Array.from(this.entities.values());
  }

  getAllRelationships(): Relationship[] {
    return Array.from(this.relationships.values());
  }

  private entityMatchesText(entity: Entity, text: string): boolean {
    const searchable = [
      entity.id,
      entity.type,
      ...entity.tags,
      JSON.stringify(entity.properties).toLowerCase(),
    ];
    return searchable.some((s) => s.toLowerCase().includes(text));
  }

  private getMatchedFields(entity: Entity, query: SearchQuery): string[] {
    const fields: string[] = [];
    if (query.type && entity.type === query.type) fields.push('type');
    if (query.tags) {
      const matched = query.tags.filter((t) => entity.tags.includes(t));
      if (matched.length > 0) fields.push('tags');
    }
    if (query.text) {
      const text = query.text.toLowerCase();
      if (JSON.stringify(entity.properties).toLowerCase().includes(text)) fields.push('properties');
    }
    if (fields.length === 0) fields.push('id');
    return fields;
  }

  private emitTelemetry(type: TelemetryEvent['type'], metadata: Record<string, unknown>): void {
    if (this.telemetrySink) {
      this.telemetrySink.emit({
        type,
        timestamp: new Date().toISOString(),
        metadata,
      });
    }
  }

  static generateId(prefix: string): string {
    return nextId(prefix);
  }
}
