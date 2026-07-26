import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';
import { Ontology } from '../src/ontology/Ontology.js';

describe('Ontology', () => {
  let ontology: Ontology;

  beforeEach(() => {
    ontology = new Ontology();
  });

  test('defines all 17 entity types', () => {
    const types = ontology.getAllEntityTypes();
    assert.equal(types.length, 17);
    assert.ok(types.includes('company'));
    assert.ok(types.includes('user'));
    assert.ok(types.includes('customer'));
    assert.ok(types.includes('objective'));
  });

  test('defines all 13 relationship types', () => {
    const types = ontology.getAllRelationshipTypes();
    assert.equal(types.length, 13);
    assert.ok(types.includes('belongs_to'));
    assert.ok(types.includes('created_by'));
    assert.ok(types.includes('references'));
  });

  test('validates entity with required properties', () => {
    const result = ontology.validateEntity('company', { name: 'Acme' });
    assert.equal(result.valid, true);
  });

  test('detects missing required properties', () => {
    const result = ontology.validateEntity('company', {});
    assert.equal(result.valid, false);
    assert.ok(result.missing.includes('name'));
  });

  test('validates relationship between valid entity types', () => {
    const result = ontology.validateRelationship('created_by', 'project', 'user');
    assert.equal(result.valid, true);
  });

  test('rejects invalid relationship source type', () => {
    const _result = ontology.validateRelationship('created_by', 'company', 'user');
    // company is in sourceTypes for created_by (all types), so this might be valid
    // Let's test a case that should fail
    const result2 = ontology.validateRelationship('assigned_to', 'document', 'user');
    assert.equal(result2.valid, false);
  });

  test('isBidirectional returns true for related_to', () => {
    assert.equal(ontology.isBidirectional('related_to'), true);
  });

  test('isBidirectional returns false for created_by', () => {
    assert.equal(ontology.isBidirectional('created_by'), false);
  });

  test('getEntityDef returns definition', () => {
    const def = ontology.getEntityDef('project');
    assert.ok(def);
    assert.ok(def!.requiredProperties.includes('name'));
    assert.ok(def!.allowedRelationships.length > 0);
  });

  test('getRelationshipDef returns definition', () => {
    const def = ontology.getRelationshipDef('belongs_to');
    assert.ok(def);
    assert.equal(def!.bidirectional, false);
  });
});
