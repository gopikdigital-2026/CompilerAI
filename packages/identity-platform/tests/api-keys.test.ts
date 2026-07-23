import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { IdentityPlatform, ApiKeyRevokedError } from '../src/index';
import { createPlatform, createTestOrg } from './helpers';

describe('API Key revocation and rotation', () => {
  let platform: IdentityPlatform;

  beforeEach(async () => {
    platform = await createPlatform();
  });

  it('should revoke an API key', async () => {
    const { org, user } = await createTestOrg(platform);
    const { apiKey } = await platform.apiKeys.create({
      name: 'test-key', organizationId: org.id, createdByUserId: user.id, scopes: ['read'], expiresAt: null,
    });
    await platform.apiKeys.revoke(apiKey.id, user.id);
    const revoked = await platform.apiKeys.findById(apiKey.id);
    assert.equal(revoked.status, 'REVOKED');
    assert.ok(revoked.revokedAt);
    assert.equal(revoked.revokedByUserId, user.id);
  });

  it('should not authenticate with revoked key', async () => {
    const { org, user } = await createTestOrg(platform);
    const { apiKey, rawKey } = await platform.apiKeys.create({
      name: 'test-key', organizationId: org.id, createdByUserId: user.id, scopes: ['read'], expiresAt: null,
    });
    await platform.apiKeys.revoke(apiKey.id, user.id);
    await assert.rejects(
      platform.apiKeys.authenticate(rawKey),
      ApiKeyRevokedError,
    );
  });

  it('should rotate an API key', async () => {
    const { org, user } = await createTestOrg(platform);
    const { apiKey, rawKey } = await platform.apiKeys.create({
      name: 'rotatable-key', organizationId: org.id, createdByUserId: user.id, scopes: ['read', 'write'], expiresAt: null,
    });
    const { apiKey: newKey, rawKey: newRawKey } = await platform.apiKeys.rotate(apiKey.id, user.id);
    assert.notEqual(newKey.id, apiKey.id);
    assert.notEqual(rawKey, newRawKey);
    const oldKey = await platform.apiKeys.findById(apiKey.id);
    assert.equal(oldKey.status, 'REVOKED');
    const authed = await platform.apiKeys.authenticate(newRawKey);
    assert.equal(authed.id, newKey.id);
  });

  it('should store only hash and preview, not raw key', async () => {
    const { org, user } = await createTestOrg(platform);
    const { apiKey, rawKey } = await platform.apiKeys.create({
      name: 'secure-key', organizationId: org.id, createdByUserId: user.id, scopes: ['read'], expiresAt: null,
    });
    assert.ok(apiKey.keyHash);
    assert.ok(apiKey.keyPreview);
    assert.notEqual(apiKey.keyHash, rawKey);
    assert.ok(!apiKey.keyPreview.includes(rawKey));
  });

  it('should record last used timestamp on authentication', async () => {
    const { org, user } = await createTestOrg(platform);
    const { rawKey } = await platform.apiKeys.create({
      name: 'tracked-key', organizationId: org.id, createdByUserId: user.id, scopes: ['read'], expiresAt: null,
    });
    const authed = await platform.apiKeys.authenticate(rawKey);
    assert.ok(authed.lastUsedAt);
  });
});
