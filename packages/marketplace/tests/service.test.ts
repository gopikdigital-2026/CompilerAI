import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryMarketplaceRepository, MarketplaceService } from '../src/index.ts';
import { createValidManifest, createDependencyManifest } from './helpers.ts';

describe('MarketplaceService — API integration tests', () => {
  let repo: InMemoryMarketplaceRepository;
  let service: MarketplaceService;

  beforeEach(() => {
    repo = new InMemoryMarketplaceRepository();
    service = new MarketplaceService(repo);
  });

  it('should list all registered tools', () => {
    service.registerTool(createValidManifest());
    service.registerTool(createDependencyManifest());
    const tools = service.list();
    assert.equal(tools.length, 2);
  });

  it('should search tools', () => {
    service.registerTool(createValidManifest());
    const results = service.search({ text: 'test' });
    assert.ok(results.length > 0);
    assert.equal(results[0]!.tool.id, 'test-tool');
  });

  it('should get tool detail', () => {
    service.registerTool(createValidManifest());
    const detail = service.getDetail('test-tool');
    assert.equal(detail.id, 'test-tool');
  });

  it('should install a tool via the service', () => {
    service.registerTool(createValidManifest());
    const result = service.install(createValidManifest(), {
      organizationId: 'org-1', installedBy: 'user-1', targetRuntime: 'compiler-runtime',
    });
    assert.ok(result.success);
  });

  it('should list installed tools for an organization', () => {
    service.registerTool(createValidManifest());
    service.install(createValidManifest(), {
      organizationId: 'org-1', installedBy: 'user-1', targetRuntime: 'compiler-runtime',
    });
    const installed = service.listInstalled('org-1');
    assert.equal(installed.length, 1);
    assert.equal(installed[0]!.id, 'test-tool');
  });

  it('should uninstall a tool via the service', () => {
    service.registerTool(createValidManifest());
    service.install(createValidManifest(), {
      organizationId: 'org-1', installedBy: 'user-1', targetRuntime: 'compiler-runtime',
    });
    const result = service.uninstall('test-tool', {
      organizationId: 'org-1', performedBy: 'user-1',
    });
    assert.ok(result.success);
    assert.equal(service.listInstalled('org-1').length, 0);
  });

  it('should verify a tool signature', () => {
    service.registerTool(createValidManifest());
    const result = service.verify('test-tool');
    assert.ok(result.valid);
  });

  it('should update a tool to a newer version', () => {
    const v1 = createValidManifest({ version: '1.0.0' });
    service.registerTool(v1);
    service.install(v1, {
      organizationId: 'org-1', installedBy: 'user-1', targetRuntime: 'compiler-runtime',
    });

    const v2 = createValidManifest({ version: '2.0.0' });
    service.publishVersion(v2);

    const result = service.update('test-tool', {
      organizationId: 'org-1', performedBy: 'user-1', targetRuntime: 'compiler-runtime',
    });

    assert.ok(result.success, result.error ?? '');
    assert.equal(result.previousVersion, '1.0.0');
    assert.equal(result.installedTool?.version, '2.0.0');
  });

  it('should rollback to a previous version', () => {
    const v1 = createValidManifest({ version: '1.0.0' });
    service.publishVersion(v1);
    service.install(v1, {
      organizationId: 'org-1', installedBy: 'user-1', targetRuntime: 'compiler-runtime',
    });

    const v2 = createValidManifest({ version: '2.0.0' });
    service.publishVersion(v2);
    service.update('test-tool', {
      organizationId: 'org-1', performedBy: 'user-1', targetRuntime: 'compiler-runtime',
    });

    const result = service.rollback('test-tool', '1.0.0', 'org-1', 'user-1');
    assert.ok(result.success);
    assert.equal(result.rolledBackTo, '1.0.0');
  });

  it('should get audit log for an organization', () => {
    service.registerTool(createValidManifest());
    service.install(createValidManifest(), {
      organizationId: 'org-1', installedBy: 'user-1', targetRuntime: 'compiler-runtime',
    });
    const audit = service.getAuditLog('org-1');
    assert.ok(audit.length > 0);
    assert.ok(audit.some((a) => a.action === 'install'));
  });

  it('should validate a manifest via the service', () => {
    const result = service.validateManifest(createValidManifest());
    assert.ok(result.valid);
  });

  it('should check compatibility via the service', () => {
    service.registerTool(createValidManifest());
    const result = service.checkCompatibility(
      createValidManifest(), 'compiler-runtime',
    );
    assert.ok(result.compatible);
  });

  it('should analyze permissions via the service', () => {
    const result = service.analyzePermissions(createValidManifest());
    assert.ok(result.permissions.length > 0);
  });
});
