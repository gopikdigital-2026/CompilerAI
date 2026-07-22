// ─── Memory Intelligence Engine — public API ────────────────────────────────────

// ── Services ──────────────────────────────────────────────────────────────────
export { MemoryEngine } from './services/MemoryEngine';
export { InMemoryMemoryRepository } from './services/InMemoryMemoryRepository';
export { MemoryExtractor } from './services/MemoryExtractor';
export { MemoryValidator } from './services/MemoryValidator';
export { MemoryRetriever } from './services/MemoryRetriever';
export { MemoryRanker } from './services/MemoryRanker';
export { MemoryConsolidator } from './services/MemoryConsolidator';
export { MemoryLifecycleManager } from './services/MemoryLifecycleManager';

// ── Interfaces ──────────────────────────────────────────────────────────────────
export type {
  IMemoryEngine, MemoryEngineDeps, MemoryWriteRequest,
  IMemoryExtractor, IMemoryValidator, IMemoryRetriever,
  IMemoryRanker, IMemoryConsolidator, IMemoryLifecycleManager,
} from './interfaces/IMemoryEngine';
export type { IMemoryRepository } from './interfaces/IMemoryRepository';

// ── Models ─────────────────────────────────────────────────────────────────────
export type { MemoryEntry, } from './models/MemoryEntry';
export { MEMORY_VERSION } from './models/MemoryEntry';
export type { WorkingMemory } from './models/WorkingMemory';
export type { SessionMemory } from './models/SessionMemory';
export type { OrganizationMemory } from './models/OrganizationMemory';
export type { SemanticMemory } from './models/SemanticMemory';
export type { ExecutionMemory } from './models/ExecutionMemory';
export type { MemoryQuery, MemoryRetrievalResult } from './models/MemoryQuery';
export type { MemoryEvent, MemoryEventType } from './models/MemoryEvent';
export type { MemoryType, MemorySensitivity } from './models/MemoryTypes';
export { MEMORY_TYPES, MEMORY_SENSITIVITIES, SENSITIVE_LEVELS, isSensitive } from './models/MemoryTypes';

// ── Policies ───────────────────────────────────────────────────────────────────
export {
  DEFAULT_TTL_MS, enforceConsent, validateEntry, computeExpiry,
  isExpired, computeContentHash, isDuplicate, filterByMaxSensitivity,
} from './policies/MemoryPolicies';

// ── Errors ─────────────────────────────────────────────────────────────────────
export {
  MemoryError, SensitiveDataBlockedError, MemoryValidationError,
  MemoryNotFoundError, DuplicateMemoryError, TenantIsolationError,
} from './errors/MemoryErrors';
