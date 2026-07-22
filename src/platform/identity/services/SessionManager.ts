// ─── Session manager ────────────────────────────────────────────────────────────

import type { ISessionRepository } from '../repositories/RepositoryInterfaces';
import type { Session } from '../sessions/SessionModels';
import { isSessionActive } from '../sessions/SessionModels';
import { sha256Hex } from '../auth/PasswordHasher';
import { SessionExpiredError } from '../errors/IdentityErrors';

const DEFAULT_SESSION_DURATION = 24 * 60 * 60; // 24 hours

export class SessionManager {
  constructor(
    private sessionRepo: ISessionRepository,
    private idGen: () => string,
    private clock: () => string,
  ) {}

  async createSession(userId: string, orgId: string | null, ip: string | null, userAgent: string | null, durationSeconds?: number): Promise<{ session: Session; token: string }> {
    const token = `sess_${this.idGen()}_${Date.now().toString(36)}`;
    const tokenHash = await sha256Hex(token);
    const expiresAt = new Date(Date.now() + (durationSeconds ?? DEFAULT_SESSION_DURATION) * 1000).toISOString();
    const session = await this.sessionRepo.create(userId, orgId, tokenHash, ip, userAgent, expiresAt);
    return { session, token };
  }

  async validateSession(token: string): Promise<Session | null> {
    const tokenHash = await sha256Hex(token);
    const session = await this.sessionRepo.findByTokenHash(tokenHash);
    if (!session) return null;
    if (!isSessionActive(session, this.clock())) return null;
    return session;
  }

  async invalidateSession(sessionId: string): Promise<void> {
    await this.sessionRepo.invalidate(sessionId);
  }

  async invalidateAllForUser(userId: string): Promise<void> {
    await this.sessionRepo.invalidateAllForUser(userId);
  }

  async listUserSessions(userId: string): Promise<Session[]> {
    return this.sessionRepo.listByUser(userId);
  }

  async renewSession(sessionId: string, durationSeconds?: number): Promise<Session | null> {
    const session = await this.sessionRepo.findById(sessionId);
    if (!session) return null;
    if (!isSessionActive(session, this.clock())) throw new SessionExpiredError();
    const newExpiresAt = new Date(Date.now() + (durationSeconds ?? DEFAULT_SESSION_DURATION) * 1000).toISOString();
    await this.sessionRepo.invalidate(sessionId);
    const newSession = await this.sessionRepo.create(session.userId, session.organizationId, session.tokenHash, session.ipAddress, session.userAgent, newExpiresAt);
    return newSession;
  }
}
