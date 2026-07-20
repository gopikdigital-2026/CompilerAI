// ─── Suggested agent types & tool categories ───────────────────────────────────
// Abstract descriptors — not concrete agent or tool instances.
// Used by the Intent Engine to hint at the roster the Planning Engine may
// eventually instantiate. Nothing here is executed.

export type SuggestedAgentType =
  | 'FINANCIAL_ANALYST_AGENT'
  | 'SALES_ANALYST_AGENT'
  | 'MARKETING_ANALYST_AGENT'
  | 'OPERATIONS_AGENT'
  | 'STRATEGY_AGENT'
  | 'RESEARCH_AGENT'
  | 'DATA_ANALYST_AGENT'
  | 'HR_AGENT'
  | 'LEGAL_AGENT'
  | 'CUSTOMER_SERVICE_AGENT'
  | 'IT_AGENT'
  | 'PRODUCT_AGENT'
  | 'ORCHESTRATOR_AGENT'
  | 'GENERAL_PURPOSE_AGENT';

export type SuggestedToolCategory =
  | 'DATA_ANALYSIS_TOOLS'
  | 'CRM_TOOLS'
  | 'ERP_TOOLS'
  | 'DOCUMENT_TOOLS'
  | 'METRICS_TOOLS'
  | 'COMMUNICATION_TOOLS'
  | 'FORECASTING_TOOLS'
  | 'OPTIMIZATION_TOOLS'
  | 'WORKFLOW_TOOLS'
  | 'APPROVAL_TOOLS'
  | 'MEMORY_TOOLS';
