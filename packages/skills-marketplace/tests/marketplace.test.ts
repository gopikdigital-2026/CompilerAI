import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';
import { Marketplace } from '../src/marketplace/Marketplace.js';
import { SkillRegistry } from '../src/registry/SkillRegistry.js';
import type { SkillManifest } from '../src/models.js';

function makeManifest(id: string, category: string = 'development', tags: string[] = ['test'], connectors: string[] = ['github']): SkillManifest {
  return {
    id, name: `Skill ${id}`, description: `Description for ${id}`, version: '1.0.0',
    author: 'a', organization: 'org-1', category: category as SkillManifest['category'], tags,
    dependencies: [], permissions: [], capabilities: [], compatibleConnectors: connectors,
    minPlatformVersion: '1.0.0', commands: [], actions: [], events: [],
  };
}

describe('Marketplace', () => {
  let marketplace: Marketplace;
  let registry: SkillRegistry;

  beforeEach(() => {
    registry = new SkillRegistry();
    marketplace = new Marketplace(registry, '1.0.0');
  });

  test('search returns all skills with empty query', () => {
    registry.register(makeManifest('s1'));
    registry.register(makeManifest('s2'));
    assert.equal(marketplace.search({}).length, 2);
  });

  test('search filters by category', () => {
    registry.register(makeManifest('s1', 'development'));
    registry.register(makeManifest('s2', 'analytics'));
    assert.equal(marketplace.search({ category: 'development' }).length, 1);
  });

  test('search filters by tags', () => {
    registry.register(makeManifest('s1', 'development', ['security', 'github']));
    registry.register(makeManifest('s2', 'development', ['analytics']));
    assert.equal(marketplace.search({ tags: ['security'] }).length, 1);
  });

  test('search filters by text', () => {
    registry.register(makeManifest('s1', 'development', ['test']));
    registry.register(makeManifest('s2', 'development', ['test']));
    const results = marketplace.search({ searchText: 's1' });
    assert.ok(results.some((r) => r.record.manifest.id === 's1'));
  });

  test('search respects limit and offset', () => {
    for (let i = 0; i < 10; i++) registry.register(makeManifest(`s${i}`));
    assert.equal(marketplace.search({ limit: 3 }).length, 3);
    assert.equal(marketplace.search({ limit: 3, offset: 3 }).length, 3);
  });

  test('entries include compatibility info', () => {
    registry.register(makeManifest('s1'));
    const entries = marketplace.search({});
    assert.ok(typeof entries[0].compatible === 'boolean');
    assert.ok(Array.isArray(entries[0].compatibilityIssues));
  });

  test('entries include installation status', () => {
    registry.register(makeManifest('s1'));
    registry.updateStatus('s1', 'installed');
    const entries = marketplace.search({});
    const entry = entries.find((e) => e.record.manifest.id === 's1');
    assert.equal(entry?.isInstalled, true);
  });

  test('getById returns a specific entry', () => {
    registry.register(makeManifest('s1'));
    const entry = marketplace.getById('s1');
    assert.ok(entry);
    assert.equal(entry?.record.manifest.id, 's1');
  });

  test('getById returns undefined for non-existent', () => {
    assert.equal(marketplace.getById('nonexistent'), undefined);
  });

  test('getPopular sorts by install count', () => {
    registry.register(makeManifest('s1'));
    registry.register(makeManifest('s2'));
    registry.incrementInstallCount('s2');
    registry.incrementInstallCount('s2');
    registry.incrementInstallCount('s1');
    const popular = marketplace.getPopular(2);
    assert.equal(popular[0].record.manifest.id, 's2');
  });

  test('getTopRated sorts by rating', () => {
    registry.register(makeManifest('s1'));
    registry.register(makeManifest('s2'));
    registry.updateRating('s1', 5);
    registry.updateRating('s2', 3);
    const topRated = marketplace.getTopRated(2);
    assert.equal(topRated[0].record.manifest.id, 's1');
  });

  test('compatibility detects platform version mismatch', () => {
    registry.register({ ...makeManifest('s1'), minPlatformVersion: '2.0.0' });
    marketplace.setPlatformVersion('1.0.0');
    const entries = marketplace.search({});
    assert.equal(entries[0].compatible, false);
    assert.ok(entries[0].compatibilityIssues.length > 0);
  });

  test('getByCategory returns category entries', () => {
    registry.register(makeManifest('s1', 'development'));
    registry.register(makeManifest('s2', 'analytics'));
    assert.equal(marketplace.getByCategory('development').length, 1);
  });
});
