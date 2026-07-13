import type { BusinessContext } from '../models/BusinessContext';
import type { ContextEnrichment } from './IContextEnricher';
import type { ContextRequest } from '../models/ContextRequest';
import type { ContextResult, ContextStatus } from '../models/ContextResult';
import type { MissingInformation } from '../models/MissingInformation';

// ─── Context Validator interface ───────────────────────────────────────────────
// Scores the sufficiency of the gathered context and decides whether the
// reasoning pipeline may proceed.

export interface SufficiencyBreakdown {
  intent:        number;
  objectives:    number;
  entities:      number;
  constraints:   number;
  enterpriseData: number;
  organization:  number;
  total:         number;
}

export interface ValidationOutcome {
  status:              ContextStatus;
  sufficiencyScore:    number;
  missingInformation:  MissingInformation[];
  breakdown:           SufficiencyBreakdown;
}

export interface IContextValidator {
  /** Unique validator implementation identifier. */
  readonly id: string;

  /**
   * Evaluate the gathered context and return a readiness verdict.
   */
  validate(
    context:   BusinessContext,
    enrichment: ContextEnrichment,
    request:   ContextRequest,
  ): ValidationOutcome;

  /**
   * Assemble the final ContextResult artifact.
   */
  buildResult(
    context:    BusinessContext,
    enrichment: ContextEnrichment,
    request:    ContextRequest,
  ): ContextResult;
}
