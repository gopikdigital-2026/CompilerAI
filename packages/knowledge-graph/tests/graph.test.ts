import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';
import { KnowledgeGraph } from '../src/graph/KnowledgeGraph.js';
import { Ontology } from '../src/ontology/Ontology.js';
import { makeEntity, makeRel } from './helpers.js';

describe('KnowledgeGraph — Entities', () => {
  let graph: KnowledgeGraph;
  let ontology: Ontology;

  beforeEach(() => {
    ontology = new Ontology();
    graph = new KnowledgeGraph(ontology);
  });

  test('adds and retrieves an entity', () => {
    const entity = makeEntity('e1', 'company', 'Acme Inc');
    graph.addEntity(entity);
    assert.equal(graph.getEntity('e1')?.id, 'e1');
  });

  test('returns undefined for non-existent entity', () => {
    assert.equal(graph.getEntity('nonexistent'), undefined);
  });

  test('updates an entity', () => {
    graph.addEntity(makeEntity('e1', 'company', 'Acme'));
    const updated = graph.updateEntity('e1', { properties: { name: 'Acme Corp' } });
    assert.equal(updated?.properties.name, 'Acme Corp');
  });

  test('deleteEntity removes entity and its relationships', () => {
    graph.addEntity(makeEntity('e1', 'project', 'Alpha'));
    graph.addEntity(makeEntity('e2', 'user', 'John'));
    graph.addRelationship(makeRel('r1', 'created_by', 'e1', 'e2'));
    graph.deleteEntity('e1');
    assert.equal(graph.getEntity('e1'), undefined);
    assert.equal(graph.getRelationship('r1'), undefined);
  });

  test('addEntity throws on missing required properties', () => {
    const bad = { ...makeEntity('e1', 'company', 'Acme'), properties: {} };
    assert.throws(() => graph.addEntity(bad));
  });

  test('countEntities returns correct count', () => {
    graph.addEntity(makeEntity('e1', 'company', 'A'));
    graph.addEntity(makeEntity('e2', 'user', 'B'));
    assert.equal(graph.countEntities(), 2);
  });
});

describe('KnowledgeGraph — Relationships', () => {
  let graph: KnowledgeGraph;
  let ontology: Ontology;

  beforeEach(() => {
    ontology = new Ontology();
    graph = new KnowledgeGraph(ontology);
    graph.addEntity(makeEntity('e1', 'company', 'Acme'));
    graph.addEntity(makeEntity('e2', 'user', 'John'));
    graph.addEntity(makeEntity('e3', 'project', 'Project Alpha'));
  });

  test('adds and retrieves a relationship', () => {
    graph.addRelationship(makeRel('r1', 'created_by', 'e3', 'e2'));
    assert.equal(graph.getRelationship('r1')?.type, 'created_by');
  });

  test('throws when source entity does not exist', () => {
    assert.throws(() => graph.addRelationship(makeRel('r1', 'created_by', 'nonexistent', 'e2')));
  });

  test('throws when target entity does not exist', () => {
    assert.throws(() => graph.addRelationship(makeRel('r1', 'created_by', 'e3', 'nonexistent')));
  });

  test('getRelationships returns all relationships for an entity', () => {
    graph.addRelationship(makeRel('r1', 'created_by', 'e3', 'e2'));
    graph.addRelationship(makeRel('r2', 'belongs_to', 'e3', 'e1'));
    assert.equal(graph.getRelationships('e3').length, 2);
  });

  test('deleteRelationship removes it', () => {
    graph.addRelationship(makeRel('r1', 'created_by', 'e3', 'e2'));
    assert.equal(graph.deleteRelationship('r1'), true);
    assert.equal(graph.getRelationship('r1'), undefined);
  });

  test('bidirectional relationships appear from both sides', () => {
    graph.addRelationship(makeRel('r1', 'related_to', 'e1', 'e2', 'org-1', true));
    const e1Rels = graph.getRelationships('e1');
    const e2Rels = graph.getRelationships('e2');
    assert.ok(e1Rels.length >= 1);
    assert.ok(e2Rels.length >= 1);
  });

  test('countRelationships returns correct count', () => {
    graph.addRelationship(makeRel('r1', 'created_by', 'e3', 'e2'));
    graph.addRelationship(makeRel('r2', 'belongs_to', 'e3', 'e1'));
    assert.equal(graph.countRelationships(), 2);
  });
});

describe('KnowledgeGraph — Traversal', () => {
  let graph: KnowledgeGraph;
  let ontology: Ontology;

  beforeEach(() => {
    ontology = new Ontology();
    graph = new KnowledgeGraph(ontology);
    graph.addEntity(makeEntity('e1', 'company', 'Acme'));
    graph.addEntity(makeEntity('e2', 'user', 'John'));
    graph.addEntity(makeEntity('e3', 'project', 'Alpha'));
    graph.addEntity(makeEntity('e4', 'document', 'Spec'));
    graph.addEntity(makeEntity('e5', 'task', 'Task 1'));
  });

  test('getNeighbors returns direct neighbors', () => {
    graph.addRelationship(makeRel('r1', 'created_by', 'e3', 'e2'));
    graph.addRelationship(makeRel('r2', 'belongs_to', 'e3', 'e1'));
    const neighbors = graph.getNeighbors('e3');
    assert.equal(neighbors.length, 2);
  });

  test('findPath finds a path between connected entities', () => {
    graph.addRelationship(makeRel('r1', 'created_by', 'e3', 'e2'));
    graph.addRelationship(makeRel('r2', 'belongs_to', 'e3', 'e1'));
    const path = graph.findPath('e1', 'e3');
    assert.ok(path.found);
    assert.ok(path.path.length > 0);
  });

  test('findPath returns found=false for disconnected entities', () => {
    const path = graph.findPath('e1', 'e5');
    assert.equal(path.found, false);
  });

  test('findPath returns same start/end as a single-node path', () => {
    const path = graph.findPath('e1', 'e1');
    assert.ok(path.found);
    assert.equal(path.path.length, 1);
  });

  test('findPath handles non-existent entities', () => {
    const path = graph.findPath('nonexistent', 'e1');
    assert.equal(path.found, false);
  });

  test('multi-hop path traversal works', () => {
    graph.addRelationship(makeRel('r1', 'created_by', 'e3', 'e2'));
    graph.addRelationship(makeRel('r2', 'contains', 'e3', 'e4'));
    graph.addRelationship(makeRel('r3', 'references', 'e4', 'e5'));
    const path = graph.findPath('e2', 'e5');
    assert.ok(path.found);
    assert.ok(path.path.length >= 3);
  });
});

describe('KnowledgeGraph — Query', () => {
  let graph: KnowledgeGraph;
  let ontology: Ontology;

  beforeEach(() => {
    ontology = new Ontology();
    graph = new KnowledgeGraph(ontology);
    graph.addEntity({ ...makeEntity('e1', 'company', 'Acme'), tags: ['customer', 'enterprise'] });
    graph.addEntity({ ...makeEntity('e2', 'user', 'John'), tags: ['admin'] });
    graph.addEntity({ ...makeEntity('e3', 'project', 'Alpha'), tags: ['active'] });
  });

  test('query by type returns matching entities', () => {
    const results = graph.query({ type: 'company' });
    assert.equal(results.length, 1);
    assert.equal(results[0].entity.type, 'company');
  });

  test('query by tags returns matching entities', () => {
    const results = graph.query({ tags: ['customer'] });
    assert.equal(results.length, 1);
  });

  test('query by properties returns matching entities', () => {
    const results = graph.query({ properties: { name: 'John' } });
    assert.equal(results.length, 1);
    assert.equal(results[0].entity.properties.name, 'John');
  });

  test('query by text matches property values', () => {
    const results = graph.query({ text: 'alpha' });
    assert.ok(results.length > 0);
    assert.ok(results.some((r) => r.entity.properties.name === 'Alpha'));
  });

  test('query with limit returns limited results', () => {
    const results = graph.query({ limit: 1 });
    assert.equal(results.length, 1);
  });

  test('query by organization filters correctly', () => {
    graph.addEntity({ ...makeEntity('e4', 'company', 'Other', 'org-2') });
    const results = graph.query({ organizationId: 'org-2' });
    assert.equal(results.length, 1);
  });
});
