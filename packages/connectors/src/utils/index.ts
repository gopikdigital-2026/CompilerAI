import type { ConnectorId, UUID, ISOString } from '../types/index';

export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function generateCorrelationId(): string {
  return `corr_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function generateState(): string {
  return `state_${Math.random().toString(36).slice(2, 18)}`;
}

export function makeContext(
  organizationId: UUID,
  userId: UUID,
  options?: { timeout?: number; metadata?: Record<string, unknown> },
): import('../types/index').ConnectorContext {
  return {
    organizationId,
    userId,
    requestId: generateRequestId(),
    correlationId: generateCorrelationId(),
    timeout: options?.timeout ?? 30000,
    metadata: options?.metadata ?? {},
  };
}

export function isExpired(expiresAt: ISOString | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < Date.now();
}

export function sanitizeId(id: string): ConnectorId {
  return id.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
}

export function maskSecret(secret: string): string {
  if (secret.length <= 4) return '****';
  return `${secret.slice(0, 2)}${'*'.repeat(Math.min(secret.length - 4, 20))}${secret.slice(-2)}`;
}

export function safeParseJson(text: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(text);
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}
