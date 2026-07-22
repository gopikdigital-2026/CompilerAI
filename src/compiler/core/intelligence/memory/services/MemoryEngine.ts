// ─── MemoryEngine ───────────────────────────────────────────────────────────────
// Main entry point for the Memory Intelligence Engine.
// Coordinates extraction, validation, storage, retrieval, ranking,
// consolidation, and lifecycle management.

import type { MemoryEntry } from '../models/MemoryEntry';
import type { MemoryQuery, MemoryRetrievalResult } from '../models/MemoryQuery';
import type { MemoryEvent } from '../models/MemoryEvent';
import type { MemoryEngineDeps, MemoryWriteRequest, IMemoryEngine } from '../interfaces/IMemoryEngine';
import type { IMemoryRepository } from '../interfaces/IMemoryRepository';
import type { MemoryType } from '../models/MemoryTypes';
import { MEMORY_VERSION } from '../models/MemoryEntry';
import { MemoryExtractor } from './MemoryExtractor';
import { MemoryValidator } from './MemoryValidator';
import { MemoryRetriever } from './MemoryRetriever';
import { MemoryRanker } from './MemoryRanker';
import { MemoryConsolidator } from './MemoryConsolidator';
import { MemoryLifecycleManager } from './MemoryLifecycleManager';
import {
  enforceConsent, validateEntry, computeExpiry, computeContentHash,
} from '../policies/MemoryPolicies';
import {
  MemoryValidationError, DuplicateMemoryError,
} from '../errors/MemoryErrors';

export class MemoryEngine implements IMemoryEngine {
  readonly id = 'memory-engine-v1';

  private readonly repository: IMemoryRepository;
  private readonly extractor: MemoryExtractor;
  private readonly validator: MemoryValidator;
  private readonly retriever: MemoryRetriever;
  private readonly ranker: MemoryRanker;
  private readonly consolidator: MemoryConsolidator;
  private readonly lifecycle: MemoryLifecycleManager;
  private readonly events: MemoryEvent[] = [];

  constructor(private readonly deps: MemoryEngineDeps) {
    this.repository = deps.repository;
    this.extractor = new MemoryExtractor();
    this.validator = new MemoryValidator();
    this.retriever = new MemoryRetriever(this.repository);
    this.ranker = new MemoryRanker();
    this.consolidator = new MemoryConsolidator();
    this.lifecycle = new MemoryLifecycleManager(this.repository, this.consolidator, deps.clock);
  }

  write(request: MemoryWriteRequest): MemoryEntry {
    enforceConsent(request);

    const contentHash = computeContentHash(request.organizationId, request.type, request.content);
    const existing = this.repository.findByOrganization(request.organizationId);
    for (const e of existing) {
      if (e.type === request.type && e.contentHash === contentHash) {
        this.emitEvent('MemoryBlocked', request.type, null, `Duplicate blocked: ${request.type} for ${request.organizationId}.`);
        throw new DuplicateMemoryError(`Duplicate memory entry for type ${request.type} in organization ${request.organizationId}.`);
      }
    }

    const now = this.deps.clock();
    const memoryId = this.deps.idGenerator();
    const entry: MemoryEntry = {
      memoryId,
      organizationId: request.organizationId,
      executionId: request.executionId ?? null,
      type: request.type,
      content: request.content,
      source: request.source,
      confidence: request.confidence,
      relevance: request.relevance,
      sensitivity: request.sensitivity,
      consentGranted: request.consentGranted,
      createdAt: now,
      expiresAt: computeExpiry(request.type, now, this.deps.clock),
      version: MEMORY_VERSION,
      contentHash,
      tags: request.tags ?? [],
      metadata: request.metadata ?? {},
    };

    validateEntry(entry);
    const validation = this.validator.validate(entry);
    if (!validation.valid) {
      this.emitEvent('MemoryBlocked', request.type, null, `Validation failed: ${validation.errors.join('; ')}`);
      throw new MemoryValidationError(`Memory validation failed: ${validation.errors.join('; ')}`);
    }

    this.repository.save(entry);
    this.emitEvent('MemoryWritten', request.type, memoryId, `Memory written: ${request.type} for ${request.organizationId}.`);
    return entry;
  }

  retrieve(query: MemoryQuery): MemoryRetrievalResult {
    const result = this.retriever.retrieve(query);
    const ranked = this.ranker.rank(result.entries, query);
    this.emitEvent('MemoryRetrieved', null, null, `Retrieved ${ranked.length} entries for ${query.organizationId}.`);
    return { entries: ranked, totalCount: ranked.length, retrievalMs: result.retrievalMs };
  }

  delete(memoryId: string): boolean {
    const deleted = this.repository.delete(memoryId);
    if (deleted) this.emitEvent('MemoryDeleted', null, memoryId, `Memory deleted: ${memoryId}.`);
    return deleted;
  }

  getRepository(): IMemoryRepository {
    return this.repository;
  }

  runLifecycle(): { expired: number; consolidated: number } {
    const expired = this.lifecycle.expire();
    const consolidated = this.lifecycle.consolidate();
    if (expired > 0) this.emitEvent('MemoryExpired', null, null, `Expired ${expired} entries.`);
    if (consolidated > 0) this.emitEvent('MemoryConsolidated', null, null, `Consolidated ${consolidated} duplicates.`);
    return { expired, consolidated };
  }

  getEvents(): MemoryEvent[] {
    return [...this.events];
  }

  getExtractor(): MemoryExtractor { return this.extractor; }
  getValidator(): MemoryValidator { return this.validator; }
  getRanker(): MemoryRanker { return this.ranker; }
  getConsolidator(): MemoryConsolidator { return this.consolidator; }
  getLifecycleManager(): MemoryLifecycleManager { return this.lifecycle; }

  private emitEvent(
    eventType: MemoryEvent['eventType'],
    memoryType: MemoryType | null,
    memoryId: string | null,
    summary: string,
  ): void {
    this.events.push({
      eventId: this.deps.idGenerator(),
      eventType,
      executionId: '',
      requestId: '',
      organizationId: '',
      timestamp: this.deps.clock(),
      summary,
      metadata: {},
      memoryType,
      memoryId,
    });
  }
}
