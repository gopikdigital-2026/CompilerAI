import type { IContextEnricher, ContextEnrichment, EnterpriseMemorySnapshot } from '../interfaces/IContextEnricher';
import type { ContextRequest } from '../models/ContextRequest';
import type { BusinessContext, RelevantMemory } from '../models/BusinessContext';
import type { ContextSource, SourceKind, DataClassification } from '../models/ContextSource';

// ─── Context Enricher ──────────────────────────────────────────────────────────
// Merges the analyzed business context with enterprise memory and recommends
// potential context sources (CRM, ERP, email, documents, metrics, workflows).
// No real external services are contacted — recommendations are heuristic.

interface SourceTemplate {
  id:           string;
  label:        string;
  kind:         SourceKind;
  classification: DataClassification;
  /** Triggers that make this source relevant to the request. */
  when: (context: BusinessContext, memory: EnterpriseMemorySnapshot) => boolean;
  rationale: (context: BusinessContext) => string;
  baseRelevance: number;
}

const SOURCE_TEMPLATES: SourceTemplate[] = [
  {
    id: 'crm.hubspot', label: 'HubSpot CRM', kind: 'crm', classification: 'CONFIDENTIAL', baseRelevance: 80,
    when: (c) => c.entities.some(e => ['customer', 'lead', 'ticket'].includes(e.type))
              || c.detectedIntent === 'integration',
    rationale: (c) => `Customer/lead context required for ${c.detectedIntent} intent`,
  },
  {
    id: 'crm.salesforce', label: 'Salesforce CRM', kind: 'crm', classification: 'CONFIDENTIAL', baseRelevance: 75,
    when: (c) => c.entities.some(e => e.type === 'customer') && c.maxClassification !== 'PUBLIC',
    rationale: () => 'Customer records needed to resolve entity references',
  },
  {
    id: 'erp.sap', label: 'SAP ERP', kind: 'erp', classification: 'RESTRICTED', baseRelevance: 70,
    when: (c) => c.entities.some(e => ['order', 'invoice', 'finance', 'product'].includes(e.type))
              || c.constraints.some(con => con.type === 'volume'),
    rationale: (c) => `Order/invoice data lives in ERP for ${c.detectedIntent} intent`,
  },
  {
    id: 'email.gmail', label: 'Gmail', kind: 'email', classification: 'CONFIDENTIAL', baseRelevance: 60,
    when: (c) => c.entities.some(e => e.type === 'email')
              || c.detectedIntent === 'notification'
              || c.detectedIntent === 'automation',
    rationale: () => 'Email history provides trigger context and notification targets',
  },
  {
    id: 'docs.notion', label: 'Notion Documents', kind: 'documents', classification: 'INTERNAL', baseRelevance: 55,
    when: (c) => c.detectedIntent === 'generation' || c.entities.some(e => e.type === 'document'),
    rationale: () => 'Document templates and prior outputs needed for generation',
  },
  {
    id: 'metrics.datadog', label: 'Datadog Metrics', kind: 'metrics', classification: 'INTERNAL', baseRelevance: 65,
    when: (c) => c.detectedIntent === 'monitoring' || c.detectedIntent === 'analysis'
              || c.constraints.some(con => con.type === 'sla'),
    rationale: (c) => `Operational metrics required for ${c.detectedIntent} intent`,
  },
  {
    id: 'workflows.internal', label: 'Internal Workflows', kind: 'workflows', classification: 'INTERNAL', baseRelevance: 50,
    when: (c) => c.detectedIntent === 'automation' || c.detectedIntent === 'scheduling',
    rationale: () => 'Existing workflow definitions may be reused or extended',
  },
];

export class ContextEnricher implements IContextEnricher {
  readonly id = 'context-enricher-v1';

  enrich(
    context: BusinessContext,
    _request: ContextRequest,
    memory:  EnterpriseMemorySnapshot,
  ): ContextEnrichment {
    // Filter memory to entries whose classification the request is allowed to see.
    const relevantMemory: RelevantMemory[] = memory.exists
      ? this.filterMemoryByClassification(memory.entries, context.maxClassification)
      : [];

    // Recommend sources based on intent, entities and constraints.
    const recommendedSources: ContextSource[] = SOURCE_TEMPLATES
      .filter(t => t.when(context, memory))
      .map(t => ({
        id:             t.id,
        label:          t.label,
        kind:           t.kind,
        available:      false,            // no real connectors queried yet
        relevance:      this.scoreSource(t, context, relevantMemory),
        classification: t.classification,
        rationale:      t.rationale(context),
      }))
      .sort((a, b) => b.relevance - a.relevance);

    const hasEnterpriseData = memory.exists && relevantMemory.length > 0;

    return { relevantMemory, recommendedSources, hasEnterpriseData };
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private filterMemoryByClassification(
    entries: RelevantMemory[],
    maxAllowed: DataClassification,
  ): RelevantMemory[] {
    const order: DataClassification[] = ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'];
    const maxRank = order.indexOf(maxAllowed);
    return entries.filter(e => order.indexOf(e.classification) <= maxRank);
  }

  private scoreSource(
    template: SourceTemplate,
    context: BusinessContext,
    relevantMemory: RelevantMemory[],
  ): number {
    let relevance = template.baseRelevance;

    if (context.maxClassification === 'RESTRICTED' && template.classification === 'RESTRICTED') {
      relevance += 10;
    }
    if (context.urgency === 'critical' && template.kind === 'metrics') {
      relevance += 10;
    }
    if (relevantMemory.some(m => m.key.startsWith(`source.${template.id}`))) {
      relevance += 5;
    }

    return Math.max(0, Math.min(100, relevance));
  }
}
