import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';
import { SecurityGovernance } from '../src/api/SecurityGovernance.js';
import { createPolicyRule } from '../src/policies/PolicyEngine.js';

describe('SecurityGovernance — Integration', () => {
  let sg: SecurityGovernance;

  beforeEach(() => {
    sg = new SecurityGovernance();
  });

  test('creates identity and authenticates', async () => {
    const user = sg.createIdentity('user', 'Alice', 'org-1', { email: 'alice@test.com' });
    const result = await sg.authenticate({
      identityId: user.id, method: 'mock', token: 'test', metadata: {},
    });
    assert.equal(result.authenticated, true);
    assert.ok(result.token);
  });

  test('authorizes an employee for KG read', () => {
    const user = sg.createIdentity('user', 'Bob', 'org-1');
    const decision = sg.authorize({
      identityId: user.id, resource: 'knowledge_graph', action: 'read',
      organizationId: 'org-1', roles: ['employee'],
    });
    assert.equal(decision.allowed, true);
  });

  test('denies viewer for KG write', () => {
    const decision = sg.authorize({
      identityId: 'u1', resource: 'knowledge_graph', action: 'write',
      organizationId: 'org-1', roles: ['viewer'],
    });
    assert.equal(decision.allowed, false);
  });

  test('evaluatePolicy returns a decision with trace', () => {
    sg.addPolicyRule(createPolicyRule('p1', 'Test Policy', 'deny', {
      priority: 10, resources: ['secrets'], actions: ['delete'],
    }));
    const result = sg.evaluatePolicy({
      identityId: 'u1', resource: 'secrets', action: 'delete',
      organizationId: 'org-1', roles: ['admin'],
    });
    assert.equal(result.decision, 'deny');
    assert.ok(result.trace.length > 0);
  });

  test('encrypt and decrypt round-trip', () => {
    const plaintext = 'sensitive data';
    const encrypted = sg.encrypt(plaintext);
    assert.notEqual(encrypted.ciphertext, plaintext);
    const decrypted = sg.decrypt(encrypted);
    assert.equal(decrypted, plaintext);
  });

  test('storeSecret and getSecret', () => {
    const record = sg.storeSecret('api-key', 'secret123', 'api_key', 'org-1');
    assert.ok(record.id);
    assert.notEqual(record.encryptedValue, 'secret123');
    const value = sg.getSecret(record.id);
    assert.equal(value, 'secret123');
  });

  test('writeAuditLog records an event', () => {
    const event = sg.writeAuditLog({
      actor: 'u1', actorType: 'user', resource: 'kg',
      action: 'kg_access', result: 'success', organizationId: 'org-1', details: {},
    });
    assert.ok(event.id);
    assert.ok(event.timestamp);
  });

  test('telemetry events emitted on authenticate', async () => {
    const user = sg.createIdentity('user', 'Alice', 'org-1');
    await sg.authenticate({ identityId: user.id, method: 'mock', token: 'test', metadata: {} });
    assert.ok(sg.getTelemetryEventsByType('authentication.success').length > 0);
  });

  test('telemetry events emitted on authorize', () => {
    sg.authorize({
      identityId: 'u1', resource: 'knowledge_graph', action: 'read',
      organizationId: 'org-1', roles: ['employee'],
    });
    assert.ok(sg.getTelemetryEventsByType('authorization.granted').length > 0);
  });

  test('telemetry events emitted on denied authorization', () => {
    sg.authorize({
      identityId: 'u1', resource: 'knowledge_graph', action: 'delete',
      organizationId: 'org-1', roles: ['viewer'],
    });
    assert.ok(sg.getTelemetryEventsByType('authorization.denied').length > 0);
  });

  test('audit log records denied authorization', () => {
    sg.authorize({
      identityId: 'u1', resource: 'secrets', action: 'write',
      organizationId: 'org-1', roles: ['viewer'],
    });
    const auditEvents = sg.queryAuditLog({ action: 'auth_denied' });
    assert.ok(auditEvents.length > 0);
  });

  test('all 8 public API methods are accessible', () => {
    assert.equal(typeof sg.authenticate, 'function');
    assert.equal(typeof sg.authorize, 'function');
    assert.equal(typeof sg.evaluatePolicy, 'function');
    assert.equal(typeof sg.encrypt, 'function');
    assert.equal(typeof sg.decrypt, 'function');
    assert.equal(typeof sg.storeSecret, 'function');
    assert.equal(typeof sg.getSecret, 'function');
    assert.equal(typeof sg.writeAuditLog, 'function');
  });

  test('full workflow: create → authenticate → authorize → audit', async () => {
    // 1. Create identity
    const user = sg.createIdentity('user', 'Alice', 'org-1');

    // 2. Authenticate
    const authResult = await sg.authenticate({
      identityId: user.id, method: 'mock', token: 'test', metadata: {},
    });
    assert.equal(authResult.authenticated, true);

    // 3. Authorize
    const decision = sg.authorize({
      identityId: user.id, resource: 'knowledge_graph', action: 'read',
      organizationId: 'org-1', roles: ['employee'],
    });
    assert.equal(decision.allowed, true);

    // 4. Write audit log
    const audit = sg.writeAuditLog({
      actor: user.id, actorType: 'user', resource: 'knowledge_graph',
      action: 'kg_access', result: 'success', organizationId: 'org-1',
      details: { decision: decision.reason },
    });
    assert.ok(audit.id);

    // 5. Verify telemetry
    assert.ok(sg.getTelemetryEvents().length >= 3);
  });

  test('compliance assessment for GDPR', () => {
    const assessment = sg.assessCompliance('gdpr');
    assert.equal(assessment.framework, 'gdpr');
    assert.ok(assessment.controls.length > 0);
  });

  test('hash produces deterministic output', () => {
    const h1 = sg.hash('test data');
    const h2 = sg.hash('test data');
    assert.equal(h1, h2);
  });

  test('sign and verify work end-to-end', () => {
    const data = 'important document';
    const sig = sg.sign(data);
    assert.equal(sg.verify(data, sig), true);
    assert.equal(sg.verify('tampered', sig), false);
  });

  test('key rotation generates new key', () => {
    const originalKeys = sg.encryption.getKeyIds();
    const newKeyId = sg.rotateKey('default');
    assert.ok(sg.encryption.getKeyIds().length > originalKeys.length);
    assert.notEqual(newKeyId, 'default');
  });

  test('integration with Skills Marketplace scenario', () => {
    // Simulate a skill installation request
    const decision = sg.authorize({
      identityId: 'u1', resource: 'skills_marketplace', action: 'execute',
      organizationId: 'org-1', roles: ['ai_agent'],
    });
    assert.equal(decision.allowed, true);

    sg.writeAuditLog({
      actor: 'u1', actorType: 'ai_agent', resource: 'skills_marketplace',
      action: 'skill_install', result: 'success', organizationId: 'org-1',
      details: { skillId: 'github-analyzer' },
    });

    const skillAudits = sg.queryAuditLog({ action: 'skill_install' });
    assert.ok(skillAudits.length > 0);
  });

  test('integration with Multi-Agent scenario', () => {
    const decision = sg.authorize({
      identityId: 'agent-1', resource: 'multi_agent', action: 'execute',
      organizationId: 'org-1', roles: ['ai_agent'],
    });
    assert.equal(decision.allowed, true);

    sg.writeAuditLog({
      actor: 'agent-1', actorType: 'ai_agent', resource: 'multi_agent',
      action: 'agent_execute', result: 'success', organizationId: 'org-1',
      details: { agentId: 'agent-1' },
    });

    const agentAudits = sg.queryAuditLog({ action: 'agent_execute' });
    assert.ok(agentAudits.length > 0);
  });
});
