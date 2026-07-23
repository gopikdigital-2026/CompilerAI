import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  InMemoryMarketplaceRepository,
  ToolInstaller,
  ToolUninstaller,
  ToolRegistry,
} from '../src/index.ts';
import {
  createValidManifest,
  createDependencyManifest,
} from './helpers.ts';

describe('Integration — install / uninstall lifecycle', () => {
  let repo: InMemoryMarketplaceRepository;
  let installer: ToolInstaller;
  let uninstaller: ToolUninstaller;
  let registry: ToolRegistry;

  beforeEach(() => {
    repo = new InMemoryMarketplaceRepository();
    installer = new ToolInstaller(repo);
    uninstaller = new ToolUninstaller(repo);
    registry = new ToolRegistry(repo);
  });

  it('should install a valid tool end-to-end', () => {
    const manifest = createValidManifest();
    registry.register(manifest);

    const result = installer.install(manifest, {
      organizationId: 'org-1',
      installedBy: 'user-1',
      targetRuntime: 'compiler-runtime',
    });

    assert.ok(result.success, result.error ?? '');
    assert.equal(result.installedTool?.id, 'test-tool');
    assert.equal(result.installedTool?.organizationId, 'org-1');

    const installed = repo.getInstalledTool('test-tool', 'org-1');
    assert.ok(installed);
    assert.equal(installed.version, '1.0.0');
  });

  it('should uninstall an installed tool', () => {
    const manifest = createValidManifest();
    repo.registerTool(manifest);
    installer.install(manifest, {
      organizationId: 'org-1', installedBy: 'user-1', targetRuntime: 'compiler-runtime',
    });

    const result = uninstaller.uninstall('test-tool', {
      organizationId: 'org-1', performedBy: 'user-1',
    });

    assert.ok(result.success, result.error ?? '');
    assert.equal(repo.getInstalledTool('test-tool', 'org-1'), null);
  });

  it('should fail to uninstall a tool with dependents', () => {
    const depManifest = createDependencyManifest();
    const mainManifest = createValidManifest({
      dependencies: [{ toolId: 'context-validator', versionRange: '>=1.0.0' }],
    });
    repo.registerTool(depManifest);
    repo.registerTool(mainManifest);

    installer.install(depManifest, {
      organizationId: 'org-1', installedBy: 'user-1', targetRuntime: 'compiler-runtime',
    });
    installer.install(mainManifest, {
      organizationId: 'org-1', installedBy: 'user-1', targetRuntime: 'compiler-runtime',
    });

    const result = uninstaller.uninstall('context-validator', {
      organizationId: 'org-1', performedBy: 'user-1',
    });

    assert.equal(result.success, false);
    assert.ok(result.error?.includes('depend'));
  });

  it('should not install a tool twice for the same org', () => {
    const manifest = createValidManifest();
    repo.registerTool(manifest);
    installer.install(manifest, {
      organizationId: 'org-1', installedBy: 'user-1', targetRuntime: 'compiler-runtime',
    });

    const result = installer.install(manifest, {
      organizationId: 'org-1', installedBy: 'user-1', targetRuntime: 'compiler-runtime',
    });

    assert.equal(result.success, false);
    assert.ok(result.error?.includes('already installed'));
  });

  it('should isolate installations by organization', () => {
    const manifest = createValidManifest();
    repo.registerTool(manifest);

    installer.install(manifest, {
      organizationId: 'org-1', installedBy: 'user-1', targetRuntime: 'compiler-runtime',
    });
    installer.install(manifest, {
      organizationId: 'org-2', installedBy: 'user-2', targetRuntime: 'compiler-runtime',
    });

    const org1Tools = repo.getInstalledTools('org-1');
    const org2Tools = repo.getInstalledTools('org-2');
    assert.equal(org1Tools.length, 1);
    assert.equal(org2Tools.length, 1);
    assert.equal(org1Tools[0]!.organizationId, 'org-1');
    assert.equal(org2Tools[0]!.organizationId, 'org-2');
  });

  it('should record audit trail for install and uninstall', () => {
    const manifest = createValidManifest();
    repo.registerTool(manifest);
    installer.install(manifest, {
      organizationId: 'org-1', installedBy: 'user-1', targetRuntime: 'compiler-runtime',
    });
    uninstaller.uninstall('test-tool', {
      organizationId: 'org-1', performedBy: 'user-1',
    });

    const audit = repo.getAuditLog('org-1');
    assert.ok(audit.length >= 2);
    assert.ok(audit.some((a) => a.action === 'install' && a.success));
    assert.ok(audit.some((a) => a.action === 'uninstall' && a.success));
  });
});

describe('Integration — install with dependencies', () => {
  it('should install tool with satisfied dependency', () => {
    const repo = new InMemoryMarketplaceRepository();
    const installer = new ToolInstaller(repo);

    const depManifest = createDependencyManifest();
    repo.registerTool(depManifest);
    repo.installTool({
      id: 'context-validator', version: '1.0.0', organizationId: 'org-1',
      installedAt: new Date().toISOString(), installedBy: 'user-1', manifest: depManifest,
    });

    const mainManifest = createValidManifest({
      dependencies: [{ toolId: 'context-validator', versionRange: '>=1.0.0' }],
    });
    const result = installer.install(mainManifest, {
      organizationId: 'org-1', installedBy: 'user-1', targetRuntime: 'compiler-runtime',
    });

    assert.ok(result.success, result.error ?? '');
  });

  it('should fail when dependency is not installed', () => {
    const repo = new InMemoryMarketplaceRepository();
    const installer = new ToolInstaller(repo);

    const depManifest = createDependencyManifest();
    repo.registerTool(depManifest);

    const mainManifest = createValidManifest({
      dependencies: [{ toolId: 'context-validator', versionRange: '>=2.0.0' }],
    });
    repo.installTool({
      id: 'context-validator', version: '1.0.0', organizationId: 'org-1',
      installedAt: new Date().toISOString(), installedBy: 'user-1', manifest: depManifest,
    });

    const result = installer.install(mainManifest, {
      organizationId: 'org-1', installedBy: 'user-1', targetRuntime: 'compiler-runtime',
    });

    assert.equal(result.success, false);
    assert.ok(result.error?.includes('Compatibility'));
  });
});
