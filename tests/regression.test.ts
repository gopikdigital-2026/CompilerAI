// Regression tests for critical flows across RAG, agents, security, and Skills.
// These tests verify that the public APIs of the key packages work together.

import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { RAGEngine, createDocument } from '../packages/enterprise-rag/src/index.js';
import { SecurityGovernance } from '../packages/security-governance/src/index.js';
import { SkillsMarketplace, createGitHubRepoAnalyzer } from '../packages/skills-marketplace/src/index.js';

// ── RAG regression tests ─────────────────────────────────────────────────────

describe('RAG Regression', () => {
  test('ingest → search → explain flow works end-to-end', async () => {
    const rag = new RAGEngine({ chunkingConfig: { chunkSize: 200, overlap: 20 } });
    const docs = [
      createDocument('google_drive', 'f1', 'Project Alpha', 'Project Alpha is the enterprise platform using microservices.', 'alice', 'org-1'),
      createDocument('github', 'r1', 'Architecture', 'The architecture follows microservices with REST APIs.', 'bob', 'org-1'),
    ];
    const ingestResult = await rag.ingest('google_drive', docs);
    assert.equal(ingestResult.documentsIngested, 2);
    assert.ok(ingestResult.chunksCreated > 0);

    const searchResults = await rag.search({
      query: 'microservices architecture',
      mode: 'hybrid',
      organizationId: 'org-1',
      limit: 5,
    });
    assert.ok(searchResults.length > 0);
    assert.ok(searchResults[0].rankScore > 0);

    const answer = await rag.explain('What architecture does Project Alpha use?', 'org-1');
    assert.ok(answer.answer.length > 0);
    assert.ok(answer.citations.length > 0);
    assert.ok(answer.confidence > 0);
  });

  test('cache invalidation works after reindex', async () => {
    const rag = new RAGEngine();
    const doc = createDocument('google_drive', 'f1', 'Test', 'Some content for cache testing.', 'alice', 'org-1');
    await rag.ingest('google_drive', [doc]);
    await rag.search({ query: 'cache testing', mode: 'hybrid', organizationId: 'org-1' });
    assert.ok(rag.getCacheStats().size > 0);
    rag.invalidateCache();
    assert.equal(rag.getCacheStats().size, 0);
  });

  test('permission filtering prevents cross-org access', async () => {
    const rag = new RAGEngine();
    const doc = createDocument('google_drive', 'f1', 'Secret', 'Confidential org-1 content.', 'alice', 'org-1');
    await rag.ingest('google_drive', [doc]);
    const results = await rag.search({
      query: 'confidential content',
      mode: 'hybrid',
      organizationId: 'org-2',
      limit: 5,
    });
    assert.equal(results.length, 0);
  });
});

// ── Security regression tests ────────────────────────────────────────────────

describe('Security Governance Regression', () => {
  test('RBAC: owner can access all resources, viewer cannot', () => {
    const sg = new SecurityGovernance();
    const ownerDecision = sg.authorize({
      identityId: 'u1', resource: 'secrets', action: 'admin',
      organizationId: 'org-1', roles: ['owner'],
    });
    assert.equal(ownerDecision.allowed, true);

    const viewerDecision = sg.authorize({
      identityId: 'u2', resource: 'secrets', action: 'write',
      organizationId: 'org-1', roles: ['viewer'],
    });
    assert.equal(viewerDecision.allowed, false);
  });

  test('encryption round-trip preserves data', () => {
    const sg = new SecurityGovernance();
    const plaintext = 'sensitive data 12345';
    const encrypted = sg.encrypt(plaintext);
    assert.notEqual(encrypted.ciphertext, plaintext);
    const decrypted = sg.decrypt(encrypted);
    assert.equal(decrypted, plaintext);
  });

  test('secrets are stored encrypted, never in plaintext', () => {
    const sg = new SecurityGovernance();
    const secret = sg.storeSecret('api-key', 'my-secret-value', 'api_key', 'org-1');
    assert.ok(!secret.encryptedValue.includes('my-secret-value'));
    const retrieved = sg.getSecret(secret.id);
    assert.equal(retrieved, 'my-secret-value');
  });

  test('audit log records all critical actions', () => {
    const sg = new SecurityGovernance();
    sg.writeAuditLog({ actor: 'u1', actorType: 'user', resource: 'kg', action: 'kg_access', result: 'success', organizationId: 'org-1', details: {} });
    sg.writeAuditLog({ actor: 'u1', actorType: 'user', resource: 'skills', action: 'skill_install', result: 'success', organizationId: 'org-1', details: {} });
    sg.writeAuditLog({ actor: 'u2', actorType: 'ai_agent', resource: 'agents', action: 'agent_execute', result: 'success', organizationId: 'org-1', details: {} });
    assert.ok(sg.queryAuditLog({}).length >= 3);
    assert.ok(sg.queryAuditLog({ action: 'kg_access' }).length >= 1);
    assert.ok(sg.queryAuditLog({ action: 'skill_install' }).length >= 1);
  });

  test('policy engine produces reproducible decisions', () => {
    const sg = new SecurityGovernance();
    sg.addPolicyRule({
      id: 'p1', name: 'Deny Secrets Delete', description: 'No one deletes secrets',
      effect: 'deny', priority: 100, condition: {},
      resources: ['secrets'], actions: ['delete'], roles: ['owner', 'admin', 'manager', 'employee'],
    });
    const req = { identityId: 'u1', resource: 'secrets' as const, action: 'delete' as const, organizationId: 'org-1', roles: ['owner' as const] };
    const r1 = sg.evaluatePolicy(req);
    const r2 = sg.evaluatePolicy(req);
    assert.equal(r1.decision, r2.decision);
    assert.equal(r1.decision, 'deny');
  });
});

// ── Skills Marketplace regression tests ──────────────────────────────────────

describe('Skills Marketplace Regression', () => {
  test('register → install → execute flow works', async () => {
    const mp = new SkillsMarketplace();
    const { manifest, handler } = createGitHubRepoAnalyzer();
    mp.registerSkill(manifest, handler);
    const installResult = mp.installSkill(manifest.id, manifest.permissions);
    assert.equal(installResult.success, true);

    const execResult = await mp.executeSkill(manifest.id, 'analyze', { repository: 'owner/repo' }, 'org-1', 'user-1');
    assert.equal(execResult.success, true);
    assert.ok(execResult.output);
  });

  test('unauthorized skill cannot execute', async () => {
    const mp = new SkillsMarketplace();
    const { manifest, handler } = createGitHubRepoAnalyzer();
    mp.registerSkill(manifest, handler);
    const result = await mp.executeSkill(manifest.id, 'analyze', { repository: 'test' }, 'org-1', 'user-1');
    assert.equal(result.success, false);
    assert.ok(result.error?.includes('not installed'));
  });

  test('skill update changes version', () => {
    const mp = new SkillsMarketplace();
    const { manifest, handler } = createGitHubRepoAnalyzer();
    mp.registerSkill(manifest, handler);
    mp.installSkill(manifest.id, manifest.permissions);
    mp.registry.addVersion(manifest.id, { version: '2.0.0', releaseDate: '', changelog: 'Major', deprecated: false });
    const result = mp.updateSkill(manifest.id);
    assert.equal(result.success, true);
    assert.equal(result.newVersion, '2.0.0');
  });
});

// ── Cross-module integration regression ──────────────────────────────────────

describe('Cross-Module Integration Regression', () => {
  test('security authorizes skill execution', () => {
    const sg = new SecurityGovernance();
    const decision = sg.authorize({
      identityId: 'agent-1', resource: 'skills_marketplace', action: 'execute',
      organizationId: 'org-1', roles: ['ai_agent'],
    });
    assert.equal(decision.allowed, true);
  });

  test('security authorizes RAG queries', () => {
    const sg = new SecurityGovernance();
    const decision = sg.authorize({
      identityId: 'u1', resource: 'enterprise_rag', action: 'read',
      organizationId: 'org-1', roles: ['employee'],
    });
    assert.equal(decision.allowed, true);
  });

  test('security audit captures skill installation event', () => {
    const sg = new SecurityGovernance();
    sg.writeAuditLog({
      actor: 'u1', actorType: 'user', resource: 'skills_marketplace',
      action: 'skill_install', result: 'success', organizationId: 'org-1',
      details: { skillId: 'github-analyzer' },
    });
    const events = sg.queryAuditLog({ action: 'skill_install' });
    assert.ok(events.length > 0);
    assert.equal(events[0].details.skillId, 'github-analyzer');
  });
});
