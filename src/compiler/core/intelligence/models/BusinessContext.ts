// ─── Business context ──────────────────────────────────────────────────────────
// Structured projection of the user's request, produced by the ContextAnalyzer.

import type { DataClassification } from './ContextSource';

export type BusinessIntent =
  | 'automation'
  | 'data-pipeline'
  | 'notification'
  | 'integration'
  | 'analysis'
  | 'generation'
  | 'monitoring'
  | 'scheduling';

export type Urgency = 'low' | 'normal' | 'high' | 'critical';

export interface BusinessEntity {
  /** Entity type, e.g. `customer`, `order`, `invoice`. */
  type:   string;
  /** Raw mention found in the prompt, when available. */
  name?:  string;
  classification: DataClassification;
}

export interface BusinessConstraint {
  /** Constraint type, e.g. `budget`, `deadline`, `compliance`. */
  type:   string;
  /** Human-readable description of the constraint. */
  value:  string;
  classification: DataClassification;
}

export interface BusinessObjective {
  /** Short label, e.g. `Reduce manual work`. */
  label:  string;
  /** Long-form description. */
  detail: string;
}

export interface RelevantMemory {
  /** Memory entry key, e.g. `org.sla.responseHours`. */
  key:    string;
  /** Summarized value safe to surface to reasoning. */
  value:  string;
  classification: DataClassification;
}

export interface BusinessContext {
  prompt:           string;
  locale:           string;
  detectedIntent:   BusinessIntent;
  secondaryIntents: BusinessIntent[];
  objectives:       BusinessObjective[];
  entities:         BusinessEntity[];
  constraints:      BusinessConstraint[];
  urgency:          Urgency;
  /** Highest classification detected across entities and constraints. */
  maxClassification: DataClassification;
}
