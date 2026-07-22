// ─── Session domain models ──────────────────────────────────────────────────────

export type SessionStatus = 'ACTIVE' | 'EXPIRED' | 'INVALIDATED';

export interface Session {
  sessionId:       string;
  userId:          string;
  organizationId:  string | null;
  tokenHash:       string;
  ipAddress:       string | null;
  userAgent:       string | null;
  expiresAt:       string;
  createdAt:       string;
  invalidatedAt:   string | null;
}

export function isSessionActive(session: Session, now: string): boolean {
  if (session.invalidatedAt !== null) return false;
  return new Date(session.expiresAt).getTime() > new Date(now).getTime();
}

export function getSessionStatus(session: Session, now: string): SessionStatus {
  if (session.invalidatedAt !== null) return 'INVALIDATED';
  if (!isSessionActive(session, now)) return 'EXPIRED';
  return 'ACTIVE';
}
