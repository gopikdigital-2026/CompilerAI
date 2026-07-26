import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';
import { KnowledgeGraph } from '../src/graph/KnowledgeGraph.js';
import { Ontology } from '../src/ontology/Ontology.js';
import { IndexManager } from '../src/indexing/IndexManager.js';
import { makeEntity } from './helpers.js';

describe('IndexManager', () => {
  let graph: KnowledgeGraph;
  let index: IndexManager;
  let ontology: Ontology;

  beforeEach(() => {
    ontology = new Ontology();
    graph = new KnowledgeGraph(ontology);
    index = new IndexManager();
  });

  test('indexes entity by type', () => {
    const entity = makeEntity('e1', 'company', 'Acme');
    graph.addEntity(entity);
    index.indexEntity(entity);
    assert.ok(index.getByType('company').includes('e1'));
  });

  test('indexes entity by tags', () => {
    const entity = makeEntity('e1', 'company', 'Acme', 'org-1', ['enterprise', 'customer']);
    graph.addEntity(entity);
    index.indexEntity(entity);
    assert.ok(index.getByTag('enterprise').includes('e1'));
    assert.ok(index.getByTag('customer').includes('e1'));
  });

  test('indexes entity by organization', () => {
    const entity = makeEntity('e1', 'company', 'Acme', 'org-1');
    graph.addEntity(entity);
    index.indexEntity(entity);
    assert.ok(index.getByOrganization('org-1').includes('e1'));
  });

  test('indexes entity by owner', () => {
    const entity = { ...makeEntity('e1', 'company', 'Acme'), metadata: { ownerId: 'user-1' } };
    graph.addEntity(entity);
    index.indexEntity(entity);
    assert.ok(index.getByOwner('user-1').includes('e1'));
  });

  test('indexes entity by connector', () => {
    const entity = { ...makeEntity('e1', 'company', 'Acme'), metadata: { connector: 'salesforce' } };
    graph.addEntity(entity);
    index.indexEntity(entity);
    assert.ok(index.getByConnector('salesforce').includes('e1'));
  });

  test('indexes entity by date range', () => {
    const entity = makeEntity('e1', 'company', 'Acme');
    graph.addEntity(entity);
    index.indexEntity(entity);
    const today = new Date().toISOString().slice(0, 10);
    const ids = index.getByDateRange(today, today);
    assert.ok(ids.includes('e1'));
  });

  test('searchText finds entities by property values', () => {
    const entity = makeEntity('e1', 'company', 'Acme Corporation');
    graph.addEntity(entity);
    index.indexEntity(entity);
    const ids = index.searchText('acme');
    assert.ok(ids.includes('e1'));
  });

  test('searchText with multiple tokens scores results', () => {
    const entity1 = makeEntity('e1', 'company', 'Acme Corporation');
    const entity2 = makeEntity('e2', 'company', 'Acme Industries');
    graph.addEntity(entity1);
    graph.addEntity(entity2);
    index.indexEntity(entity1);
    index.indexEntity(entity2);
    const ids = index.searchText('acme corporation');
    assert.ok(ids.length > 0);
    assert.equal(ids[0], 'e1');
  });

  test('removeEntity cleans up all indexes', () => {
    const entity = makeEntity('e1', 'company', 'Acme', 'org-1', ['customer']);
    graph.addEntity(entity);
    index.indexEntity(entity);
    index.removeEntity('e1');
    assert.equal(index.getByType('company').includes('e1'), false);
    assert.equal(index.getByTag('customer').includes('e1'), false);
  });

  test('getStats returns all index types', () => {
    const stats = index.getStats();
    assert.equal(stats.length, 7);
    const types = stats.map((s) => s.type);
    assert.ok(types.includes('entity_type'));
    assert.ok(types.includes('tags'));
    assert.ok(types.includes('text'));
  });

  test('rebuild reindexes all entities from graph', () => {
    graph.addEntity(makeEntity('e1', 'company', 'Acme'));
    graph.addEntity(makeEntity('e2', 'user', 'John'));
    index.rebuild(graph);
    assert.ok(index.getByType('company').includes('e1'));
    assert.ok(index.getByType('user').includes('e2'));
  });
});
