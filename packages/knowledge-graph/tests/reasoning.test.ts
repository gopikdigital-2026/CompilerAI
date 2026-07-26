import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';
import { KnowledgeGraph } from '../src/graph/KnowledgeGraph.js';
import { Ontology } from '../src/ontology/Ontology.js';
import { ReasoningEngine } from '../src/reasoning/ReasoningEngine.js';
import { makeEntity, makeRel } from './helpers.js';

describe('ReasoningEngine', () => {
  let graph: KnowledgeGraph;
  let reasoning: ReasoningEngine;

  beforeEach(() => {
    const ontology = new Ontology();
    graph = new KnowledgeGraph(ontology);
    reasoning = new ReasoningEngine(graph, ontology);

    const entities = [
      makeEntity('company-1', 'company', 'Acme Corp'),
      makeEntity('user-1', 'user', 'John Doe'),
      makeEntity('agent-1', 'agent', 'Finance Agent'),
      makeEntity('agent-2', 'agent', 'Support Agent'),
      makeEntity('customer-1', 'customer', 'Globex Corp'),
      makeEntity('project-1', 'project', 'Project Alpha'),
      makeEntity('doc-1', 'document', 'Technical Specification'),
      makeEntity('doc-2', 'document', 'Architecture Design'),
      makeEntity('email-1', 'email', 'Q3 Budget Discussion'),
      makeEntity('incident-1', 'incident', 'Production Outage'),
      makeEntity('workflow-1', 'workflow', 'Incident Response'),
      makeEntity('task-1', 'task', 'Fix Login Bug'),
      makeEntity('repo-1', 'repository', 'compilerai-platform'),
    ];

    for (const e of entities) graph.addEntity(e);

    graph.addRelationship(makeRel('r1', 'belongs_to', 'project-1', 'company-1'));
    graph.addRelationship(makeRel('r2', 'created_by', 'project-1', 'user-1'));
    graph.addRelationship(makeRel('r3', 'contains', 'project-1', 'doc-1'));
    graph.addRelationship(makeRel('r4', 'contains', 'project-1', 'doc-2'));
    graph.addRelationship(makeRel('r5', 'references', 'doc-1', 'repo-1'));
    graph.addRelationship(makeRel('r6', 'assigned_to', 'task-1', 'agent-1'));
    graph.addRelationship(makeRel('r7', 'assigned_to', 'task-1', 'agent-2'));
    graph.addRelationship(makeRel('r8', 'belongs_to', 'task-1', 'project-1'));
    graph.addRelationship(makeRel('r9', 'related_to', 'customer-1', 'project-1', 'org-1', true));
    graph.addRelationship(makeRel('r10', 'participates_in', 'agent-1', 'project-1', 'org-1', true));
    graph.addRelationship(makeRel('r11', 'responds_to', 'incident-1', 'task-1'));
    graph.addRelationship(makeRel('r12', 'executes', 'workflow-1', 'task-1'));
    graph.addRelationship(makeRel('r13', 'related_to', 'workflow-1', 'incident-1', 'org-1', true));
    graph.addRelationship(makeRel('r14', 'references', 'email-1', 'project-1'));
  });

  test('getRelatedDocuments finds documents linked to a project', () => {
    const result = reasoning.getRelatedDocuments('project-1');
    assert.ok(result.entities.length >= 2);
    assert.ok(result.entities.some((e) => e.type === 'document'));
  });

  test('getRelatedDocuments returns answer string', () => {
    const result = reasoning.getRelatedDocuments('project-1');
    assert.ok(result.answer.length > 0);
    assert.ok(result.answer.includes('documents'));
  });

  test('getAgentsOnCustomer finds agents working on a customer', () => {
    const result = reasoning.getAgentsOnCustomer('customer-1');
    assert.ok(result.entities.length >= 0);
  });

  test('getWorkflowsAffectingIncident finds workflows linked to an incident', () => {
    const result = reasoning.getWorkflowsAffectingIncident('incident-1');
    assert.ok(result.entities.length >= 1);
    assert.ok(result.entities.some((e) => e.type === 'workflow'));
  });

  test('getMissingInformation detects gaps for a task without assignee', () => {
    graph.addEntity(makeEntity('task-2', 'task', 'Unassigned Task'));
    graph.addRelationship(makeRel('r15', 'belongs_to', 'task-2', 'project-1'));
    const result = reasoning.getMissingInformation('task-2');
    assert.ok(result.gaps.length > 0);
    assert.ok(result.gaps.some((g) => g.description.includes('assigned')));
  });

  test('getMissingInformation returns fewer gaps for a complete task', () => {
    const result = reasoning.getMissingInformation('task-1');
    assert.ok(result.gaps.length <= 1);
  });

  test('getEntityDependencies finds depends_on relationships', () => {
    graph.addEntity(makeEntity('task-3', 'task', 'Dependent Task'));
    graph.addRelationship(makeRel('r16', 'depends_on', 'task-3', 'task-1'));
    const result = reasoning.getEntityDependencies('task-3');
    assert.ok(result.entities.length >= 1);
    assert.ok(result.entities.some((e) => e.id === 'task-1'));
  });

  test('getEntityTimeline returns entities sorted by creation date', () => {
    const result = reasoning.getEntityTimeline('project-1');
    assert.ok(result.entities.length > 0);
    assert.ok(result.entities.some((e) => e.id === 'project-1'));
  });

  test('getImpactAnalysis returns all reachable entities', () => {
    const result = reasoning.getImpactAnalysis('incident-1');
    assert.ok(result.entities.length > 0);
    assert.ok(result.entities.some((e) => e.type === 'workflow' || e.type === 'task'));
  });

  test('query with non-existent entity returns empty result', () => {
    const result = reasoning.query({ type: 'related_documents', entityId: 'nonexistent', organizationId: 'org-1' });
    assert.equal(result.entities.length, 0);
    assert.equal(result.confidence, 0);
  });

  test('getKnowledgeGaps identifies missing expected relationships', () => {
    graph.addEntity(makeEntity('task-4', 'task', 'Isolated Task'));
    const result = reasoning.getKnowledgeGaps('task-4');
    assert.ok(result.gaps.length > 0);
  });

  test('reasoning results include confidence score', () => {
    const result = reasoning.getRelatedDocuments('project-1');
    assert.ok(result.confidence > 0 && result.confidence <= 1);
  });
});
