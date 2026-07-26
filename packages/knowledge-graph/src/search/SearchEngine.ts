import type {
  Entity,
  EntityType,
  IIndexManager,
  IKnowledgeGraph,
  ISearchEngine,
  NeighborResult,
  PathResult,
  SearchResult,
  SearchQuery,
} from '../models.js';

export class SearchEngine implements ISearchEngine {
  private readonly graph: IKnowledgeGraph;
  private readonly index: IIndexManager;

  constructor(graph: IKnowledgeGraph, index: IIndexManager) {
    this.graph = graph;
    this.index = index;
  }

  search(query: SearchQuery): SearchResult[] {
    // Use the graph's built-in query for structured filters
    const results = this.graph.query(query);

    // If text search is involved, boost scores using the index
    if (query.text) {
      const indexedIds = this.index.searchText(query.text, query.limit ?? 50);
      const idSet = new Set(indexedIds);
      for (const result of results) {
        if (idSet.has(result.entity.id)) {
          result.score += 0.5;
        }
      }
      // Re-sort by score
      results.sort((a, b) => b.score - a.score);
    }

    return results;
  }

  findById(id: string): Entity | undefined {
    return this.graph.getEntity(id);
  }

  findByType(type: EntityType, organizationId?: string): Entity[] {
    const ids = this.index.getByType(type);
    return ids
      .map((id) => this.graph.getEntity(id))
      .filter((e): e is Entity => e !== undefined && (!organizationId || e.organizationId === organizationId));
  }

  findByProperties(properties: Record<string, unknown>, organizationId?: string): Entity[] {
    const results = this.graph.query({ properties, organizationId, limit: Number.MAX_SAFE_INTEGER });
    return results.map((r) => r.entity);
  }

  findByText(text: string, organizationId?: string, limit: number = 50): SearchResult[] {
    const ids = this.index.searchText(text, limit * 2);
    const results: SearchResult[] = [];

    for (const id of ids) {
      const entity = this.graph.getEntity(id);
      if (!entity) continue;
      if (organizationId && entity.organizationId !== organizationId) continue;
      const score = this.computeTextScore(entity, text);
      results.push({
        entity,
        score,
        matchedFields: this.getMatchedFields(entity, text),
      });
      if (results.length >= limit) break;
    }

    return results;
  }

  findNeighbors(entityId: string): NeighborResult[] {
    return this.graph.getNeighbors(entityId);
  }

  findPath(startId: string, endId: string): PathResult {
    return this.graph.findPath(startId, endId);
  }

  private computeTextScore(entity: Entity, text: string): number {
    const textLower = text.toLowerCase();
    let score = 0;
    const tokens = textLower.split(/\s+/).filter((t) => t.length > 0);
    const entityText = JSON.stringify(entity.properties).toLowerCase() + ' ' + entity.type + ' ' + entity.tags.join(' ');

    for (const token of tokens) {
      if (entityText.includes(token)) score += 1;
    }
    return score / Math.max(1, tokens.length);
  }

  private getMatchedFields(entity: Entity, text: string): string[] {
    const fields: string[] = [];
    const textLower = text.toLowerCase();
    if (entity.type.toLowerCase().includes(textLower)) fields.push('type');
    if (entity.tags.some((t) => t.toLowerCase().includes(textLower))) fields.push('tags');
    if (JSON.stringify(entity.properties).toLowerCase().includes(textLower)) fields.push('properties');
    if (fields.length === 0) fields.push('partial');
    return fields;
  }
}
