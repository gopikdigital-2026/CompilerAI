import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ToolPermissionAnalyzer } from '../src/services/ToolPermissionAnalyzer.ts';
import { createValidManifest, createDangerousManifest } from './helpers.ts';

describe('ToolPermissionAnalyzer — unit tests', () => {
  const analyzer = new ToolPermissionAnalyzer();

  it('should allow safe permissions', () => {
    const manifest = createValidManifest({ permissions: ['read:memory'] });
    const analysis = analyzer.analyze(manifest);
    assert.equal(analysis.allowed, true);
    assert.equal(analysis.riskLevel, 'low');
    assert.equal(analysis.dangerousPermissions.length, 0);
  });

  it('should flag dangerous permissions', () => {
    const manifest = createDangerousManifest();
    const analysis = analyzer.analyze(manifest);
    assert.ok(analysis.dangerousPermissions.length > 0);
    assert.equal(analysis.riskLevel, 'critical');
    assert.ok(analysis.warnings.some((w) => w.includes('dangerous')));
  });

  it('should block execute:shell by default', () => {
    const manifest = createValidManifest({ permissions: ['execute:shell'] });
    const analysis = analyzer.analyze(manifest);
    assert.equal(analysis.allowed, false);
    assert.ok(analysis.blockedPermissions.includes('execute:shell'));
  });

  it('should block org:admin by default', () => {
    const manifest = createValidManifest({ permissions: ['org:admin'] });
    const analysis = analyzer.analyze(manifest);
    assert.equal(analysis.allowed, false);
    assert.ok(analysis.blockedPermissions.includes('org:admin'));
  });

  it('should warn about network:external', () => {
    const manifest = createValidManifest({ permissions: ['network:external'] });
    const analysis = analyzer.analyze(manifest);
    assert.ok(analysis.warnings.some((w) => w.includes('network')));
  });

  it('should calculate medium risk for write:memory', () => {
    const manifest = createValidManifest({ permissions: ['write:memory'] });
    const analysis = analyzer.analyze(manifest);
    assert.equal(analysis.riskLevel, 'medium');
  });

  it('should allow custom blocked permissions', () => {
    const customAnalyzer = new ToolPermissionAnalyzer(['file:write']);
    const manifest = createValidManifest({ permissions: ['file:write'] });
    const analysis = customAnalyzer.analyze(manifest);
    assert.equal(analysis.allowed, false);
    assert.ok(analysis.blockedPermissions.includes('file:write'));
  });
});
