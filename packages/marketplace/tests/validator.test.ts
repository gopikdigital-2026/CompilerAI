import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ToolManifestValidator } from '../src/services/ToolManifestValidator.ts';
import { createValidManifest } from './helpers.ts';

describe('ToolManifestValidator — unit tests', () => {
  const validator = new ToolManifestValidator();

  it('should validate a correct manifest', () => {
    const manifest = createValidManifest();
    const result = validator.validate(manifest);
    assert.ok(result.valid, `Should be valid: ${result.errors.join('; ')}`);
    assert.equal(result.errors.length, 0);
  });

  it('should reject missing required fields', () => {
    const result = validator.validate({});
    assert.equal(result.valid, false);
    assert.ok(result.errors.length >= 10, 'should report all missing fields');
  });

  it('should reject invalid semver', () => {
    const result = validator.validate(createValidManifest({ version: 'not-semver' }));
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('semver')));
  });

  it('should reject invalid category', () => {
    const result = validator.validate(createValidManifest({ category: 'invalid' as never }));
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('category')));
  });

  it('should reject invalid permissions', () => {
    const result = validator.validate(createValidManifest({ permissions: ['hack:system' as never] }));
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('permission')));
  });

  it('should reject empty runtimeCompatibility', () => {
    const result = validator.validate(createValidManifest({ runtimeCompatibility: [] }));
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('runtimeCompatibility')));
  });

  it('should reject invalid checksum format', () => {
    const result = validator.validate(createValidManifest({ checksum: 'short' }));
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('checksum')));
  });

  it('should reject non-boolean verified field', () => {
    const result = validator.validate(createValidManifest({ verified: 'yes' as unknown as boolean }));
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('verified')));
  });

  it('should reject invalid id format', () => {
    const result = validator.validate(createValidManifest({ id: 'UPPER CASE' }));
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('id')));
  });

  it('should warn when verified is false', () => {
    const result = validator.validate(createValidManifest({ verified: false }));
    assert.equal(result.valid, true);
    assert.ok(result.warnings.some((w) => w.includes('not verified')));
  });

  it('should warn when capabilities is empty', () => {
    const result = validator.validate(createValidManifest({ capabilities: [] }));
    assert.equal(result.valid, true);
    assert.ok(result.warnings.some((w) => w.includes('capabilities')));
  });

  it('should validate dependencies structure', () => {
    const result = validator.validate(
      createValidManifest({ dependencies: [{ toolId: '', versionRange: '>=1.0.0' }] }),
    );
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('toolId')));
  });
});
