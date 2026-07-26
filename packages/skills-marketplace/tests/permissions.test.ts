import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { PermissionEngine } from '../src/permissions/PermissionEngine.js';
import type { SkillManifest, SkillPermission } from '../src/models.js';

function makeManifest(perms: SkillPermission[]): SkillManifest {
  return {
    id: 's1', name: 'Test', description: '', version: '1.0.0', author: 'a',
    organization: 'org-1', category: 'development', tags: [], dependencies: [],
    permissions: perms, capabilities: [], compatibleConnectors: [], minPlatformVersion: '1.0.0',
    commands: [], actions: [], events: [],
  };
}

describe('PermissionEngine', () => {
  const engine = new PermissionEngine();

  test('validates when all permissions are granted', () => {
    const manifest = makeManifest([
      { resource: 'github', access: ['read'], reason: 'Read repos' },
    ]);
    const result = engine.validate(manifest, [
      { resource: 'github', access: ['read'], reason: 'Granted' },
    ]);
    assert.equal(result.valid, true);
    assert.equal(result.missing.length, 0);
  });

  test('detects missing permissions', () => {
    const manifest = makeManifest([
      { resource: 'github', access: ['read', 'write'], reason: 'Read and write repos' },
    ]);
    const result = engine.validate(manifest, [
      { resource: 'github', access: ['read'], reason: 'Only read granted' },
    ]);
    assert.equal(result.valid, false);
    assert.equal(result.missing.length, 1);
  });

  test('detects missing resource entirely', () => {
    const manifest = makeManifest([
      { resource: 'gmail', access: ['read'], reason: 'Read emails' },
    ]);
    const result = engine.validate(manifest, []);
    assert.equal(result.valid, false);
    assert.equal(result.missing.length, 1);
  });

  test('checkAccess returns true for granted access', () => {
    const granted: SkillPermission[] = [
      { resource: 'github', access: ['read', 'write'], reason: 'granted' },
    ];
    assert.equal(engine.checkAccess('github', 'read', granted), true);
    assert.equal(engine.checkAccess('github', 'write', granted), true);
  });

  test('checkAccess returns false for ungranted access', () => {
    const granted: SkillPermission[] = [
      { resource: 'github', access: ['read'], reason: 'granted' },
    ];
    assert.equal(engine.checkAccess('github', 'write', granted), false);
    assert.equal(engine.checkAccess('gmail', 'read', granted), false);
  });

  test('getRequiredPermissions returns manifest permissions', () => {
    const perms: SkillPermission[] = [
      { resource: 'github', access: ['read'], reason: 'r' },
      { resource: 'gmail', access: ['read'], reason: 'r' },
    ];
    const manifest = makeManifest(perms);
    assert.equal(engine.getRequiredPermissions(manifest).length, 2);
  });

  test('getMissingPermissions returns only missing ones', () => {
    const manifest = makeManifest([
      { resource: 'github', access: ['read'], reason: 'r' },
      { resource: 'gmail', access: ['read'], reason: 'r' },
      { resource: 'google_drive', access: ['read'], reason: 'r' },
    ]);
    const granted: SkillPermission[] = [
      { resource: 'github', access: ['read'], reason: 'g' },
    ];
    const missing = engine.getMissingPermissions(manifest, granted);
    assert.equal(missing.length, 2);
    assert.ok(missing.some((m) => m.resource === 'gmail'));
    assert.ok(missing.some((m) => m.resource === 'google_drive'));
  });

  test('summarizePermissions produces readable string', () => {
    const perms: SkillPermission[] = [
      { resource: 'github', access: ['read', 'write'], reason: 'r' },
    ];
    const summary = engine.summarizePermissions(perms);
    assert.ok(summary.includes('github'));
    assert.ok(summary.includes('read'));
    assert.ok(summary.includes('write'));
  });

  test('all 10 permission resources are supported', () => {
    const resources = ['gmail', 'google_drive', 'github', 'knowledge_graph', 'enterprise_rag', 'multi_agent', 'filesystem', 'network', 'environment', 'secrets'] as const;
    for (const resource of resources) {
      const granted: SkillPermission[] = [{ resource, access: ['read'], reason: 'test' }];
      assert.equal(engine.checkAccess(resource, 'read', granted), true);
    }
  });
});
