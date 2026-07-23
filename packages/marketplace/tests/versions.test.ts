import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryMarketplaceRepository } from '../src/services/MarketplaceRepository.ts';
import { ToolVersionManager } from '../src/services/ToolVersionManager.ts';
import { createValidManifest } from './helpers.ts';

describe('ToolVersionManager — unit tests', () => {
  it('should publish a new version', () => {
    const repo = new InMemoryMarketplaceRepository();
    const manager = new ToolVersionManager(repo);
    const v1 = createValidManifest({ version: '1.0.0' });
    manager.publishVersion(v1);
    const versions = manager.getVersions('test-tool');
    assert.equal(versions.length, 1);
    assert.equal(versions[0]!.version, '1.0.0');
  });

  it('should reject publishing the same version twice', () => {
    const repo = new InMemoryMarketplaceRepository();
    const manager = new ToolVersionManager(repo);
    const v1 = createValidManifest({ version: '1.0.0' });
    manager.publishVersion(v1);
    assert.throws(() => manager.publishVersion(v1), /already published/);
  });

  it('should reject publishing a lower version', () => {
    const repo = new InMemoryMarketplaceRepository();
    const manager = new ToolVersionManager(repo);
    manager.publishVersion(createValidManifest({ version: '2.0.0' }));
    assert.throws(
      () => manager.publishVersion(createValidManifest({ version: '1.0.0' })),
      /must be greater than/,
    );
  });

  it('should get latest version', () => {
    const repo = new InMemoryMarketplaceRepository();
    const manager = new ToolVersionManager(repo);
    manager.publishVersion(createValidManifest({ version: '1.0.0' }));
    manager.publishVersion(createValidManifest({ version: '1.1.0' }));
    manager.publishVersion(createValidManifest({ version: '2.0.0' }));
    const latest = manager.getLatestVersion('test-tool');
    assert.equal(latest.version, '2.0.0');
  });

  it('should deprecate a version', () => {
    const repo = new InMemoryMarketplaceRepository();
    const manager = new ToolVersionManager(repo);
    manager.publishVersion(createValidManifest({ version: '1.0.0' }));
    manager.deprecateVersion('test-tool', '1.0.0');
    const versions = manager.getVersions('test-tool');
    assert.equal(versions[0]!.deprecated, true);
  });

  it('should rollback to a previous version', () => {
    const repo = new InMemoryMarketplaceRepository();
    const manager = new ToolVersionManager(repo);
    manager.publishVersion(createValidManifest({ version: '1.0.0' }));
    manager.publishVersion(createValidManifest({ version: '2.0.0' }));

    const v2 = createValidManifest({ version: '2.0.0' });
    repo.installTool({
      id: 'test-tool', version: '2.0.0', organizationId: 'org-1',
      installedAt: new Date().toISOString(), installedBy: 'user-1', manifest: v2,
    });

    const result = manager.rollback('test-tool', '1.0.0', 'org-1', 'user-1');
    assert.ok(result.success);
    assert.equal(result.rolledBackTo, '1.0.0');
    assert.equal(result.installedTool?.version, '1.0.0');
  });

  it('should not rollback to a deprecated version', () => {
    const repo = new InMemoryMarketplaceRepository();
    const manager = new ToolVersionManager(repo);
    manager.publishVersion(createValidManifest({ version: '1.0.0' }));
    manager.publishVersion(createValidManifest({ version: '2.0.0' }));
    manager.deprecateVersion('test-tool', '1.0.0');

    const result = manager.rollback('test-tool', '1.0.0', 'org-1', 'user-1');
    assert.equal(result.success, false);
    assert.ok(result.error?.includes('deprecated'));
  });

  it('should compare versions correctly', () => {
    const repo = new InMemoryMarketplaceRepository();
    const manager = new ToolVersionManager(repo);
    assert.equal(manager.compareVersions('1.0.0', '1.0.0'), 0);
    assert.equal(manager.compareVersions('2.0.0', '1.0.0'), 1);
    assert.equal(manager.compareVersions('1.0.0', '2.0.0'), -1);
    assert.equal(manager.compareVersions('1.1.0', '1.0.0'), 1);
    assert.equal(manager.compareVersions('1.0.1', '1.0.0'), 1);
  });
});
