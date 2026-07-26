import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';
import { PolicyEngine, createPolicyRule } from '../src/policies/PolicyEngine.js';

describe('PolicyEngine', () => {
  let engine: PolicyEngine;

  beforeEach(() => {
    engine = new PolicyEngine();
  });

  test('evaluates with no rules as default allow', () => {
    const result = engine.evaluate({
      identityId: 'u1', resource: 'knowledge_graph', action: 'read',
      organizationId: 'org-1', roles: ['employee'],
    });
    assert.equal(result.decision, 'allow');
    assert.equal(result.matchedRules.length, 0);
  });

  test('matches a rule by resource and action', () => {
    engine.addRule(createPolicyRule('r1', 'Deny KG Write', 'deny', {
      priority: 10, resources: ['knowledge_graph'], actions: ['write'],
    }));
    const result = engine.evaluate({
      identityId: 'u1', resource: 'knowledge_graph', action: 'write',
      organizationId: 'org-1', roles: ['admin'],
    });
    assert.equal(result.decision, 'deny');
    assert.equal(result.matchedRules.length, 1);
  });

  test('does not match when resource differs', () => {
    engine.addRule(createPolicyRule('r1', 'Deny KG Write', 'deny', {
      priority: 10, resources: ['knowledge_graph'], actions: ['write'],
    }));
    const result = engine.evaluate({
      identityId: 'u1', resource: 'secrets', action: 'write',
      organizationId: 'org-1', roles: ['admin'],
    });
    assert.equal(result.decision, 'allow');
  });

  test('higher priority rule wins', () => {
    engine.addRule(createPolicyRule('r1', 'Allow All', 'allow', {
      priority: 1, resources: ['knowledge_graph'],
    }));
    engine.addRule(createPolicyRule('r2', 'Deny All', 'deny', {
      priority: 100, resources: ['knowledge_graph'],
    }));
    const result = engine.evaluate({
      identityId: 'u1', resource: 'knowledge_graph', action: 'read',
      organizationId: 'org-1', roles: ['employee'],
    });
    assert.equal(result.decision, 'deny');
    assert.equal(result.matchedRules[0].id, 'r2');
  });

  test('matches by role', () => {
    engine.addRule(createPolicyRule('r1', 'Viewer Restriction', 'restricted', {
      priority: 10, roles: ['viewer'],
    }));
    const result = engine.evaluate({
      identityId: 'u1', resource: 'knowledge_graph', action: 'read',
      organizationId: 'org-1', roles: ['viewer'],
    });
    assert.equal(result.decision, 'restricted');
  });

  test('matches by organization condition', () => {
    engine.addRule(createPolicyRule('r1', 'Org Policy', 'deny', {
      priority: 10, condition: { organizationId: 'org-2' },
    }));
    const r1 = engine.evaluate({
      identityId: 'u1', resource: 'knowledge_graph', action: 'read',
      organizationId: 'org-1', roles: ['admin'],
    });
    assert.equal(r1.decision, 'allow');

    const r2 = engine.evaluate({
      identityId: 'u1', resource: 'knowledge_graph', action: 'read',
      organizationId: 'org-2', roles: ['admin'],
    });
    assert.equal(r2.decision, 'deny');
  });

  test('matches by time window', () => {
    engine.addRule(createPolicyRule('r1', 'After Hours Deny', 'deny', {
      priority: 10, condition: { timeWindow: { start: '18:00', end: '23:59' } },
    }));
    const result = engine.evaluate({
      identityId: 'u1', resource: 'knowledge_graph', action: 'write',
      organizationId: 'org-1', roles: ['admin'],
      abacContext: { organizationId: 'org-1', timeOfDay: '20:00' },
    });
    assert.equal(result.decision, 'deny');
  });

  test('matches by classification', () => {
    engine.addRule(createPolicyRule('r1', 'Restricted Deny', 'deny', {
      priority: 10, condition: { classification: ['restricted'] },
    }));
    const result = engine.evaluate({
      identityId: 'u1', resource: 'knowledge_graph', action: 'read',
      organizationId: 'org-1', roles: ['employee'],
      abacContext: { organizationId: 'org-1', resourceClassification: 'restricted' },
    });
    assert.equal(result.decision, 'deny');
  });

  test('trace includes all evaluated rules', () => {
    engine.addRule(createPolicyRule('r1', 'Rule 1', 'deny', { priority: 5, resources: ['secrets'] }));
    engine.addRule(createPolicyRule('r2', 'Rule 2', 'allow', { priority: 10, resources: ['knowledge_graph'] }));
    const result = engine.evaluate({
      identityId: 'u1', resource: 'knowledge_graph', action: 'read',
      organizationId: 'org-1', roles: ['admin'],
    });
    assert.ok(result.trace.length >= 1);
    assert.ok(result.trace.some((t) => t.matched));
  });

  test('removeRule removes a rule', () => {
    engine.addRule(createPolicyRule('r1', 'Test', 'deny', { priority: 10 }));
    assert.equal(engine.count(), 1);
    assert.equal(engine.removeRule('r1'), true);
    assert.equal(engine.count(), 0);
  });

  test('clear removes all rules', () => {
    engine.addRule(createPolicyRule('r1', 'A', 'deny', { priority: 10 }));
    engine.addRule(createPolicyRule('r2', 'B', 'allow', { priority: 5 }));
    engine.clear();
    assert.equal(engine.count(), 0);
  });

  test('all 5 policy effects are supported', () => {
    const effects = ['allow', 'deny', 'require_approval', 'restricted', 'read_only'] as const;
    for (const effect of effects) {
      engine.clear();
      engine.addRule(createPolicyRule(`r-${effect}`, `Test ${effect}`, effect, { priority: 10 }));
      const result = engine.evaluate({
        identityId: 'u1', resource: 'knowledge_graph', action: 'read',
        organizationId: 'org-1', roles: ['admin'],
      });
      assert.equal(result.decision, effect);
    }
  });
});
