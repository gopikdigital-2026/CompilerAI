// ─── Capability mapping rules ───────────────────────────────────────────────────
// Pure, deterministic rules that map an IntentCategory + BusinessArea pair to
// the abstract capabilities, agent types and tool categories the system may
// eventually need. Nothing here is executed — descriptors only.

import type { IntentCategory } from '../models/IntentCategory';
import type { BusinessArea } from '../models/BusinessArea';
import type { RequiredCapability } from '../models/RequiredCapability';
import type { SuggestedAgentType, SuggestedToolCategory } from '../models/SuggestedAgents';

export interface CapabilityMapping {
  capabilities:       RequiredCapability[];
  agentTypes:          SuggestedAgentType[];
  toolCategories:      SuggestedToolCategory[];
}

const CATEGORY_CAPABILITIES: Record<IntentCategory, RequiredCapability[]> = {
  ANALYZE:    ['DATA_ANALYSIS', 'REASONING', 'MEMORY_RETRIEVAL'],
  DECIDE:     ['DECISION_SUPPORT', 'REASONING', 'DATA_ANALYSIS'],
  PLAN:       ['PLANNING', 'REASONING', 'FORECASTING'],
  OPTIMIZE:   ['OPTIMIZATION', 'DATA_ANALYSIS', 'REASONING'],
  PREDICT:    ['FORECASTING', 'DATA_ANALYSIS', 'REASONING'],
  EXPLAIN:    ['REASONING', 'DATA_ANALYSIS', 'MEMORY_RETRIEVAL'],
  CREATE:     ['WORKFLOW_CREATION', 'REASONING'],
  EXECUTE:    ['TOOL_EXECUTION', 'WORKFLOW_CREATION'],
  MONITOR:    ['DATA_ANALYSIS', 'MEMORY_RETRIEVAL'],
  INVESTIGATE:['DATA_ANALYSIS', 'REASONING', 'DOCUMENT_ANALYSIS'],
  COMPARE:    ['DATA_ANALYSIS', 'REASONING'],
  RECOMMEND:  ['REASONING', 'DATA_ANALYSIS', 'DECISION_SUPPORT'],
  UNKNOWN:    ['REASONING'],
};

const AREA_AGENTS: Record<BusinessArea, SuggestedAgentType[]> = {
  GENERAL_MANAGEMENT:    ['STRATEGY_AGENT', 'ORCHESTRATOR_AGENT'],
  SALES:                 ['SALES_ANALYST_AGENT'],
  MARKETING:              ['MARKETING_ANALYST_AGENT'],
  FINANCE:                ['FINANCIAL_ANALYST_AGENT'],
  OPERATIONS:             ['OPERATIONS_AGENT'],
  HUMAN_RESOURCES:        ['HR_AGENT'],
  CUSTOMER_SERVICE:      ['CUSTOMER_SERVICE_AGENT'],
  PROCUREMENT:           ['OPERATIONS_AGENT'],
  LOGISTICS:             ['OPERATIONS_AGENT'],
  LEGAL:                 ['LEGAL_AGENT'],
  INFORMATION_TECHNOLOGY:['IT_AGENT'],
  PRODUCT:               ['PRODUCT_AGENT'],
  STRATEGY:              ['STRATEGY_AGENT'],
  UNKNOWN:               ['GENERAL_PURPOSE_AGENT'],
};

const AREA_TOOLS: Record<BusinessArea, SuggestedToolCategory[]> = {
  GENERAL_MANAGEMENT:    ['DATA_ANALYSIS_TOOLS', 'METRICS_TOOLS'],
  SALES:                 ['CRM_TOOLS', 'DATA_ANALYSIS_TOOLS'],
  MARKETING:              ['DATA_ANALYSIS_TOOLS', 'COMMUNICATION_TOOLS'],
  FINANCE:                ['DATA_ANALYSIS_TOOLS', 'ERP_TOOLS'],
  OPERATIONS:             ['ERP_TOOLS', 'OPTIMIZATION_TOOLS'],
  HUMAN_RESOURCES:        ['DOCUMENT_TOOLS', 'APPROVAL_TOOLS'],
  CUSTOMER_SERVICE:      ['CRM_TOOLS', 'COMMUNICATION_TOOLS'],
  PROCUREMENT:           ['ERP_TOOLS', 'DOCUMENT_TOOLS'],
  LOGISTICS:             ['ERP_TOOLS', 'OPTIMIZATION_TOOLS'],
  LEGAL:                 ['DOCUMENT_TOOLS', 'APPROVAL_TOOLS'],
  INFORMATION_TECHNOLOGY:['DATA_ANALYSIS_TOOLS', 'METRICS_TOOLS'],
  PRODUCT:               ['DATA_ANALYSIS_TOOLS'],
  STRATEGY:              ['DATA_ANALYSIS_TOOLS', 'FORECASTING_TOOLS'],
  UNKNOWN:               ['DATA_ANALYSIS_TOOLS'],
};

const CATEGORY_TOOLS: Partial<Record<IntentCategory, SuggestedToolCategory[]>> = {
  PREDICT:   ['FORECASTING_TOOLS'],
  OPTIMIZE:  ['OPTIMIZATION_TOOLS'],
  CREATE:    ['WORKFLOW_TOOLS'],
  EXECUTE:   ['WORKFLOW_TOOLS'],
  MONITOR:   ['METRICS_TOOLS'],
  INVESTIGATE:['DOCUMENT_TOOLS'],
};

/**
 * Resolve the capability mapping for a category + area pair. Pure and
 * side-effect free. Duplicates are removed and order is preserved.
 */
export function mapCapabilities(
  category: IntentCategory,
  area:     BusinessArea,
): CapabilityMapping {
  const capabilities = dedupe(CATEGORY_CAPABILITIES[category]);
  const agentTypes   = dedupe(AREA_AGENTS[area]);
  const toolCategories = dedupe([
    ...(CATEGORY_TOOLS[category] ?? []),
    ...AREA_TOOLS[area],
  ]);

  return { capabilities, agentTypes, toolCategories };
}

function dedupe<T>(items: readonly T[]): T[] {
  const seen = new Set<T>();
  const out: T[] = [];
  for (const item of items) {
    if (!seen.has(item)) { seen.add(item); out.push(item); }
  }
  return out;
}
