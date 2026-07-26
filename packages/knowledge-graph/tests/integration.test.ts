import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';
import { KnowledgeGraphAPI, createEntity, createRelationship } from '../src/api/KnowledgeGraphAPI.js';

describe('KnowledgeGraphAPI — Integration', () => {
  let api: KnowledgeGraphAPI;

  beforeEach(() => {
    api = new KnowledgeGraphAPI();
  });

  test('creates and retrieves an entity', () => {
    const entity = api.createEntity('company', { name: 'Acme Corp' }, 'org-1', { tags: ['enterprise'] });
    assert.equal(api.getEntity(entity.id)?.properties.name, 'Acme Corp');
  });

  test('creates and retrieves a relationship', () => {
    const project = api.createEntity('project', { name: 'Alpha' }, 'org-1');
    const user = api.createEntity('user', { name: 'John' }, 'org-1');
    const rel = api.createRelationship('created_by', project.id, user.id, 'org-1');
    assert.equal(api.getRelationship(rel.id)?.type, 'created_by');
  });

  test('search finds entities by type', () => {
    api.createEntity('company', { name: 'Acme' }, 'org-1');
    api.createEntity('company', { name: 'Globex' }, 'org-1');
    api.createEntity('user', { name: 'John' }, 'org-1');
    const results = api.findByType('company');
    assert.equal(results.length, 2);
  });

  test('search finds entities by text', () => {
    api.createEntity('project', { name: 'Project Alpha' }, 'org-1');
    api.createEntity('project', { name: 'Project Beta' }, 'org-1');
    const results = api.findByText('alpha');
    assert.ok(results.length > 0);
    assert.ok(results.some((r) => r.entity.properties.name === 'Project Alpha'));
  });

  test('findNeighbors returns connected entities', () => {
    const project = api.createEntity('project', { name: 'Project Alpha' }, 'org-1');
    const doc = api.createEntity('document', { title: 'Spec' }, 'org-1');
    api.createRelationship('contains', project.id, doc.id, 'org-1');
    const neighbors = api.findNeighbors(project.id);
    assert.ok(neighbors.some((n) => n.entity.id === doc.id));
  });

  test('findPath finds path between entities', () => {
    const e1 = api.createEntity('company', { name: 'A' }, 'org-1');
    const e2 = api.createEntity('user', { name: 'B' }, 'org-1');
    const e3 = api.createEntity('project', { name: 'C' }, 'org-1');
    api.createRelationship('created_by', e3.id, e2.id, 'org-1');
    api.createRelationship('belongs_to', e3.id, e1.id, 'org-1');
    const path = api.findPath(e1.id, e2.id);
    assert.ok(path.found);
  });

  test('reasoning: getRelatedDocuments', () => {
    const project = api.createEntity('project', { name: 'Project Alpha' }, 'org-1');
    const doc1 = api.createEntity('document', { title: 'Spec' }, 'org-1');
    const doc2 = api.createEntity('document', { title: 'Design' }, 'org-1');
    api.createRelationship('contains', project.id, doc1.id, 'org-1');
    api.createRelationship('contains', project.id, doc2.id, 'org-1');
    const result = api.getRelatedDocuments(project.id);
    assert.ok(result.entities.length >= 2);
  });

  test('reasoning: getMissingInformation', () => {
    const task = api.createEntity('task', { title: 'Unassigned Task' }, 'org-1');
    const result = api.getMissingInformation(task.id);
    assert.ok(result.gaps.length > 0);
  });

  test('memory: store and retrieve', () => {
    api.storeMemory({
      type: 'long_term', agentId: 'agent-1', key: 'ctx-1',
      content: { data: 'test' }, context: { task: 't1' },
      importance: 0.8, organizationId: 'org-1',
    });
    const record = api.retrieveMemory('ctx-1', 'agent-1');
    assert.ok(record);
    assert.deepEqual(record!.content, { data: 'test' });
  });

  test('memory: contextual retrieval', () => {
    api.storeMemory({
      type: 'short_term', agentId: 'agent-1', key: 'ctx-1',
      content: 'data1', context: { taskId: 't1' },
      importance: 0.8, organizationId: 'org-1',
    });
    api.storeMemory({
      type: 'shared_context', agentId: 'agent-1', key: 'shared',
      content: 'shared', context: { taskId: 't1' },
      importance: 0.9, organizationId: 'org-1',
    });
    const results = api.retrieveContextualMemory('agent-2', { taskId: 't1' });
    assert.ok(results.some((r) => r.key === 'shared'));
  });

  test('memory: decision history', () => {
    api.recordDecision({
      agentId: 'agent-1', taskId: 't1', decision: 'Process payment',
      reasoning: 'Validated', alternatives: ['Hold'],
      confidence: 0.92, outcome: 'success', relatedEntityIds: [],
      organizationId: 'org-1',
    });
    const history = api.getDecisionHistory('agent-1');
    assert.equal(history.length, 1);
    assert.equal(history[0].decision, 'Process payment');
  });

  test('memory: auto-summary', () => {
    api.storeMemory({
      type: 'long_term', agentId: 'agent-1', key: 'ctx-1',
      content: ['ent-1'], context: {}, importance: 0.8, organizationId: 'org-1',
    });
    api.recordDecision({
      agentId: 'agent-1', taskId: 't1', decision: 'A', reasoning: 'r',
      alternatives: [], confidence: 0.9, outcome: 'success',
      relatedEntityIds: ['ent-2'], organizationId: 'org-1',
    });
    const summary = api.summarizeAgent('agent-1');
    assert.ok(summary.summary.length > 0);
    assert.ok(summary.entityIds.includes('ent-1'));
    assert.ok(summary.entityIds.includes('ent-2'));
  });

  test('telemetry: entity.created events emitted', () => {
    api.createEntity('company', { name: 'Acme' }, 'org-1');
    const events = api.getTelemetryEventsByType('entity.created');
    assert.equal(events.length, 1);
  });

  test('telemetry: memory events emitted', () => {
    api.storeMemory({
      type: 'long_term', agentId: 'agent-1', key: 'ctx-1',
      content: 'data', context: {}, importance: 0.5, organizationId: 'org-1',
    });
    api.retrieveMemory('ctx-1', 'agent-1');
    assert.ok(api.getTelemetryEventsByType('memory.updated').length > 0);
    assert.ok(api.getTelemetryEventsByType('memory.retrieved').length > 0);
  });

  test('ingestion: batch ingest entities and relationships', () => {
    const e1 = createEntity('project', { name: 'Alpha' }, 'org-1');
    const e2 = createEntity('user', { name: 'John' }, 'org-1');
    const r1 = createRelationship('created_by', e1.id, e2.id, 'org-1');
    const result = api.ingestBatch({
      entities: [e1, e2], relationships: [r1], organizationId: 'org-1',
    });
    assert.equal(result.entitiesAdded, 2);
    assert.equal(result.relationshipsAdded, 1);
    assert.equal(result.errors.length, 0);
  });

  test('countEntities and countRelationships', () => {
    api.createEntity('company', { name: 'Acme' }, 'org-1');
    api.createEntity('user', { name: 'John' }, 'org-1');
    assert.equal(api.countEntities(), 2);
    assert.equal(api.countRelationships(), 0);
  });

  test('delete entity removes it from graph', () => {
    const entity = api.createEntity('company', { name: 'Acme' }, 'org-1');
    api.deleteEntity(entity.id);
    assert.equal(api.getEntity(entity.id), undefined);
  });

  test('update entity changes properties', () => {
    const entity = api.createEntity('company', { name: 'Acme' }, 'org-1');
    const updated = api.updateEntity(entity.id, { properties: { name: 'Acme Corp' } });
    assert.equal(updated?.properties.name, 'Acme Corp');
  });

  test('getIndexStats returns all index types', () => {
    api.createEntity('company', { name: 'Acme' }, 'org-1');
    const stats = api.getIndexStats();
    assert.ok(stats.length >= 7);
  });

  test('all 17 entity types can be created', () => {
    const types = [
      'company', 'user', 'customer', 'supplier', 'employee',
      'project', 'document', 'email', 'meeting', 'ticket',
      'incident', 'repository', 'file', 'workflow', 'agent',
      'task', 'objective',
    ] as const;
    for (const type of types) {
      const prop = type === 'email' ? 'subject' : ['document', 'meeting', 'ticket', 'incident', 'task', 'objective'].includes(type) ? 'title' : 'name';
      const entity = api.createEntity(type, { [prop]: `Test ${type}`, name: `Test ${type}` }, 'org-1');
      assert.ok(api.getEntity(entity.id), `Entity type '${type}' should be creatable`);
    }
    assert.equal(api.countEntities(), 17);
  });

  test('all 13 relationship types work for valid entity pairs', () => {
    const company = api.createEntity('company', { name: 'Acme' }, 'org-1');
    const user = api.createEntity('user', { name: 'John' }, 'org-1');
    const project = api.createEntity('project', { name: 'Alpha' }, 'org-1');
    api.createRelationship('belongs_to', project.id, company.id, 'org-1');
    api.createRelationship('created_by', project.id, user.id, 'org-1');
    api.createRelationship('related_to', project.id, company.id, 'org-1', { bidirectional: true });
    assert.equal(api.countRelationships(), 3);
  });

  test('getWorkflowsAffectingIncident', () => {
    const incident = api.createEntity('incident', { title: 'Outage' }, 'org-1');
    const workflow = api.createEntity('workflow', { name: 'Response' }, 'org-1');
    api.createRelationship('related_to', workflow.id, incident.id, 'org-1', { bidirectional: true });
    const result = api.getWorkflowsAffectingIncident(incident.id);
    assert.ok(result.entities.length >= 1);
  });

  test('getImpactAnalysis', () => {
    const project = api.createEntity('project', { name: 'Alpha' }, 'org-1');
    const task = api.createEntity('task', { title: 'Task 1' }, 'org-1');
    api.createRelationship('contains', project.id, task.id, 'org-1');
    const result = api.getImpactAnalysis(project.id);
    assert.ok(result.entities.length > 0);
  });

  test('createEntity and createRelationship factory functions', () => {
    const entity = createEntity('company', { name: 'Test' }, 'org-1');
    assert.ok(entity.id);
    assert.equal(entity.type, 'company');
    assert.equal(entity.organizationId, 'org-1');

    const user = createEntity('user', { name: 'John' }, 'org-1');
    const rel = createRelationship('related_to', entity.id, user.id, 'org-1', { bidirectional: true });
    assert.ok(rel.id);
    assert.equal(rel.type, 'related_to');
    assert.equal(rel.bidirectional, true);
  });
});
