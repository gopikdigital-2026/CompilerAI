import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ToolSignatureVerifier } from '../src/services/ToolSignatureVerifier.ts';
import { createValidManifest, createUnverifiedManifest } from './helpers.ts';

describe('ToolSignatureVerifier — unit tests', () => {
  const verifier = new ToolSignatureVerifier();

  it('should verify a valid signed manifest', () => {
    const manifest = createValidManifest();
    const result = verifier.verify(manifest);
    assert.ok(result.valid, result.reason);
  });

  it('should reject unverified manifest', () => {
    const manifest = createUnverifiedManifest();
    const result = verifier.verify(manifest);
    assert.equal(result.valid, false);
    assert.ok(result.reason.includes('verified'));
  });

  it('should reject mismatched signature', () => {
    const manifest = createValidManifest({
      signature: 'sig_wrongchecksum123_signature_test_tool',
    });
    const result = verifier.verify(manifest);
    assert.equal(result.valid, false);
    assert.ok(result.reason.includes('checksum'));
  });

  it('should reject empty signature', () => {
    const manifest = createValidManifest({ signature: '' });
    const result = verifier.verify(manifest);
    assert.equal(result.valid, false);
    assert.ok(result.reason.includes('empty'));
  });

  it('should reject invalid checksum', () => {
    const manifest = createValidManifest({ checksum: 'short' });
    const result = verifier.verify(manifest);
    assert.equal(result.valid, false);
    assert.ok(result.reason.toLowerCase().includes('checksum'));
  });
});
