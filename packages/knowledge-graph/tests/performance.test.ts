import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { KnowledgeGraph } from '../src/graph/KnowledgeGraph.js';
import { Ontology } from '../src/ontology/Ontology.js';
import { IndexManager } from '../src/indexing/IndexManager.js';
import { IngestionEngine } from '../src/ingestion/IngestionEngine.js';
import { SearchEngine } from '../src/search/SearchEngine.js';
import { createEntity } from '../src/api/KnowledgeGraphAPI.js';
import type { Entity } from '../src/models.js';

import { ReasoningEngine } from '../src/reasoning/ReasoningEngine.js';

describe('Performance — 100k entities', () => {
  function buildGraph(count: number): { graph: KnowledgeGraph; index: IndexManager; search: SearchEngine; entities: Entity[] } {
    const ontology = new Ontology();
    const graph = new KnowledgeGraph(ontology);
    const index = new IndexManager();
    const ingestion = new IngestionEngine(graph, index);

    const entities: Entity[] = [];
    for (let i = 0; i < count; i++) {
      const type = i % 3 === 0 ? 'company' : i % 3 === 1 ? 'user' : 'task';
      const prop = type === 'task' ? 'title' : 'name';
      entities.push(createEntity(type, { [prop]: `Entity-${i}`, name: `Entity-${i}` }, 'org-1', {
        tags: i % 10 === 0 ? ['special'] : [],
      }));
    }

    ingestion.ingestBatch({ entities, relationships: [], organizationId: 'org-1' });
    const search = new SearchEngine(graph, index);
    return { graph, index, search, entities };
  }

  test('ingests 100,000 entities efficiently', () => {
    const count = 100_000;
    const ontology = new Ontology();
    const graph = new KnowledgeGraph(ontology);
    const index = new IndexManager();
    const ingestion = new IngestionEngine(graph, index);

    const entities: Entity[] = [];
    for (let i = 0; i < count; i++) {
      entities.push(createEntity('company', { name: `Entity-${i}` }, 'org-1'));
    }

    const startMs = Date.now();
    const result = ingestion.ingestBatch({ entities, relationships: [], organizationId: 'org-1' });
    const durationMs = Date.now() - startMs;

    assert.equal(result.entitiesAdded, count);
    assert.equal(result.errors.length, 0);
    assert.equal(graph.countEntities(), count);
    assert.ok(durationMs < 60000, `Ingestion of ${count} entities took ${durationMs}ms`);
  });

  test('searches 100k entities efficiently', () => {
    const { search } = buildGraph(100_000);

    // Search by type
    const typeStart = Date.now();
    const typeResults = search.findByType('company');
    const typeDuration = Date.now() - typeStart;
    assert.ok(typeResults.length > 0);
    assert.ok(typeDuration < 5000, `Type search took ${typeDuration}ms`);

    // Search by text
    const textStart = Date.now();
    const textResults = search.findByText('Entity-99999');
    const textDuration = Date.now() - textStart;
    assert.ok(textResults.length > 0);
    assert.ok(textDuration < 5000, `Text search took ${textDuration}ms`);

    // Search by tag
    const tagStart = Date.now();
    const tagResults = search.search({ tags: ['special'], limit: 100 });
    const tagDuration = Date.now() - tagStart;
    assert.ok(tagResults.length > 0);
    assert.ok(tagDuration < 5000, `Tag search took ${tagDuration}ms`);
  });

  test('builds graph with 10k entities and 5k relationships', () => {
    const { graph, index, entities } = buildGraph(10_000);
    const ingestion = new IngestionEngine(graph, index);

    const rels = [];
    for (let i = 0; i < 5_000; i++) {
      const source = entities[i % 10_000];
      const target = entities[(i + 1) % 10_000];
      if (source.id !== target.id) {
        rels.push({
          id: `rel-${i}`, type: 'related_to' as const,
          sourceId: source.id, targetId: target.id,
          properties: {}, bidirectional: true,
          createdAt: new Date().toISOString(), organizationId: 'org-1',
        });
      }
    }
    ingestion.ingestBatch({ entities: [], relationships: rels, organizationId: 'org-1' });

    assert.equal(graph.countEntities(), 10_000);
    assert.ok(graph.countRelationships() > 0);

    const pathStart = Date.now();
    graph.findPath(entities[0].id, entities[9_999].id);
    const pathDuration = Date.now() - pathStart;
    assert.ok(pathDuration < 10000, `Path finding took ${pathDuration}ms`);
  });

  test('reasoning over large connected graph', () => {
    const ontology = new Ontology();
    const graph = new KnowledgeGraph(ontology);
    const index = new IndexManager();
    const ingestion = new IngestionEngine(graph, index);

    const project = createEntity('project', { name: 'Mega Project' }, 'org-1');
    ingestion.ingestEntity(project);

    const entities: Entity[] = [];
    for (let i = 0; i < 1_000; i++) {
      const doc = createEntity('document', { title: `Doc-${i}`, name: `Doc-${i}` }, 'org-1');
      entities.push(doc);
    }
    ingestion.ingestBatch({ entities, relationships: [], organizationId: 'org-1' });

    for (const doc of entities) {
      graph.addRelationship({
        id: `rel-${doc.id}`, type: 'contains', sourceId: project.id, targetId: doc.id,
        properties: {}, bidirectional: false, createdAt: '', organizationId: 'org-1',
      });
    }

    const reasoning = new ReasoningEngine(graph, ontology);

    const start = Date.now();
    const result = reasoning.getRelatedDocuments(project.id);
    const duration = Date.now() - start;

    assert.ok(result.entities.length >= 1_000);
    assert.ok(duration < 5000, `Reasoning took ${duration}ms`);
  });
});
