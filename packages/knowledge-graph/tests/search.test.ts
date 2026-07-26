import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';
import { KnowledgeGraph } from '../src/graph/KnowledgeGraph.js';
import { Ontology } from '../src/ontology/Ontology.js';
import { IndexManager } from '../src/indexing/IndexManager.js';
import { SearchEngine } from '../src/search/SearchEngine.js';
import { makeEntity, makeRel } from './helpers.js';

describe('SearchEngine', () => {
  let graph: KnowledgeGraph;
  let search: SearchEngine;
  let index: IndexManager;

  beforeEach(() => {
    const ontology = new Ontology();
    graph = new KnowledgeGraph(ontology);
    index = new IndexManager();
    search = new SearchEngine(graph, index);

    const entities = [
      makeEntity('e1', 'company', 'Acme Corp'),
      makeEntity('e2', 'user', 'John Doe'),
      makeEntity('e3', 'project', 'Project Alpha'),
      makeEntity('e4', 'document', 'Technical Specification'),
      makeEntity('e5', 'ticket', 'Login Bug Report'),
    ];
    for (const e of entities) {
      graph.addEntity(e);
      index.indexEntity(e);
    }
  });

  test('findById returns entity', () => {
    assert.equal(search.findById('e1')?.properties.name, 'Acme Corp');
  });

  test('findById returns undefined for non-existent', () => {
    assert.equal(search.findById('nonexistent'), undefined);
  });

  test('findByType returns entities of that type', () => {
    const results = search.findByType('company');
    assert.equal(results.length, 1);
    assert.equal(results[0].properties.name, 'Acme Corp');
  });

  test('findByType with organization filter', () => {
    graph.addEntity(makeEntity('e6', 'company', 'Other', 'org-2'));
    index.indexEntity(graph.getEntity('e6')!);
    const results = search.findByType('company', 'org-1');
    assert.equal(results.length, 1);
    assert.equal(results[0].organizationId, 'org-1');
  });

  test('findByText searches property values', () => {
    const results = search.findByText('alpha');
    assert.ok(results.length > 0);
    assert.ok(results.some((r) => r.entity.properties.name === 'Project Alpha'));
  });

  test('findByText is case-insensitive', () => {
    const results = search.findByText('ACME');
    assert.ok(results.length > 0);
  });

  test('findByText respects limit', () => {
    const results = search.findByText('a', undefined, 2);
    assert.ok(results.length <= 2);
  });

  test('findNeighbors returns adjacent entities', () => {
    graph.addRelationship(makeRel('r1', 'created_by', 'e3', 'e2'));
    const neighbors = search.findNeighbors('e3');
    assert.ok(neighbors.length > 0);
    assert.ok(neighbors.some((n) => n.entity.id === 'e2'));
  });

  test('findPath finds path between entities', () => {
    graph.addRelationship(makeRel('r1', 'created_by', 'e3', 'e2'));
    const path = search.findPath('e2', 'e3');
    assert.ok(path.found);
  });

  test('combined search with type and text filters', () => {
    const results = search.search({ type: 'document', text: 'technical' });
    assert.ok(results.length > 0);
    assert.ok(results.every((r) => r.entity.type === 'document'));
  });

  test('findByProperties matches property values', () => {
    const results = search.findByProperties({ name: 'John Doe' });
    assert.equal(results.length, 1);
    assert.equal(results[0].id, 'e2');
  });
});
