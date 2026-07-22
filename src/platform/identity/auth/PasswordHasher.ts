// ─── Password hasher ────────────────────────────────────────────────────────────
// Uses Web Crypto API (available in both browser and Deno/Node 18+).
// PBKDF2 with SHA-256, 100k iterations, 16-byte salt.

const ITERATIONS = 100_000;
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;

function getCrypto(): Crypto {
  if (typeof globalThis !== 'undefined' && globalThis.crypto) return globalThis.crypto;
  throw new Error('Web Crypto API is not available');
}

const cryptoSubtle = (): SubtleCrypto => getCrypto().subtle;

function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

export class PBKDF2PasswordHasher implements IPasswordHasher {
  async hash(password: string): Promise<string> {
    const crypto = getCrypto();
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const keyMaterial = await cryptoSubtle().importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const derivedBits = await cryptoSubtle().deriveBits(
      { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
      keyMaterial,
      KEY_LENGTH * 8,
    );
    return `pbkdf2$${ITERATIONS}$${bufferToHex(salt.buffer)}$${bufferToHex(derivedBits)}`;
  }

  async verify(password: string, hash: string): Promise<boolean> {
    const parts = hash.split('$');
    if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
    const iterations = parseInt(parts[1], 10);
    const salt = hexToBuffer(parts[2]);
    const expectedKey = parts[3];
    const keyMaterial = await cryptoSubtle().importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const derivedBits = await cryptoSubtle().deriveBits(
      { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
      keyMaterial,
      KEY_LENGTH * 8,
    );
    return bufferToHex(derivedBits) === expectedKey;
  }
}

// ─── Simple hash for non-password use (API keys, tokens) ───────────────────────

export async function sha256Hex(input: string): Promise<string> {
  const crypto = getCrypto();
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return bufferToHex(hashBuffer);
}

export async function verifyHash(input: string, hash: string): Promise<boolean> {
  const computed = await sha256Hex(input);
  return computed === hash;
}

// Import the interface for re-export
import type { IPasswordHasher } from './AuthInterfaces';
