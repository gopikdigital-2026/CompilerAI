import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';
import { SkillRegistry } from '../src/registry/SkillRegistry.js';
import type { SkillManifest } from '../src/models.js';

function makeManifest(id: string, name: string, version: string = '1.0.0'): SkillManifest {
  return {
    id, name, description: `Skill ${name}`, version, author: 'tester',
    organization: 'org-1', category: 'development', tags: ['test'],
    dependencies: [], permissions: [], capabilities: ['testing'],
    compatibleConnectors: ['github'], minPlatformVersion: '1.0.0',
    commands: [], actions: [], events: [],
  };
}

describe('SkillRegistry', () => {
  let registry: SkillRegistry;

  beforeEach(() => {
    registry = new SkillRegistry();
  });

  test('registers a skill', () => {
    const manifest = makeManifest('s1', 'Skill One');
    const record = registry.register(manifest);
    assert.equal(record.manifest.id, 's1');
    assert.equal(record.status, 'registered');
  });

  test('get retrieves a skill by id', () => {
    registry.register(makeManifest('s1', 'Skill One'));
    assert.ok(registry.get('s1'));
    assert.equal(registry.get('nonexistent'), undefined);
  });

  test('unregister removes a skill', () => {
    registry.register(makeManifest('s1', 'Skill One'));
    assert.equal(registry.unregister('s1'), true);
    assert.equal(registry.get('s1'), undefined);
  });

  test('list returns all skills', () => {
    registry.register(makeManifest('s1', 'A'));
    registry.register(makeManifest('s2', 'B'));
    assert.equal(registry.list().length, 2);
  });

  test('listByCategory filters by category', () => {
    registry.register({ ...makeManifest('s1', 'A'), category: 'development' });
    registry.register({ ...makeManifest('s2', 'B'), category: 'analytics' });
    assert.equal(registry.listByCategory('development').length, 1);
    assert.equal(registry.listByCategory('analytics').length, 1);
  });

  test('listByTag filters by tag', () => {
    registry.register({ ...makeManifest('s1', 'A'), tags: ['github', 'security'] });
    registry.register({ ...makeManifest('s2', 'B'), tags: ['analytics'] });
    assert.equal(registry.listByTag('github').length, 1);
    assert.equal(registry.listByTag('analytics').length, 1);
  });

  test('updateStatus changes skill status', () => {
    registry.register(makeManifest('s1', 'A'));
    registry.updateStatus('s1', 'installed');
    assert.equal(registry.get('s1')?.status, 'installed');
    assert.ok(registry.get('s1')?.installedAt);
  });

  test('addVersion adds to version history', () => {
    registry.register(makeManifest('s1', 'A', '1.0.0'));
    registry.addVersion('s1', { version: '2.0.0', releaseDate: new Date().toISOString(), changelog: 'Major update', deprecated: false });
    assert.equal(registry.get('s1')?.versionHistory.length, 2);
    assert.equal(registry.get('s1')?.versionHistory[1].version, '2.0.0');
  });

  test('incrementInstallCount increments', () => {
    registry.register(makeManifest('s1', 'A'));
    registry.incrementInstallCount('s1');
    registry.incrementInstallCount('s1');
    assert.equal(registry.get('s1')?.installCount, 2);
  });

  test('updateRating updates average and count', () => {
    registry.register(makeManifest('s1', 'A'));
    registry.updateRating('s1', 5);
    registry.updateRating('s1', 3);
    const rating = registry.get('s1')?.rating;
    assert.equal(rating?.count, 2);
    assert.equal(rating?.average, 4);
  });
});
