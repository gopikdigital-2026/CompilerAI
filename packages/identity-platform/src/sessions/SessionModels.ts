import type { OrganizationScopedEntity } from '../types/shared';

export type SessionStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED';

export interface Session extends OrganizationScopedEntity {
  userId: string;
  tokenHash: string;
  status: SessionStatus;
  authMethod: string;
  ipAddress: string | null;
  userAgent: string | null;
  expiresAt: string;
  lastActivityAt: string;
  revokedAt: string | null;
  revokedReason: string | null;
}

export const SESSION_PREFIX = 'sess_';
export const DEFAULT_SESSION_DURATION_MS = 3_600_000;
export const MAX_SESSION_DURATION_MS = 86_400_000;

export function isSessionActive(session: Session, now: string): boolean {
  return session.status === 'ACTIVE' && session.expiresAt > now;
}

export function isSessionExpiringSoon(session: Session, now: string, thresholdMs: number = 5 * 60 * 1000): boolean {
  if (!isSessionActive(session, now)) return false;
  const expiresAtMs = Date.parse(session.expiresAt);
  const nowMs = Date.parse(now);
  return expiresAtMs - nowMs < thresholdMs;
}
