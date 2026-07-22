// ─── Memory service interfaces ──────────────────────────────────────────────────

import type { MemoryEntry } from '../models/MemoryEntry';
import type { MemoryQuery, MemoryRetrievalResult } from '../models/MemoryQuery';
import type { MemoryType, MemorySensitivity } from '../models/MemoryTypes';
import type { IMemoryRepository } from './IMemoryRepository';

export interface MemoryEngineDeps {
  idGenerator: () => string;
  clock:       () => string;
  repository:  IMemoryRepository;
}

/** Input for writing a memory entry. */
export interface MemoryWriteRequest {
  organizationId:  string;
  executionId?:    string;
  type:            MemoryType;
  content:         string;
  source:          string;
  confidence:      number;
  relevance:       number;
  sensitivity:     MemorySensitivity;
  consentGranted:  boolean;
  tags?:           string[];
  metadata?:       Record<string, unknown>;
  /** Type-specific extensions. */
  workingPosition?: number;
  sessionId?:        string;
  userId?:           string;
  sequenceNumber?:   number;
  department?:       string;
  verified?:         boolean;
  subject?:          string;
  relation?:         string;
  object?:           string;
  tripleConfidence?: number;
  executionStatus?:  string;
  completedStages?:  string[];
  finalConfidence?:  number;
  requiredHumanReview?: boolean;
}

export interface IMemoryEngine {
  readonly id: string;
  write(request: MemoryWriteRequest): MemoryEntry;
  retrieve(query: MemoryQuery): MemoryRetrievalResult;
  delete(memoryId: string): boolean;
  getRepository(): IMemoryRepository;
  /** Run lifecycle maintenance: expire and consolidate. */
  runLifecycle(): { expired: number; consolidated: number };
  /** Get all memory events emitted. */
  getEvents(): import('../models/MemoryEvent').MemoryEvent[];
}

export interface IMemoryExtractor {
  extract(input: { prompt: string; organizationId: string; executionId?: string }): MemoryWriteRequest[];
}

export interface IMemoryValidator {
  validate(entry: MemoryEntry): { valid: boolean; errors: string[] };
}

export interface IMemoryRetriever {
  retrieve(query: MemoryQuery): MemoryRetrievalResult;
}

export interface IMemoryRanker {
  rank(entries: MemoryEntry[], query?: MemoryQuery): MemoryEntry[];
}

export interface IMemoryConsolidator {
  consolidate(entries: MemoryEntry[]): { consolidated: MemoryEntry[]; removed: string[] };
}

export interface IMemoryLifecycleManager {
  expire(now?: string): number;
  consolidate(): number;
  getStats(): { total: number; expired: number; byType: Record<string, number> };
}
