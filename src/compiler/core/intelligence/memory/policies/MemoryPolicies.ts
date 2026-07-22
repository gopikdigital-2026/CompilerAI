// ─── Memory policies ────────────────────────────────────────────────────────────
// Business rules governing memory storage, TTL, sensitivity, and consent.

import type { MemoryEntry } from '../models/MemoryEntry';
import type { MemoryType, MemorySensitivity } from '../models/MemoryTypes';
import { isSensitive } from '../models/MemoryTypes';
import { SensitiveDataBlockedError, MemoryValidationError } from '../errors/MemoryErrors';

/** Default TTL (in milliseconds) per memory type. null = no expiration. */
export const DEFAULT_TTL_MS: Record<MemoryType, number | null> = {
  WORKING:       5 * 60 * 1000,        // 5 minutes
  SESSION:       30 * 60 * 1000,        // 30 minutes
  ORGANIZATION:  null,                  // no expiration
  SEMANTIC:      null,                  // no expiration
  EXECUTION:     24 * 60 * 60 * 1000,  // 24 hours
};

/** Policy: sensitive data requires explicit consent. */
export function enforceConsent(entry: Pick<MemoryEntry, 'sensitivity' | 'consentGranted'>): void {
  if (isSensitive(entry.sensitivity) && !entry.consentGranted) {
    throw new SensitiveDataBlockedError();
  }
}

/** Policy: validate a memory entry before storage. */
export function validateEntry(entry: Pick<MemoryEntry, 'memoryId' | 'organizationId' | 'type' | 'content' | 'confidence' | 'relevance'>): void {
  if (!entry.memoryId || entry.memoryId.length === 0) throw new MemoryValidationError('memoryId is required.');
  if (!entry.organizationId || entry.organizationId.length === 0) throw new MemoryValidationError('organizationId is required.');
  if (!entry.content || entry.content.length === 0) throw new MemoryValidationError('content is required.');
  if (entry.confidence < 0 || entry.confidence > 100) throw new MemoryValidationError('confidence must be 0–100.');
  if (entry.relevance < 0 || entry.relevance > 100) throw new MemoryValidationError('relevance must be 0–100.');
}

/** Policy: compute expiresAt from TTL. */
export function computeExpiry(type: MemoryType, createdAt: string, _clock: () => string): string | null {
  const ttl = DEFAULT_TTL_MS[type];
  if (ttl === null) return null;
  const created = new Date(createdAt).getTime();
  return new Date(created + ttl).toISOString();
}

/** Policy: check if an entry has expired. */
export function isExpired(entry: Pick<MemoryEntry, 'expiresAt'>, now: string): boolean {
  if (!entry.expiresAt) return false;
  return new Date(entry.expiresAt).getTime() <= new Date(now).getTime();
}

/** Policy: compute a deterministic content hash for deduplication. */
export function computeContentHash(organizationId: string, type: MemoryType, content: string): string {
  const raw = `${organizationId}|${type}|${content}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const chr = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return `h${Math.abs(hash).toString(16)}`;
}

/** Policy: check if two entries are duplicates (same org + type + content hash). */
export function isDuplicate(a: Pick<MemoryEntry, 'organizationId' | 'type' | 'contentHash'>, b: Pick<MemoryEntry, 'organizationId' | 'type' | 'contentHash'>): boolean {
  return a.organizationId === b.organizationId && a.type === b.type && a.contentHash === b.contentHash;
}

/** Policy: sensitivity filter — entries above the max sensitivity are excluded. */
export function filterByMaxSensitivity<T extends Pick<MemoryEntry, 'sensitivity'>>(
  entries: T[], maxSensitivity: MemorySensitivity,
): T[] {
  const order: MemorySensitivity[] = ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'];
  const maxIdx = order.indexOf(maxSensitivity);
  return entries.filter(e => order.indexOf(e.sensitivity) <= maxIdx);
}
