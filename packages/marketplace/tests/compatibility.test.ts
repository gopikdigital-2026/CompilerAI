import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryMarketplaceRepository } from '../src/services/MarketplaceRepository.ts';
import { ToolCompatibilityChecker } from '../src/services/ToolCompatibilityChecker.ts';
import { createValidManifest, createIncompatibleManifest, createDependencyManifest } from './helpers.ts';

describe('ToolCompatibilityChecker — unit tests', () => {
  it('should pass when runtime is supported', () => {
    const repo = new InMemoryMarketplaceRepository();
    const checker = new ToolCompatibilityChecker(repo);
    const manifest = createValidManifest({ runtimeCompatibility: ['compiler-runtime'] });
    const result = checker.check(manifest, 'compiler-runtime');
    assert.ok(result.compatible, result.errors.join('; '));
  });

  it('should fail when runtime is not supported', () => {
    const repo = new InMemoryMarketplaceRepository();
    const checker = new ToolCompatibilityChecker(repo);
    const manifest = createIncompatibleManifest();
    const result = checker.check(manifest, 'compiler-runtime');
    assert.equal(result.compatible, false);
    assert.ok(result.errors.some((e) => e.includes('compiler-runtime')));
  });

  it('should fail when dependency is not in registry', () => {
    const repo = new InMemoryMarketplaceRepository();
    const checker = new ToolCompatibilityChecker(repo);
    const manifest = createValidManifest({
      dependencies: [{ toolId: 'missing-dep', versionRange: '>=1.0.0' }],
    });
    const result = checker.check(manifest, 'compiler-runtime');
    assert.equal(result.compatible, false);
    assert.ok(result.errors.some((e) => e.includes('missing-dep')));
  });

  it('should pass when dependency is in registry and compatible', () => {
    const repo = new InMemoryMarketplaceRepository();
    const depManifest = createDependencyManifest();
    repo.registerTool(depManifest);
    const checker = new ToolCompatibilityChecker(repo);
    const manifest = createValidManifest({
      dependencies: [{ toolId: 'context-validator', versionRange: '>=1.0.0' }],
    });
    const result = checker.check(manifest, 'compiler-runtime');
    assert.ok(result.compatible, result.errors.join('; '));
  });

  it('should warn for universal runtime compatibility', () => {
    const repo = new InMemoryMarketplaceRepository();
    const checker = new ToolCompatibilityChecker(repo);
    const manifest = createValidManifest({ runtimeCompatibility: ['universal'] });
    const result = checker.check(manifest, 'compiler-runtime');
    assert.ok(result.warnings.some((w) => w.includes('universal')));
  });
});
