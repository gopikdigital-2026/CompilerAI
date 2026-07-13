import type { ContextRequest } from '../models/ContextRequest';
import type { BusinessContext } from '../models/BusinessContext';

// ─── Context Analyzer interface ────────────────────────────────────────────────
// Transforms a raw business petition into a structured, typed projection.
// Implementations must be deterministic and free of any LLM provider coupling.

export interface IContextAnalyzer {
  /** Unique analyzer implementation identifier. */
  readonly id: string;

  /**
   * Analyze the request and return structured business context.
   * @throws when the request is empty or the organization is missing.
   */
  analyze(request: ContextRequest): BusinessContext;
}
