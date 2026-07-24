import { createSign, createPrivateKey, type KeyObject } from 'node:crypto';
import type { GitHubAppCredentials, GitHubAppJwtClaims } from './GitHubAppAuthContracts';

export interface GitHubAppJwtResult {
  readonly jwt: string;
  readonly claims: GitHubAppJwtClaims;
}

export interface Clock {
  now(): Date;
}

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

export class GitHubAppJwtProvider {
  private cachedKey: KeyObject | null = null;
  private cachedPrivateKeyPem: string | null = null;

  constructor(
    private readonly clock: Clock = new SystemClock(),
  ) {}

  generateJwt(credentials: GitHubAppCredentials, options?: { readonly ttlSeconds?: number }): GitHubAppJwtResult {
    const privateKey = credentials.privateKey;
    if (!privateKey || privateKey.length === 0) {
      throw new Error('GitHub App private key is required');
    }

    const ttl = options?.ttlSeconds ?? 600;
    if (ttl < 1 || ttl > 600) {
      throw new Error('JWT TTL must be between 1 and 600 seconds');
    }

    const now = this.clock.now();
    const iat = Math.floor(now.getTime() / 1000) - 60;
    const exp = iat + ttl;

    const claims: GitHubAppJwtClaims = {
      iss: credentials.appId,
      iat,
      exp,
    };

    const header = { alg: 'RS256', typ: 'JWT' };
    const payload = claims;

    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));
    const signingInput = `${encodedHeader}.${encodedPayload}`;

    const keyObject = this.parsePrivateKey(privateKey);
    const signer = createSign('RSA-SHA256');
    signer.update(signingInput);
    signer.end();
    const signature = signer.sign(keyObject);

    const jwt = `${signingInput}.${this.base64UrlEncode(signature.toString('base64'))}`;

    return { jwt, claims };
  }

  verifyJwtStructure(jwt: string): boolean {
    const parts = jwt.split('.');
    if (parts.length !== 3) return false;
    if (parts.some((p) => p.length === 0)) return false;
    return true;
  }

  isExpired(claims: GitHubAppJwtClaims): boolean {
    const now = Math.floor(this.clock.now().getTime() / 1000);
    return now >= claims.exp;
  }

  extractClaims(jwt: string): GitHubAppJwtClaims {
    const parts = jwt.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format: expected 3 parts');
    }
    try {
      const decoded = this.base64UrlDecode(parts[1]);
      const parsed = JSON.parse(decoded) as GitHubAppJwtClaims;
      if (typeof parsed.iss !== 'number' || typeof parsed.iat !== 'number' || typeof parsed.exp !== 'number') {
        throw new Error('Invalid JWT claims: missing required fields');
      }
      return parsed;
    } catch {
      throw new Error('Invalid JWT payload');
    }
  }

  private parsePrivateKey(pem: string): KeyObject {
    if (this.cachedPrivateKeyPem === pem && this.cachedKey) {
      return this.cachedKey;
    }
    try {
      this.cachedPrivateKeyPem = pem;
      this.cachedKey = createPrivateKey({ key: pem, format: 'pem' });
      return this.cachedKey;
    } catch {
      throw new Error('Invalid private key format: expected PEM-encoded RSA private key');
    }
  }

  private base64UrlEncode(input: string | Buffer): string {
    const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : Buffer.from(input);
    return buf.toString('base64url');
  }

  private base64UrlDecode(input: string): string {
    return Buffer.from(input, 'base64url').toString('utf8');
  }
}
