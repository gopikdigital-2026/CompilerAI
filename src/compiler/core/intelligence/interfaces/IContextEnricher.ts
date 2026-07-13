import type { ContextRequest } from '../models/ContextRequest';
import type { BusinessContext } from '../models/BusinessContext';
import type { ContextSource } from '../models/ContextSource';
import type { RelevantMemory } from '../models/BusinessContext';

// ─── Context Enricher interface ────────────────────────────────────────────────
// Combines the analyzed business context with enterprise memory and identifies
// potential context sources. No real external services are contacted.

export interface EnterpriseMemorySnapshot {
  /** Organization id the memory belongs to. */
  organizationId: string;
  /** Whether the organization has any recorded memory at all. */
  exists:         boolean;
  /** Memory entries safe to surface to reasoning. */
  entries:        RelevantMemory[];
}

export interface ContextEnrichment {
  relevantMemory:     RelevantMemory[];
  recommendedSources: ContextSource[];
  /** True when the organization has at least one configured source. */
  hasEnterpriseData:  boolean;
}

export interface IContextEnricher {
  /** Unique enricher implementation identifier. */
  readonly id: string;

  /**
   * Enrich the business context with memory and source recommendations.
   * @param context  output of a ContextAnalyzer
   * @param request  original request (carries org id + metadata)
   * @param memory   enterprise memory snapshot for the organization
   */
  enrich(
    context: BusinessContext,
    request: ContextRequest,
    memory:  EnterpriseMemorySnapshot,
  ): ContextEnrichment;
}
