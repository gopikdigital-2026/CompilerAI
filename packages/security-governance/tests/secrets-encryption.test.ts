import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';
import { EncryptionService } from '../src/encryption/EncryptionService.js';
import { InMemorySecretStore, SecretsManager } from '../src/secrets/SecretsManager.js';

describe('EncryptionService', () => {
  let enc: EncryptionService;

  beforeEach(() => {
    enc = new EncryptionService();
  });

  test('encrypts and decrypts data', () => {
    const plaintext = 'Hello, World!';
    const encrypted = enc.encrypt(plaintext);
    assert.notEqual(encrypted.ciphertext, plaintext);
    assert.ok(encrypted.iv);
    assert.ok(encrypted.keyId);
    const decrypted = enc.decrypt(encrypted);
    assert.equal(decrypted, plaintext);
  });

  test('produces different ciphertexts for same plaintext', () => {
    const e1 = enc.encrypt('test');
    const e2 = enc.encrypt('test');
    assert.notEqual(e1.ciphertext, e2.ciphertext);
  });

  test('hashes data deterministically', () => {
    const h1 = enc.hash('test');
    const h2 = enc.hash('test');
    assert.equal(h1, h2);
    assert.notEqual(h1, enc.hash('different'));
  });

  test('signs and verifies data', () => {
    const data = 'important message';
    const sig = enc.sign(data);
    assert.ok(sig.data);
    assert.equal(enc.verify(data, sig), true);
    assert.equal(enc.verify('tampered', sig), false);
  });

  test('rotates key and still decrypts with old key id', () => {
    const encrypted = enc.encrypt('secret data', 'default');
    const newKeyId = enc.rotateKey('default');
    assert.notEqual(newKeyId, 'default');
    // Old data should still decrypt since keyId is embedded
    const decrypted = enc.decrypt(encrypted);
    assert.equal(decrypted, 'secret data');
  });

  test('getKeyIds returns all keys', () => {
    enc.rotateKey('default');
    assert.ok(enc.getKeyIds().length >= 2);
  });

  test('importKey adds a new key', () => {
    const keyMaterial = Buffer.alloc(32, 0x42);
    enc.importKey('custom-key', keyMaterial);
    const encrypted = enc.encrypt('test', 'custom-key');
    const decrypted = enc.decrypt(encrypted);
    assert.equal(decrypted, 'test');
  });

  test('throws on unknown key', () => {
    assert.throws(() => enc.encrypt('test', 'nonexistent'));
  });
});

describe('SecretsManager', () => {
  let secrets: SecretsManager;
  let enc: EncryptionService;

  beforeEach(() => {
    enc = new EncryptionService();
    const store = new InMemorySecretStore();
    secrets = new SecretsManager(
      store,
      (pt) => {
        const data = enc.encrypt(pt);
        return `${data.iv}:${data.ciphertext}`;
      },
      (ct) => {
        const [iv, ciphertext] = ct.split(':');
        return enc.decrypt({ ciphertext, iv, algorithm: 'aes-256-cbc', keyId: 'default' });
      },
    );
  });

  test('stores and retrieves a secret', () => {
    const record = secrets.storeSecret('api-key', 'secret-value-123', 'api_key', 'org-1');
    assert.ok(record.id);
    assert.notEqual(record.encryptedValue, 'secret-value-123');
    const value = secrets.getSecret(record.id);
    assert.equal(value, 'secret-value-123');
  });

  test('retrieves secret by name', () => {
    secrets.storeSecret('oauth-token', 'token-abc', 'oauth_token', 'org-1');
    const value = secrets.getSecretByName('oauth-token', 'org-1');
    assert.equal(value, 'token-abc');
  });

  test('never stores secrets in plaintext', () => {
    const record = secrets.storeSecret('cert', 'my-cert-data', 'certificate', 'org-1');
    assert.ok(!record.encryptedValue.includes('my-cert-data'));
  });

  test('lists secrets by organization', () => {
    secrets.storeSecret('s1', 'v1', 'api_key', 'org-1');
    secrets.storeSecret('s2', 'v2', 'api_key', 'org-2');
    assert.equal(secrets.listSecrets('org-1').length, 1);
    assert.equal(secrets.listSecrets('org-2').length, 1);
  });

  test('deletes a secret', () => {
    const record = secrets.storeSecret('s1', 'v1', 'api_key', 'org-1');
    assert.equal(secrets.deleteSecret(record.id), true);
    assert.equal(secrets.getSecret(record.id), undefined);
  });

  test('rotates a secret', () => {
    const record = secrets.storeSecret('s1', 'old-value', 'api_key', 'org-1');
    secrets.rotateSecret(record.id, 'new-value');
    assert.equal(secrets.getSecret(record.id), 'new-value');
  });

  test('all 4 secret types supported', () => {
    secrets.storeSecret('k1', 'v', 'api_key', 'org-1');
    secrets.storeSecret('k2', 'v', 'oauth_token', 'org-1');
    secrets.storeSecret('k3', 'v', 'certificate', 'org-1');
    secrets.storeSecret('k4', 'v', 'internal', 'org-1');
    assert.equal(secrets.listSecrets('org-1').length, 4);
  });
});
