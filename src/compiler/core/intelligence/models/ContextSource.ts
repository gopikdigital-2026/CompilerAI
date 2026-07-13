// ─── Context source catalog ────────────────────────────────────────────────────
// Describes the enterprise systems the ContextEnricher may pull context from.
// No real I/O is performed — these descriptors are recommendations only.

export type SourceKind =
  | 'crm'
  | 'erp'
  | 'email'
  | 'documents'
  | 'metrics'
  | 'workflows';

export type DataClassification = 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';

export interface ContextSource {
  /** Stable identifier, e.g. `crm.hubspot`. */
  id:           string;
  /** Human-readable label, e.g. `HubSpot CRM`. */
  label:        string;
  kind:         SourceKind;
  /** Whether credentials / connectors are configured for this source. */
  available:    boolean;
  /** Confidence the source is relevant to the request, 0–100. */
  relevance:    number;
  /** Classification of the data typically held by this source. */
  classification: DataClassification;
  /** Reason this source was recommended. */
  rationale:    string;
}
