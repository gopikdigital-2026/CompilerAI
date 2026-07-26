import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';
import { PolicyEngine } from '../src/policies/PolicyEngine.js';
import { AuthorizationEngine } from '../src/authorization/AuthorizationEngine.js';
import { createPolicyRule } from '../src/policies/PolicyEngine.js';
import { hasRolePermission, getAllRoles, getRoleDefinition } from '../src/roles/RoleDefinitions.js';

describe('RBAC', () => {
  test('owner has admin on all resources', () => {
    assert.equal(hasRolePermission('owner', 'knowledge_graph', 'admin'), true);
    assert.equal(hasRolePermission('owner', 'secrets', 'admin'), true);
  });

  test('viewer only has read access', () => {
    assert.equal(hasRolePermission('viewer', 'knowledge_graph', 'read'), true);
    assert.equal(hasRolePermission('viewer', 'knowledge_graph', 'write'), false);
  });

  test('auditor has read on audit but not write', () => {
    assert.equal(hasRolePermission('auditor', 'audit', 'read'), true);
    assert.equal(hasRolePermission('auditor', 'audit', 'write'), false);
  });

  test('ai_agent can execute on multi_agent', () => {
    assert.equal(hasRolePermission('ai_agent', 'multi_agent', 'execute'), true);
  });

  test('employee cannot admin settings', () => {
    assert.equal(hasRolePermission('employee', 'settings', 'admin'), false);
  });

  test('getAllRoles returns 7 roles', () => {
    assert.equal(getAllRoles().length, 7);
  });

  test('getRoleDefinition returns role with permissions', () => {
    const role = getRoleDefinition('admin');
    assert.equal(role.name, 'admin');
    assert.ok(role.permissions.length > 0);
    assert.ok(role.priority > 0);
  });
});

describe('ABAC + Authorization Engine', () => {
  let authz: AuthorizationEngine;
  let policies: PolicyEngine;

  beforeEach(() => {
    policies = new PolicyEngine();
    authz = new AuthorizationEngine(policies);
  });

  test('authorizes with valid RBAC role', () => {
    const decision = authz.authorize({
      identityId: 'u1', resource: 'knowledge_graph', action: 'read',
      organizationId: 'org-1', roles: ['employee'],
    });
    assert.equal(decision.allowed, true);
    assert.equal(decision.matchedBy, 'rbac');
  });

  test('denies when no role grants the action', () => {
    const decision = authz.authorize({
      identityId: 'u1', resource: 'knowledge_graph', action: 'delete',
      organizationId: 'org-1', roles: ['viewer'],
    });
    assert.equal(decision.allowed, false);
  });

  test('ABAC denies restricted classification for employee', () => {
    const decision = authz.authorize({
      identityId: 'u1', resource: 'secrets', action: 'read',
      organizationId: 'org-1', roles: ['employee'],
      abacContext: { organizationId: 'org-1', resourceClassification: 'restricted' },
    });
    assert.equal(decision.allowed, false);
    assert.equal(decision.matchedBy, 'abac');
  });

  test('ABAC allows restricted classification for owner', () => {
    const decision = authz.authorize({
      identityId: 'u1', resource: 'secrets', action: 'read',
      organizationId: 'org-1', roles: ['owner'],
      abacContext: { organizationId: 'org-1', resourceClassification: 'restricted' },
    });
    assert.equal(decision.allowed, true);
  });

  test('ABAC denies write outside business hours for employee', () => {
    const decision = authz.authorize({
      identityId: 'u1', resource: 'knowledge_graph', action: 'write',
      organizationId: 'org-1', roles: ['employee'],
      abacContext: { organizationId: 'org-1', timeOfDay: '22:00' },
    });
    assert.equal(decision.allowed, false);
  });

  test('ABAC allows owner write outside business hours', () => {
    const decision = authz.authorize({
      identityId: 'u1', resource: 'knowledge_graph', action: 'write',
      organizationId: 'org-1', roles: ['owner'],
      abacContext: { organizationId: 'org-1', timeOfDay: '22:00' },
    });
    assert.equal(decision.allowed, true);
  });

  test('ABAC denies write on weekends for employee', () => {
    const decision = authz.authorize({
      identityId: 'u1', resource: 'knowledge_graph', action: 'write',
      organizationId: 'org-1', roles: ['employee'],
      abacContext: { organizationId: 'org-1', dayOfWeek: 'Sunday', timeOfDay: '10:00' },
    });
    assert.equal(decision.allowed, false);
  });

  test('ABAC denies confidential for viewer-only role', () => {
    const decision = authz.authorize({
      identityId: 'u1', resource: 'enterprise_rag', action: 'read',
      organizationId: 'org-1', roles: ['viewer'],
      abacContext: { organizationId: 'org-1', resourceClassification: 'confidential' },
    });
    assert.equal(decision.allowed, false);
  });

  test('ABAC denies organization mismatch', () => {
    const decision = authz.authorize({
      identityId: 'u1', resource: 'knowledge_graph', action: 'read',
      organizationId: 'org-1', roles: ['employee'],
      abacContext: { organizationId: 'org-2' },
    });
    assert.equal(decision.allowed, false);
  });

  test('policy deny rule overrides RBAC', () => {
    policies.addRule(createPolicyRule('p1', 'Deny KG Delete', 'deny', {
      priority: 100, resources: ['knowledge_graph'], actions: ['delete'],
    }));
    const decision = authz.authorize({
      identityId: 'u1', resource: 'knowledge_graph', action: 'delete',
      organizationId: 'org-1', roles: ['owner'],
    });
    assert.equal(decision.allowed, false);
    assert.equal(decision.matchedBy, 'policy');
  });

  test('policy require_approval blocks direct execution', () => {
    policies.addRule(createPolicyRule('p2', 'Require Approval for Secrets', 'require_approval', {
      priority: 100, resources: ['secrets'], actions: ['write'],
    }));
    const decision = authz.authorize({
      identityId: 'u1', resource: 'secrets', action: 'write',
      organizationId: 'org-1', roles: ['admin'],
    });
    assert.equal(decision.allowed, false);
    assert.ok(decision.conditions?.includes('requires_approval'));
  });

  test('policy read_only restricts write', () => {
    policies.addRule(createPolicyRule('p3', 'Read Only Audit', 'read_only', {
      priority: 100, resources: ['audit'], actions: ['read', 'write', 'delete'],
    }));
    const readDecision = authz.authorize({
      identityId: 'u1', resource: 'audit', action: 'read',
      organizationId: 'org-1', roles: ['auditor'],
    });
    assert.equal(readDecision.allowed, true);

    const writeDecision = authz.authorize({
      identityId: 'u1', resource: 'audit', action: 'write',
      organizationId: 'org-1', roles: ['admin'],
    });
    assert.equal(writeDecision.allowed, false);
  });
});
