import type { IContextAnalyzer } from './interfaces/IContextAnalyzer';
import type { IContextEnricher, EnterpriseMemorySnapshot } from './interfaces/IContextEnricher';
import type { IContextValidator } from './interfaces/IContextValidator';
import type { ContextRequest } from './models/ContextRequest';
import type { ContextResult } from './models/ContextResult';

import { ContextAnalyzer } from './context/ContextAnalyzer';
import { ContextEnricher } from './context/ContextEnricher';
import { ContextValidator } from './context/ContextValidator';

// ─── Context Intelligence Service ──────────────────────────────────────────────
// Façade that orchestrates the Context Intelligence Layer:
// analyze → enrich → validate → build result.
// Constructor-injected components allow swapping implementations for tests.

export interface ContextIntelligenceDeps {
  analyzer?:  IContextAnalyzer;
  enricher?:  IContextEnricher;
  validator?: IContextValidator;
}

export class ContextIntelligenceService {
  private readonly analyzer:  IContextAnalyzer;
  private readonly enricher:  IContextEnricher;
  private readonly validator: IContextValidator;

  constructor(deps: ContextIntelligenceDeps = {}) {
    this.analyzer  = deps.analyzer  ?? new ContextAnalyzer();
    this.enricher  = deps.enricher  ?? new ContextEnricher();
    this.validator = deps.validator ?? new ContextValidator();
  }

  /**
   * Run the full Context Intelligence Layer for a request.
   * @param request  the raw business petition
   * @param memory   enterprise memory snapshot for the organization
   */
  async analyze(request: ContextRequest, memory: EnterpriseMemorySnapshot): Promise<ContextResult> {
    // Step 1 — analyze the raw petition into structured business context.
    const context = this.analyzer.analyze(request);

    // Step 2 — enrich with enterprise memory and source recommendations.
    const enrichment = this.enricher.enrich(context, request, memory);

    // Step 3 — validate sufficiency and assemble the final result artifact.
    return this.validator.buildResult(context, enrichment, request);
  }

  /** Expose the underlying analyzer for advanced callers (e.g. streaming). */
  getAnalyzer(): IContextAnalyzer { return this.analyzer; }

  /** Expose the underlying enricher for advanced callers. */
  getEnricher(): IContextEnricher { return this.enricher; }

  /** Expose the underlying validator for advanced callers. */
  getValidator(): IContextValidator { return this.validator; }
}
