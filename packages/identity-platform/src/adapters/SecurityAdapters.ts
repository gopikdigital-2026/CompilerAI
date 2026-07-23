import { createHash, randomBytes, pbkdf2Sync } from 'node:crypto';

export interface IPasswordHasher {
  hash(password: string): string;
  verify(password: string, hash: string): boolean;
}

export class PasswordHasher implements IPasswordHasher {
  private readonly iterations: number;
  private readonly keylen: number;
  private readonly digest: string;

  constructor(iterations = 100_000, keylen = 64, digest = 'sha512') {
    this.iterations = iterations;
    this.keylen = keylen;
    this.digest = digest;
  }

  hash(password: string): string {
    const salt = randomBytes(32).toString('hex');
    const derived = pbkdf2Sync(password, salt, this.iterations, this.keylen, this.digest).toString('hex');
    return `pbkdf2$${this.iterations}$${salt}$${derived}`;
  }

  verify(password: string, hash: string): boolean {
    const parts = hash.split('$');
    if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
    const iterations = parseInt(parts[1]!, 10);
    const salt = parts[2]!;
    const storedHash = parts[3]!;
    const derived = pbkdf2Sync(password, salt, iterations, this.keylen, this.digest).toString('hex');
    return derived === storedHash;
  }
}

export interface ITokenGenerator {
  generate(prefix: string): { token: string; hash: string; preview: string };
  hash(token: string): string;
}

export class TokenGenerator implements ITokenGenerator {
  hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  generate(prefix: string): { token: string; hash: string; preview: string } {
    const raw = randomBytes(32).toString('hex');
    const token = `${prefix}${raw}`;
    const hash = this.hash(token);
    const preview = `${prefix}${raw.substring(0, 6)}...${raw.substring(raw.length - 4)}`;
    return { token, hash, preview };
  }
}

export function maskApiKey(key: string): string {
  if (key.length < 12) return '****';
  return `${key.substring(0, 8)}...${key.substring(key.length - 4)}`;
}

export function sanitizeLogValue(value: unknown): unknown {
  if (typeof value === 'string') {
    const SECRET_PATTERNS = [/sk-[a-zA-Z0-9]{16,}/g, /Bearer\s+[a-zA-Z0-9._-]+/g, /ck_live_[a-zA-Z0-9]{16,}/g];
    let sanitized = value;
    for (const pattern of SECRET_PATTERNS) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }
    return sanitized;
  }
  return value;
}
