import { createHash, createCipheriv, createDecipheriv, randomBytes, createHmac } from 'node:crypto';
import type { EncryptedData, IEncryptionService, Signature } from '../models.js';

const DEFAULT_ALGORITHM = 'aes-256-cbc';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;

export class EncryptionService implements IEncryptionService {
  private readonly keys = new Map<string, Buffer>();
  private currentKeyId: string;

  constructor() {
    this.currentKeyId = 'default';
    this.keys.set(this.currentKeyId, randomBytes(KEY_LENGTH));
  }

  encrypt(plaintext: string, keyId?: string): EncryptedData {
    const kid = keyId ?? this.currentKeyId;
    const key = this.keys.get(kid);
    if (!key) throw new Error(`Key '${kid}' not found`);

    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(DEFAULT_ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);

    return {
      ciphertext: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      algorithm: DEFAULT_ALGORITHM,
      keyId: kid,
    };
  }

  decrypt(data: EncryptedData, keyId?: string): string {
    const kid = keyId ?? data.keyId;
    const key = this.keys.get(kid);
    if (!key) throw new Error(`Key '${kid}' not found`);

    const iv = Buffer.from(data.iv, 'base64');
    const decipher = createDecipheriv(data.algorithm, key, iv);
    const decrypted = Buffer.concat([decipher.update(Buffer.from(data.ciphertext, 'base64')), decipher.final()]);

    return decrypted.toString('utf8');
  }

  hash(data: string, algorithm: string = 'sha256'): string {
    return createHash(algorithm).update(data).digest('hex');
  }

  sign(data: string, keyId?: string): Signature {
    const kid = keyId ?? this.currentKeyId;
    const key = this.keys.get(kid);
    if (!key) throw new Error(`Key '${kid}' not found`);

    const hmac = createHmac('sha256', key);
    hmac.update(data);

    return {
      data: hmac.digest('hex'),
      keyId: kid,
      algorithm: 'HMAC-SHA256',
    };
  }

  verify(data: string, signature: Signature, keyId?: string): boolean {
    const kid = keyId ?? signature.keyId;
    const expected = this.sign(data, kid);
    return expected.data === signature.data;
  }

  rotateKey(keyId: string): string {
    const newKeyId = `${keyId}-${Date.now()}`;
    this.keys.set(newKeyId, randomBytes(KEY_LENGTH));
    this.currentKeyId = newKeyId;
    return newKeyId;
  }

  getKeyIds(): string[] {
    return Array.from(this.keys.keys());
  }

  importKey(keyId: string, keyMaterial: Buffer): void {
    if (keyMaterial.length !== KEY_LENGTH) {
      throw new Error(`Key must be ${KEY_LENGTH} bytes, got ${keyMaterial.length}`);
    }
    this.keys.set(keyId, keyMaterial);
  }
}
