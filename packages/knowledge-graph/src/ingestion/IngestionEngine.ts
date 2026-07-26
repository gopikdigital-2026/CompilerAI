import type {
  Entity,
  IIngestionEngine,
  IIndexManager,
  IKnowledgeGraph,
  IngestionBatch,
  IngestionResult,
  Relationship,
} from '../models.js';

export class IngestionEngine implements IIngestionEngine {
  private readonly graph: IKnowledgeGraph;
  private readonly index: IIndexManager;

  constructor(graph: IKnowledgeGraph, index: IIndexManager) {
    this.graph = graph;
    this.index = index;
  }

  ingestBatch(batch: IngestionBatch): IngestionResult {
    const startMs = Date.now();
    let entitiesAdded = 0;
    let entitiesUpdated = 0;
    let relationshipsAdded = 0;
    let relationshipsUpdated = 0;
    const errors: string[] = [];

    for (const entity of batch.entities) {
      try {
        const existing = this.graph.getEntity(entity.id);
        if (existing) {
          this.graph.updateEntity(entity.id, entity);
          this.index.removeEntity(entity.id);
          this.index.indexEntity(entity);
          entitiesUpdated++;
        } else {
          this.graph.addEntity(entity);
          this.index.indexEntity(entity);
          entitiesAdded++;
        }
      } catch (err) {
        errors.push(`Entity '${entity.id}': ${(err as Error).message}`);
      }
    }

    for (const rel of batch.relationships) {
      try {
        const existing = this.graph.getRelationship(rel.id);
        if (existing) {
          this.graph.deleteRelationship(rel.id);
          this.graph.addRelationship(rel);
          this.index.indexRelationship(rel);
          relationshipsUpdated++;
        } else {
          this.graph.addRelationship(rel);
          this.index.indexRelationship(rel);
          relationshipsAdded++;
        }
      } catch (err) {
        errors.push(`Relationship '${rel.id}': ${(err as Error).message}`);
      }
    }

    return {
      entitiesAdded,
      entitiesUpdated,
      relationshipsAdded,
      relationshipsUpdated,
      errors,
      durationMs: Date.now() - startMs,
    };
  }

  ingestEntity(entity: Entity): boolean {
    try {
      const existing = this.graph.getEntity(entity.id);
      if (existing) {
        this.graph.updateEntity(entity.id, entity);
        this.index.removeEntity(entity.id);
      } else {
        this.graph.addEntity(entity);
      }
      this.index.indexEntity(entity);
      return true;
    } catch {
      return false;
    }
  }

  ingestRelationship(rel: Relationship): boolean {
    try {
      const existing = this.graph.getRelationship(rel.id);
      if (existing) {
        this.graph.deleteRelationship(rel.id);
      }
      this.graph.addRelationship(rel);
      this.index.indexRelationship(rel);
      return true;
    } catch {
      return false;
    }
  }
}
