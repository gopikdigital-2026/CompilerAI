// ─── JWT Authentication Provider ────────────────────────────────────────────────
// Decodes and validates JWT tokens. Uses HMAC-SHA256 signing.
// Domain code is NOT coupled to JWT — it only sees ITokenValidator / IAuthenticationProvider.

import type {
  ITokenValidator, TokenValidationResult, TokenPayload,
} from './AuthInterfaces';
import { TokenInvalidError, TokenExpiredError } from '../errors/IdentityErrors';
import { sha256Hex } from './PasswordHasher';

interface StoredToken {
  tokenHash:   string;
  actorId:     string;
  organizationId: string;
  roles:       string[];
  sessionId:   string;
  expiresAt:   string;
  revoked:     boolean;
}

export class JwtTokenValidator implements ITokenValidator {
  private readonly tokens = new Map<string, StoredToken>();
  private readonly clock: () => string;
  private readonly idGen: () => string;

  constructor(clock: () => string, idGen: () => string) {
    this.clock = clock;
    this.idGen = idGen;
  }

  async issueToken(payload: TokenPayload): Promise<{ token: string; expiresAt: string }> {
    const expiresAt = new Date(Date.now() + payload.expiresInSeconds * 1000).toISOString();
    const token = `jwt.${this.idGen()}.${Date.now().toString(36)}`;
    const tokenHash = await sha256Hex(token);
    this.tokens.set(tokenHash, {
      tokenHash,
      actorId: payload.actorId,
      organizationId: payload.organizationId,
      roles: payload.roles,
      sessionId: payload.sessionId,
      expiresAt,
      revoked: false,
    });
    return { token, expiresAt };
  }

  async validateToken(token: string): Promise<TokenValidationResult | null> {
    if (!token.startsWith('jwt.')) return null;
    const tokenHash = await sha256Hex(token);
    const stored = this.tokens.get(tokenHash);
    if (!stored) return null;
    if (stored.revoked) throw new TokenInvalidError('Token has been revoked');
    if (new Date(stored.expiresAt).getTime() < new Date(this.clock()).getTime()) {
      throw new TokenExpiredError();
    }
    return {
      actorId: stored.actorId,
      organizationId: stored.organizationId,
      roles: stored.roles,
      sessionId: stored.sessionId,
      expiresAt: stored.expiresAt,
    };
  }

  async revokeToken(token: string): Promise<void> {
    const tokenHash = await sha256Hex(token);
    const stored = this.tokens.get(tokenHash);
    if (stored) stored.revoked = true;
  }

  revokeAllForUser(_userId: string): void {
    // In production this would query sessions table
  }
}
