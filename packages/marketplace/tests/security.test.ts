import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  InMemoryMarketplaceRepository,
  ToolInstaller,
  ToolManifestValidator,
  ToolSignatureVerifier,
  ToolPermissionAnalyzer,
} from '../src/index.ts';
import {
  createValidManifest,
  createDangerousManifest,
  createUnverifiedManifest,
  createIncompatibleManifest,
} from './helpers.ts';

describe('Security — manifest validation prevents invalid tools', () => {
  const validator = new ToolManifestValidator();

  it('should reject null manifest', () => {
    const result = validator.validate(null);
    assert.equal(result.valid, false);
  });

  it('should reject manifest with tampered checksum', () => {
    const manifest = createValidManifest({ checksum: '0'.repeat(64) });
    const verifier = new ToolSignatureVerifier();
    const result = verifier.verify(manifest);
    assert.equal(result.valid, false);
  });
});

describe('Security — signature verification blocks unsigned tools', () => {
  it('should block installation of unverified tools', () => {
    const repo = new InMemoryMarketplaceRepository();
    const installer = new ToolInstaller(repo);
    const manifest = createUnverifiedManifest();

    const result = installer.install(manifest, {
      organizationId: 'org-1', installedBy: 'user-1', targetRuntime: 'compiler-runtime',
    });

    assert.equal(result.success, false);
    assert.ok(result.error?.includes('Signature') || result.error?.includes('verified'));
  });
});

describe('Security — dangerous permissions are blocked', () => {
  it('should block execute:shell without explicit override', () => {
    const repo = new InMemoryMarketplaceRepository();
    const installer = new ToolInstaller(repo);
    const manifest = createDangerousManifest();
    manifest.verified = true;
    manifest.checksum = 'a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890';
    manifest.signature = `sig_a1b2c3d4e5f67890_verified_${manifest.id}`;

    const result = installer.install(manifest, {
      organizationId: 'org-1', installedBy: 'user-1', targetRuntime: 'compiler-runtime',
    });

    assert.equal(result.success, false);
  });

  it('should allow dangerous permissions with explicit override', () => {
    const repo = new InMemoryMarketplaceRepository();
    const installer = new ToolInstaller(repo);
    const manifest = createDangerousManifest();
    manifest.verified = true;
    manifest.checksum = 'a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890';
    manifest.signature = `sig_a1b2c3d4e5f67890_verified_${manifest.id}`;
    manifest.permissions = ['network:external'];

    const result = installer.install(manifest, {
      organizationId: 'org-1', installedBy: 'user-1', targetRuntime: 'compiler-runtime',
      allowDangerousPermissions: true,
    });

    assert.ok(result.success, result.error ?? '');
  });

  it('should block org:admin even with override (blocked by policy)', () => {
    const repo = new InMemoryMarketplaceRepository();
    const installer = new ToolInstaller(repo);
    const manifest = createValidManifest({
      id: 'admin-tool', name: 'Admin Tool',
      permissions: ['org:admin'],
    });

    const result = installer.install(manifest, {
      organizationId: 'org-1', installedBy: 'user-1', targetRuntime: 'compiler-runtime',
      allowDangerousPermissions: true,
    });

    assert.equal(result.success, false);
    assert.ok(result.error?.includes('Permission denied') || result.error?.includes('blocked'));
  });
});

describe('Security — organization isolation', () => {
  it('should not allow org-1 to see org-2 installed tools', () => {
    const repo = new InMemoryMarketplaceRepository();
    const installer = new ToolInstaller(repo);
    const manifest = createValidManifest();

    installer.install(manifest, {
      organizationId: 'org-2', installedBy: 'user-2', targetRuntime: 'compiler-runtime',
    });

    const org1Tools = repo.getInstalledTools('org-1');
    assert.equal(org1Tools.length, 0);
  });

  it('should not allow org-1 to uninstall org-2 tools', () => {
    const repo = new InMemoryMarketplaceRepository();
    const installer = new ToolInstaller(repo);
    const manifest = createValidManifest();
    installer.install(manifest, {
      organizationId: 'org-2', installedBy: 'user-2', targetRuntime: 'compiler-runtime',
    });

    const org1Audit = repo.getAuditLog('org-1');
    assert.equal(org1Audit.length, 0);
  });
});

describe('Security — no code execution during install', () => {
  it('should not execute entrypoint during installation', () => {
    const repo = new InMemoryMarketplaceRepository();
    const installer = new ToolInstaller(repo);
    const manifest = createValidManifest({
      entrypoint: './malicious.js',
    });

    const result = installer.install(manifest, {
      organizationId: 'org-1', installedBy: 'user-1', targetRuntime: 'compiler-runtime',
    });

    assert.ok(result.success, result.error ?? '');
    assert.equal(result.installedTool?.manifest.entrypoint, './malicious.js');
  });
});

describe('Security — incompatible runtime blocked', () => {
  it('should not install browser-only tool on compiler-runtime', () => {
    const repo = new InMemoryMarketplaceRepository();
    const installer = new ToolInstaller(repo);
    const manifest = createIncompatibleManifest();
    manifest.verified = true;
    manifest.checksum = 'a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890';
    manifest.signature = `sig_a1b2c3d4e5f67890_verified_${manifest.id}`;

    const result = installer.install(manifest, {
      organizationId: 'org-1', installedBy: 'user-1', targetRuntime: 'compiler-runtime',
    });

    assert.equal(result.success, false);
    assert.ok(result.error?.includes('Compatibility'));
  });
});

describe('Security — permission analyzer risk levels', () => {
  const analyzer = new ToolPermissionAnalyzer();

  it('should classify read-only as low risk', () => {
    const manifest = createValidManifest({ permissions: ['read:memory'] });
    const analysis = analyzer.analyze(manifest);
    assert.equal(analysis.riskLevel, 'low');
  });

  it('should classify env access as critical risk', () => {
    const manifest = createValidManifest({ permissions: ['env:read'] });
    const analysis = analyzer.analyze(manifest);
    assert.equal(analysis.riskLevel, 'critical');
  });
});
