import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  InMemoryCredentialStore,
  DevelopmentCredentialEncryptionProvider,
  CredentialResolver,
} from '../src/index';

const CID = 'test-conn' as never;
const OID = 'org-1';

describe('InMemoryCredentialStore', () => {
  let store: InMemoryCredentialStore;

  beforeEach(() => {
    store = new InMemoryCredentialStore();
  });

  it('should save and retrieve credentials', async () => {
    const record = await store.save({
      connectorId: CID,
      organizationId: OID,
      credentialType: 'oauth2',
      encryptedData: 'encrypted-token-data',
      expiresAt: null,
    });

    assert.ok(record);
    assert.equal(record.connectorId, CID);
    assert.equal(record.organizationId, OID);
    assert.equal(record.credentialType, 'oauth2');
    assert.equal(record.encryptedData, 'encrypted-token-data');

    const retrieved = await store.get(CID, OID);
    assert.ok(retrieved);
    assert.equal(retrieved!.encryptedData, 'encrypted-token-data');
  });

  it('should return null for non-existent credentials', async () => {
    const record = await store.get(CID, OID);
    assert.equal(record, null);
  });

  it('should check existence', async () => {
    assert.equal(await store.exists(CID, OID), false);
    await store.save({
      connectorId: CID,
      organizationId: OID,
      credentialType: 'api_key',
      encryptedData: 'data',
      expiresAt: null,
    });
    assert.equal(await store.exists(CID, OID), true);
  });

  it('should delete credentials', async () => {
    await store.save({
      connectorId: CID,
      organizationId: OID,
      credentialType: 'api_key',
      encryptedData: 'data',
      expiresAt: null,
    });
    assert.equal(await store.exists(CID, OID), true);

    const deleted = await store.delete(CID, OID);
    assert.equal(deleted, true);
    assert.equal(await store.exists(CID, OID), false);
  });

  it('should return false when deleting non-existent credentials', async () => {
    const deleted = await store.delete(CID, OID);
    assert.equal(deleted, false);
  });

  it('should list credentials by organization', async () => {
    await store.save({ connectorId: 'conn-1' as never, organizationId: OID, credentialType: 'api_key', encryptedData: 'd1', expiresAt: null });
    await store.save({ connectorId: 'conn-2' as never, organizationId: OID, credentialType: 'oauth2', encryptedData: 'd2', expiresAt: null });
    await store.save({ connectorId: 'conn-3' as never, organizationId: 'org-2', credentialType: 'api_key', encryptedData: 'd3', expiresAt: null });

    const orgCreds = await store.listByOrganization(OID);
    assert.equal(orgCreds.length, 2);
    assert.ok(orgCreds.every((c) => c.organizationId === OID));
  });

  it('should rotate credentials', async () => {
    await store.save({
      connectorId: CID,
      organizationId: OID,
      credentialType: 'oauth2',
      encryptedData: 'old-data',
      expiresAt: null,
    });

    await store.rotate(CID, OID, 'new-data');

    const record = await store.get(CID, OID);
    assert.ok(record);
    assert.equal(record!.encryptedData, 'new-data');
  });
});

describe('DevelopmentCredentialEncryptionProvider', () => {
  let provider: DevelopmentCredentialEncryptionProvider;

  beforeEach(() => {
    provider = new DevelopmentCredentialEncryptionProvider('test-key');
  });

  it('should encrypt and decrypt successfully', () => {
    const plaintext = '{"accessToken":"secret-token-123"}';
    const encrypted = provider.encrypt(plaintext);
    assert.notEqual(encrypted, plaintext);

    const decrypted = provider.decrypt(encrypted);
    assert.equal(decrypted, plaintext);
  });

  it('should produce different ciphertexts for same plaintext (random IV)', () => {
    const plaintext = 'same-data';
    const e1 = provider.encrypt(plaintext);
    const e2 = provider.encrypt(plaintext);
    assert.notEqual(e1, e2);
  });

  it('should fail to decrypt old data after key rotation', () => {
    const plaintext = 'sensitive-data';
    const encrypted = provider.encrypt(plaintext);

    provider.rotateKey('new-key');
    assert.throws(() => provider.decrypt(encrypted));
  });

  it('should encrypt and decrypt with new key after rotation', () => {
    provider.rotateKey('new-key');
    const plaintext = 'new-sensitive-data';
    const encrypted = provider.encrypt(plaintext);
    const decrypted = provider.decrypt(encrypted);
    assert.equal(decrypted, plaintext);
  });
});

describe('CredentialResolver', () => {
  let store: InMemoryCredentialStore;
  let encryption: DevelopmentCredentialEncryptionProvider;
  let resolver: CredentialResolver;

  beforeEach(() => {
    store = new InMemoryCredentialStore();
    encryption = new DevelopmentCredentialEncryptionProvider('test-key');
    resolver = new CredentialResolver(store, encryption);
  });

  it('should store and resolve credentials', async () => {
    await resolver.storeCredentials(CID, OID, 'oauth2', {
      accessToken: 'access-123',
      refreshToken: 'refresh-456',
      tokenType: 'Bearer',
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      scope: 'read write',
    });

    const resolved = await resolver.resolve(CID, OID);
    assert.ok(resolved);
    assert.equal(resolved!.credentialType, 'oauth2');
    assert.equal(resolved!.data['accessToken'], 'access-123');
    assert.equal(resolved!.data['refreshToken'], 'refresh-456');
  });

  it('should return null for non-existent credentials', async () => {
    const resolved = await resolver.resolve(CID, OID);
    assert.equal(resolved, null);
  });

  it('should handle api_key credentials', async () => {
    await resolver.storeCredentials(CID, OID, 'api_key', {
      apiKey: 'key-123',
      headerName: 'X-API-Key',
    });

    const resolved = await resolver.resolve(CID, OID);
    assert.ok(resolved);
    assert.equal(resolved!.data['apiKey'], 'key-123');
  });

  it('should encrypt data in store', async () => {
    await resolver.storeCredentials(CID, OID, 'oauth2', {
      accessToken: 'access-123',
    });

    const record = await store.get(CID, OID);
    assert.ok(record);
    assert.ok(!record!.encryptedData.includes('access-123'));
  });

  it('should rotate credentials', async () => {
    await resolver.storeCredentials(CID, OID, 'oauth2', {
      accessToken: 'old-token',
    });

    await resolver.rotate(CID, OID, { accessToken: 'new-token' });

    const resolved = await resolver.resolve(CID, OID);
    assert.ok(resolved);
    assert.equal(resolved!.data['accessToken'], 'new-token');
  });

  it('should delete credentials', async () => {
    await resolver.storeCredentials(CID, OID, 'api_key', { apiKey: 'k' });
    assert.equal(await store.exists(CID, OID), true);

    await resolver.delete(CID, OID);
    assert.equal(await store.exists(CID, OID), false);
  });
});
