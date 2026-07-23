import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

export interface ICredentialEncryptionProvider {
  encrypt(plaintext: string): string;
  decrypt(ciphertext: string): string;
  rotateKey(newKey: string): void;
}

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

export class DevelopmentCredentialEncryptionProvider implements ICredentialEncryptionProvider {
  private encryptionKey: string;

  constructor(encryptionKey = 'dev-key-not-for-production-use') {
    this.encryptionKey = encryptionKey;
  }

  encrypt(plaintext: string): string {
    const salt = randomBytes(SALT_LENGTH);
    const key = scryptSync(this.encryptionKey, salt, KEY_LENGTH);
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([salt, iv, tag, encrypted]).toString('base64');
  }

  decrypt(ciphertext: string): string {
    const buf = Buffer.from(ciphertext, 'base64');
    const salt = buf.subarray(0, SALT_LENGTH);
    const iv = buf.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = buf.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const encrypted = buf.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const key = scryptSync(this.encryptionKey, salt, KEY_LENGTH);
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  }

  rotateKey(newKey: string): void {
    this.encryptionKey = newKey;
  }
}
