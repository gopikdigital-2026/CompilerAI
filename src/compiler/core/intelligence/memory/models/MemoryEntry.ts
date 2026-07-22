// ─── Memory entry ───────────────────────────────────────────────────────────────
// Base memory record stored by the Memory Intelligence Engine.

import type { MemoryType, MemorySensitivity } from './MemoryTypes';

export interface MemoryEntry {
  memoryId:        string;
  organizationId:  string;
  executionId:     string | null;
  type:            MemoryType;
  content:         string;
  source:          string;
  confidence:      number;   // 0–100
  relevance:       number;   // 0–100
  sensitivity:     MemorySensitivity;
  /** Explicit consent granted for storing this entry. */
  consentGranted:  boolean;
  createdAt:       string;   // ISO
  expiresAt:       string | null;  // ISO
  version:         string;
  /** Content hash for deduplication. */
  contentHash:     string;
  tags:            string[];
  metadata:        Record<string, unknown>;
}

export const MEMORY_VERSION = '1.0.0';
