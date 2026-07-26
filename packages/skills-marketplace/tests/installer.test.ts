import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';
import { SkillInstaller } from '../src/installer/SkillInstaller.js';
import { SkillRegistry } from '../src/registry/SkillRegistry.js';
import { PermissionEngine } from '../src/permissions/PermissionEngine.js';
import { LifecycleManager } from '../src/lifecycle/LifecycleManager.js';
import { TelemetryEngine } from '../src/telemetry/TelemetryEngine.js';
import type { SkillManifest, SkillPermission } from '../src/models.js';

function makeManifest(id: string, perms: SkillPermission[] = [], deps: { skillId: string; versionRange: string; optional: boolean }[] = []): SkillManifest {
  return {
    id, name: `Skill ${id}`, description: '', version: '1.0.0', author: 'a',
    organization: 'org-1', category: 'development', tags: [], dependencies: deps,
    permissions: perms, capabilities: [], compatibleConnectors: [], minPlatformVersion: '1.0.0',
    commands: [{ name: 'run', description: 'Run', parameters: [] }], actions: [], events: [],
  };
}

describe('SkillInstaller', () => {
  let registry: SkillRegistry;
  let installer: SkillInstaller;
  let lifecycle: LifecycleManager;
  let telemetry: TelemetryEngine;

  beforeEach(() => {
    registry = new SkillRegistry();
    lifecycle = new LifecycleManager();
    telemetry = new TelemetryEngine();
    installer = new SkillInstaller(registry, new PermissionEngine(), lifecycle, telemetry);
  });

  test('installs a skill with valid permissions', () => {
    const perms: SkillPermission[] = [{ resource: 'github', access: ['read'], reason: 'r' }];
    registry.register(makeManifest('s1', perms));
    const result = installer.install('s1', perms);
    assert.equal(result.success, true);
    assert.equal(result.installedVersion, '1.0.0');
    assert.equal(registry.get('s1')?.status, 'installed');
  });

  test('fails installation with missing permissions', () => {
    const perms: SkillPermission[] = [{ resource: 'github', access: ['read'], reason: 'r' }];
    registry.register(makeManifest('s1', perms));
    const result = installer.install('s1', []);
    assert.equal(result.success, false);
    assert.ok(result.errors.length > 0);
  });

  test('fails installation for non-existent skill', () => {
    const result = installer.install('nonexistent');
    assert.equal(result.success, false);
    assert.ok(result.errors[0].includes('not found'));
  });

  test('auto-installs required dependencies', () => {
    registry.register(makeManifest('dep1'));
    registry.register(makeManifest('s1', [], [{ skillId: 'dep1', versionRange: '>=1.0.0', optional: false }]));
    const result = installer.install('s1');
    assert.equal(result.success, true);
    assert.ok(result.dependenciesInstalled.includes('dep1'));
    assert.equal(registry.get('dep1')?.status, 'installed');
  });

  test('uninstalls a skill', () => {
    registry.register(makeManifest('s1'));
    installer.install('s1');
    const result = installer.uninstall('s1');
    assert.equal(result.success, true);
    assert.equal(registry.get('s1')?.status, 'uninstalled');
  });

  test('uninstall fails if other skills depend on it', () => {
    registry.register(makeManifest('dep1'));
    registry.register(makeManifest('s1', [], [{ skillId: 'dep1', versionRange: '>=1.0.0', optional: false }]));
    installer.install('s1');
    const result = installer.uninstall('dep1');
    assert.equal(result.success, false);
    assert.ok(result.errors.some((e) => e.includes('depend')));
  });

  test('updates a skill to a new version', () => {
    registry.register(makeManifest('s1'));
    registry.addVersion('s1', { version: '2.0.0', releaseDate: new Date().toISOString(), changelog: 'Major', deprecated: false });
    installer.install('s1');
    const result = installer.update('s1');
    assert.equal(result.success, true);
    assert.equal(result.previousVersion, '1.0.0');
    assert.equal(result.newVersion, '2.0.0');
  });

  test('update to specific version', () => {
    registry.register(makeManifest('s1'));
    registry.addVersion('s1', { version: '1.1.0', releaseDate: '', changelog: 'minor', deprecated: false });
    registry.addVersion('s1', { version: '2.0.0', releaseDate: '', changelog: 'major', deprecated: false });
    installer.install('s1');
    const result = installer.update('s1', '1.1.0');
    assert.equal(result.success, true);
    assert.equal(result.newVersion, '1.1.0');
  });

  test('update fails for deprecated version', () => {
    registry.register(makeManifest('s1'));
    registry.addVersion('s1', { version: '2.0.0', releaseDate: '', changelog: '', deprecated: true });
    installer.install('s1');
    const result = installer.update('s1', '2.0.0');
    assert.equal(result.success, false);
    assert.ok(result.errors.some((e) => e.includes('deprecated')));
  });

  test('enable activates an installed skill', () => {
    registry.register(makeManifest('s1'));
    installer.install('s1');
    assert.equal(installer.enable('s1'), true);
    assert.ok(registry.get('s1')?.enabledAt);
  });

  test('disable deactivates an installed skill', () => {
    registry.register(makeManifest('s1'));
    installer.install('s1');
    installer.enable('s1');
    assert.equal(installer.disable('s1'), true);
    assert.equal(registry.get('s1')?.status, 'disabled');
  });

  test('enable fails for non-installed skill', () => {
    registry.register(makeManifest('s1'));
    assert.equal(installer.enable('s1'), false);
  });

  test('records lifecycle events', () => {
    registry.register(makeManifest('s1'));
    installer.install('s1');
    installer.enable('s1');
    installer.disable('s1');
    installer.uninstall('s1');
    const events = lifecycle.getEvents('s1');
    assert.ok(events.some((e) => e.type === 'install'));
    assert.ok(events.some((e) => e.type === 'activate'));
    assert.ok(events.some((e) => e.type === 'deactivate'));
    assert.ok(events.some((e) => e.type === 'uninstall'));
  });

  test('emits telemetry events', () => {
    registry.register(makeManifest('s1'));
    installer.install('s1');
    assert.ok(telemetry.getEventsByType('skill.installed').length > 0);
  });

  test('emits permission.denied when permissions missing', () => {
    const perms: SkillPermission[] = [{ resource: 'github', access: ['read'], reason: 'r' }];
    registry.register(makeManifest('s1', perms));
    installer.install('s1', []);
    assert.ok(telemetry.getEventsByType('permission.denied').length > 0);
  });
});
