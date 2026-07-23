import type { Session } from './SessionModels';
import { SESSION_PREFIX, DEFAULT_SESSION_DURATION_MS, isSessionActive } from './SessionModels';
import type { ISessionRepository } from '../repositories/RepositoryInterfaces';
import type { ITokenGenerator } from '../adapters/SecurityAdapters';
import { SessionNotFoundError, SessionExpiredError } from '../adapters/IdentityErrors';

export interface CreateSessionRequest {
  userId: string;
  organizationId: string;
  authMethod: string;
  ipAddress?: string;
  userAgent?: string;
  durationMs?: number;
}

export interface SessionCredential {
  session: Session;
  rawToken: string;
}

export class SessionService {
  constructor(
    private readonly repo: ISessionRepository,
    private readonly tokenGen: ITokenGenerator,
    private readonly idGen: () => string,
    private readonly clock: () => string,
  ) {}

  async create(request: CreateSessionRequest): Promise<SessionCredential> {
    const { token, hash } = this.tokenGen.generate(SESSION_PREFIX);
    const now = this.clock();
    const expiresAt = new Date(Date.parse(now) + (request.durationMs ?? DEFAULT_SESSION_DURATION_MS)).toISOString();
    const session: Session = {
      id: this.idGen(),
      version: 1,
      createdAt: now,
      updatedAt: now,
      metadata: {},
      organizationId: request.organizationId,
      userId: request.userId,
      tokenHash: hash,
      status: 'ACTIVE',
      authMethod: request.authMethod,
      ipAddress: request.ipAddress ?? null,
      userAgent: request.userAgent ?? null,
      expiresAt,
      lastActivityAt: now,
      revokedAt: null,
      revokedReason: null,
    };
    const saved = await this.repo.create(session);
    return { session: saved, rawToken: token };
  }

  async findById(id: string): Promise<Session> {
    const session = await this.repo.findById(id);
    if (!session) throw new SessionNotFoundError(`Session not found: ${id}`);
    return session;
  }

  async findByToken(rawToken: string): Promise<Session> {
    const hash = this.tokenGen.hash(rawToken);
    const session = await this.repo.findByTokenHash(hash);
    if (!session) throw new SessionNotFoundError('Invalid session token');
    const now = this.clock();
    if (!isSessionActive(session, now)) {
      throw new SessionExpiredError('Session has expired or been revoked');
    }
    return session;
  }

  async findByUser(userId: string, organizationId: string): Promise<Session[]> {
    return this.repo.findByUser(userId, organizationId);
  }

  async findByOrganization(organizationId: string): Promise<Session[]> {
    return this.repo.findByOrganization(organizationId);
  }

  async touchActivity(sessionId: string): Promise<Session> {
    const session = await this.findById(sessionId);
    const now = this.clock();
    const updated: Session = {
      ...session,
      lastActivityAt: now,
      version: session.version + 1,
      updatedAt: now,
    };
    return this.repo.update(updated);
  }

  async revoke(sessionId: string, reason: string): Promise<Session> {
    const session = await this.findById(sessionId);
    const now = this.clock();
    const updated: Session = {
      ...session,
      status: 'REVOKED',
      revokedAt: now,
      revokedReason: reason,
      version: session.version + 1,
      updatedAt: now,
    };
    return this.repo.update(updated);
  }

  async revokeAllForUser(userId: string, organizationId: string, reason: string): Promise<number> {
    const sessions = await this.repo.findByUser(userId, organizationId);
    let count = 0;
    for (const session of sessions) {
      if (session.status === 'ACTIVE') {
        await this.revoke(session.id, reason);
        count++;
      }
    }
    return count;
  }

  async cleanupExpired(): Promise<number> {
    return this.repo.deleteExpiredBefore(this.clock());
  }
}
