// ─── MemoryValidator ────────────────────────────────────────────────────────────
// Validates memory entries before storage.

import type { IMemoryValidator } from '../interfaces/IMemoryEngine';
import type { MemoryEntry } from '../models/MemoryEntry';
import { validateEntry } from '../policies/MemoryPolicies';
import { MemoryValidationError } from '../errors/MemoryErrors';

export class MemoryValidator implements IMemoryValidator {
  validate(entry: MemoryEntry): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    try { validateEntry(entry); } catch (err) {
      if (err instanceof MemoryValidationError) errors.push(err.message);
      else errors.push('Unknown validation error.');
    }

    if (!entry.source || entry.source.length === 0) errors.push('source is required.');
    if (!entry.createdAt || entry.createdAt.length === 0) errors.push('createdAt is required.');
    if (!entry.contentHash || entry.contentHash.length === 0) errors.push('contentHash is required.');
    if (entry.expiresAt && new Date(entry.expiresAt).getTime() < new Date(entry.createdAt).getTime()) {
      errors.push('expiresAt cannot be before createdAt.');
    }

    return { valid: errors.length === 0, errors };
  }
}
