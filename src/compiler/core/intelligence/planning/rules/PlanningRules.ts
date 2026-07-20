// ─── Planning rules ────────────────────────────────────────────────────────────
// Maps an IntentResult's primary + secondary intents to a deterministic
// sequence of plan node blueprints. Pure data — no side effects.

import type { IntentCategory } from '../../intent/models/IntentCategory';
import type { BusinessArea } from '../../intent/models/BusinessArea';
import type { PlanNodeType } from '../models/PlanNodeType';
import type { RequiredCapability } from '../../intent/models/RequiredCapability';
import type { SuggestedAgentType, SuggestedToolCategory } from '../../intent/models/SuggestedAgents';
import type { ComplexityLevel } from '../../intent/models/ComplexityLevel';
import type { RiskLevel } from '../models/PlanRisk';

export interface NodeBlueprint {
  type:                    PlanNodeType;
  title:                   string;
  description:             string;
  objective:               string;
  requiredCapabilities:    RequiredCapability[];
  suggestedAgentType:      SuggestedAgentType;
  suggestedToolCategories: SuggestedToolCategory[];
  riskLevel:               RiskLevel;
  estimatedComplexity:     ComplexityLevel;
  canRunInParallel:        boolean;
  executionPriority:       number;
}

export interface PlanBlueprint {
  nodes:    NodeBlueprint[];
  /** Edges as index pairs: [sourceIndex, targetIndex, dependencyType, required]. */
  edges:    Array<[number, number, 'FINISH_TO_START' | 'DATA_DEPENDENCY' | 'VALIDATION_DEPENDENCY' | 'APPROVAL_DEPENDENCY' | 'CONDITIONAL_DEPENDENCY', boolean]>;
  title:    string;
  objective: string;
  summary:  string;
  requiredDataSources: string[];
}

// ── Shared node blueprints ──────────────────────────────────────────────────────

const MEMORY_RETRIEVAL: NodeBlueprint = {
  type: 'MEMORY_RETRIEVAL', title: 'Retrieve Enterprise Memory',
  description: 'Fetch relevant enterprise memory entries for context',
  objective: 'Gather historical context from organizational memory',
  requiredCapabilities: ['MEMORY_RETRIEVAL'],
  suggestedAgentType: 'ORCHESTRATOR_AGENT', suggestedToolCategories: ['MEMORY_TOOLS'],
  riskLevel: 'LOW', estimatedComplexity: 'LOW', canRunInParallel: true, executionPriority: 10,
};

const DATA_RETRIEVAL: NodeBlueprint = {
  type: 'DATA_RETRIEVAL', title: 'Retrieve Enterprise Data',
  description: 'Fetch required data from enterprise systems',
  objective: 'Collect data needed for downstream analysis',
  requiredCapabilities: ['EXTERNAL_DATA_ACCESS'],
  suggestedAgentType: 'ORCHESTRATOR_AGENT', suggestedToolCategories: ['DATA_ANALYSIS_TOOLS'],
  riskLevel: 'MEDIUM', estimatedComplexity: 'MEDIUM', canRunInParallel: true, executionPriority: 20,
};

const VALIDATION: NodeBlueprint = {
  type: 'VALIDATION', title: 'Validate Data Quality',
  description: 'Validate retrieved data for completeness and consistency',
  objective: 'Ensure data is fit for analysis',
  requiredCapabilities: ['REASONING'],
  suggestedAgentType: 'DATA_ANALYST_AGENT', suggestedToolCategories: ['DATA_ANALYSIS_TOOLS'],
  riskLevel: 'LOW', estimatedComplexity: 'LOW', canRunInParallel: false, executionPriority: 40,
};

const FINAL_SYNTHESIS: NodeBlueprint = {
  type: 'FINAL_SYNTHESIS', title: 'Final Synthesis',
  description: 'Synthesize all findings into a coherent result',
  objective: 'Produce the final deliverable',
  requiredCapabilities: ['REASONING'],
  suggestedAgentType: 'ORCHESTRATOR_AGENT', suggestedToolCategories: ['DATA_ANALYSIS_TOOLS'],
  riskLevel: 'LOW', estimatedComplexity: 'MEDIUM', canRunInParallel: false, executionPriority: 90,
};

function analysisNode(area: BusinessArea): NodeBlueprint {
  return {
    type: 'ANALYSIS', title: 'Analyze Data',
    description: 'Perform analytical processing on the retrieved data',
    objective: 'Extract insights from enterprise data',
    requiredCapabilities: ['DATA_ANALYSIS', 'REASONING'],
    suggestedAgentType: agentForArea(area),
    suggestedToolCategories: ['DATA_ANALYSIS_TOOLS'],
    riskLevel: 'MEDIUM', estimatedComplexity: 'MEDIUM', canRunInParallel: true, executionPriority: 50,
  };
}

function agentForArea(area: BusinessArea): SuggestedAgentType {
  const map: Record<BusinessArea, SuggestedAgentType> = {
    FINANCE: 'FINANCIAL_ANALYST_AGENT', SALES: 'SALES_ANALYST_AGENT',
    MARKETING: 'MARKETING_ANALYST_AGENT', OPERATIONS: 'OPERATIONS_AGENT',
    HUMAN_RESOURCES: 'HR_AGENT', CUSTOMER_SERVICE: 'CUSTOMER_SERVICE_AGENT',
    PROCUREMENT: 'OPERATIONS_AGENT', LOGISTICS: 'OPERATIONS_AGENT',
    LEGAL: 'LEGAL_AGENT', INFORMATION_TECHNOLOGY: 'IT_AGENT',
    PRODUCT: 'PRODUCT_AGENT', STRATEGY: 'STRATEGY_AGENT',
    GENERAL_MANAGEMENT: 'STRATEGY_AGENT', UNKNOWN: 'GENERAL_PURPOSE_AGENT',
  };
  return map[area] ?? 'GENERAL_PURPOSE_AGENT';
}

// ── Category → blueprint mapping ────────────────────────────────────────────────

export function blueprintForIntent(
  primary: IntentCategory, secondary: IntentCategory[], area: BusinessArea,
): PlanBlueprint {
  switch (primary) {
    case 'ANALYZE':     return analyzeBlueprint(area, secondary);
    case 'DECIDE':      return decideBlueprint(area, secondary);
    case 'OPTIMIZE':    return optimizeBlueprint(area, secondary);
    case 'PREDICT':     return predictBlueprint(area, secondary);
    case 'RECOMMEND':   return recommendBlueprint(area, secondary);
    case 'COMPARE':     return compareBlueprint(area, secondary);
    case 'EXECUTE':     return executeBlueprint(area, secondary);
    case 'CREATE':      return createBlueprint(area, secondary);
    case 'PLAN':        return planBlueprint(area, secondary);
    case 'MONITOR':     return monitorBlueprint(area, secondary);
    case 'INVESTIGATE': return investigateBlueprint(area, secondary);
    case 'EXPLAIN':     return explainBlueprint(area, secondary);
    default:            return unknownBlueprint();
  }
}

function analyzeBlueprint(area: BusinessArea, secondary: IntentCategory[]): PlanBlueprint {
  const nodes = [MEMORY_RETRIEVAL, DATA_RETRIEVAL, analysisNode(area)];
  const edges: PlanBlueprint['edges'] = [
    [0, 1, 'FINISH_TO_START', true],
    [1, 2, 'DATA_DEPENDENCY', true],
  ];

  let lastAnalysisIdx = 2;

  // When PREDICT is a secondary intent, add a forecasting node parallel to analysis.
  if (secondary.includes('PREDICT')) {
    const forecasting: NodeBlueprint = {
      type: 'FORECASTING', title: 'Forecast',
      description: 'Generate forecasts based on historical data',
      objective: 'Predict future values',
      requiredCapabilities: ['FORECASTING', 'DATA_ANALYSIS'],
      suggestedAgentType: 'DATA_ANALYST_AGENT', suggestedToolCategories: ['FORECASTING_TOOLS'],
      riskLevel: 'MEDIUM', estimatedComplexity: 'HIGH', canRunInParallel: true, executionPriority: 50,
    };
    nodes.push(forecasting);
    edges.push([1, nodes.length - 1, 'DATA_DEPENDENCY', true]);
  }

  // When RECOMMEND is a secondary intent, add a recommendation node after analysis.
  if (secondary.includes('RECOMMEND')) {
    const recommendation: NodeBlueprint = {
      type: 'RECOMMENDATION', title: 'Recommend Actions',
      description: 'Recommend actions based on analysis',
      objective: 'Produce actionable recommendations',
      requiredCapabilities: ['DECISION_SUPPORT', 'REASONING'],
      suggestedAgentType: agentForArea(area), suggestedToolCategories: ['DATA_ANALYSIS_TOOLS'],
      riskLevel: 'LOW', estimatedComplexity: 'MEDIUM', canRunInParallel: false, executionPriority: 70,
    };
    nodes.push(recommendation);
    edges.push([lastAnalysisIdx, nodes.length - 1, 'DATA_DEPENDENCY', true]);
    lastAnalysisIdx = nodes.length - 1;
  }

  nodes.push(VALIDATION, FINAL_SYNTHESIS);
  edges.push([lastAnalysisIdx, nodes.length - 2, 'VALIDATION_DEPENDENCY', true]);
  edges.push([nodes.length - 2, nodes.length - 1, 'DATA_DEPENDENCY', true]);

  return baseBlueprint(nodes, edges, area, secondary, 'Análisis empresarial');
}

function decideBlueprint(area: BusinessArea, secondary: IntentCategory[]): PlanBlueprint {
  const financial: NodeBlueprint = {
    ...analysisNode(area), title: 'Financial Analysis', objective: 'Assess financial implications',
    suggestedAgentType: 'FINANCIAL_ANALYST_AGENT',
  };
  const market: NodeBlueprint = {
    type: 'EXTERNAL_RESEARCH', title: 'Market Research',
    description: 'Research market conditions and competitive landscape',
    objective: 'Gather external market intelligence',
    requiredCapabilities: ['EXTERNAL_DATA_ACCESS', 'REASONING'],
    suggestedAgentType: 'RESEARCH_AGENT', suggestedToolCategories: ['DATA_ANALYSIS_TOOLS'],
    riskLevel: 'MEDIUM', estimatedComplexity: 'HIGH', canRunInParallel: true, executionPriority: 50,
  };
  const legal: NodeBlueprint = {
    type: 'ANALYSIS', title: 'Legal & Regulatory Analysis',
    description: 'Assess legal and regulatory implications',
    objective: 'Identify legal risks and compliance requirements',
    requiredCapabilities: ['DOCUMENT_ANALYSIS', 'REASONING'],
    suggestedAgentType: 'LEGAL_AGENT', suggestedToolCategories: ['DOCUMENT_TOOLS'],
    riskLevel: 'HIGH', estimatedComplexity: 'HIGH', canRunInParallel: true, executionPriority: 50,
  };
  const comparison: NodeBlueprint = {
    type: 'COMPARISON', title: 'Compare Options',
    description: 'Compare scenarios against criteria',
    objective: 'Evaluate alternatives systematically',
    requiredCapabilities: ['REASONING', 'DATA_ANALYSIS'],
    suggestedAgentType: 'STRATEGY_AGENT', suggestedToolCategories: ['DATA_ANALYSIS_TOOLS'],
    riskLevel: 'MEDIUM', estimatedComplexity: 'MEDIUM', canRunInParallel: false, executionPriority: 60,
  };
  const recommendation: NodeBlueprint = {
    type: 'RECOMMENDATION', title: 'Strategic Recommendation',
    description: 'Formulate a strategic recommendation',
    objective: 'Produce a decision-ready recommendation',
    requiredCapabilities: ['DECISION_SUPPORT', 'REASONING'],
    suggestedAgentType: 'STRATEGY_AGENT', suggestedToolCategories: ['DATA_ANALYSIS_TOOLS'],
    riskLevel: 'HIGH', estimatedComplexity: 'HIGH', canRunInParallel: false, executionPriority: 70,
  };
  const nodes = [MEMORY_RETRIEVAL, financial, market, legal, comparison, recommendation, VALIDATION, FINAL_SYNTHESIS];
  const edges: PlanBlueprint['edges'] = [
    [0, 1, 'FINISH_TO_START', true],
    [0, 2, 'FINISH_TO_START', true],
    [0, 3, 'FINISH_TO_START', true],
    [1, 4, 'DATA_DEPENDENCY', true],
    [2, 4, 'DATA_DEPENDENCY', true],
    [3, 4, 'DATA_DEPENDENCY', true],
    [4, 5, 'DATA_DEPENDENCY', true],
    [5, 6, 'VALIDATION_DEPENDENCY', true],
    [6, 7, 'DATA_DEPENDENCY', true],
  ];
  return baseBlueprint(nodes, edges, area, secondary, 'Decisión estratégica');
}

function optimizeBlueprint(area: BusinessArea, secondary: IntentCategory[]): PlanBlueprint {
  const scoring: NodeBlueprint = {
    type: 'OPTIMIZATION', title: 'Score & Prioritize',
    description: 'Apply scoring model to prioritize opportunities',
    objective: 'Rank items by probability of success',
    requiredCapabilities: ['OPTIMIZATION', 'DATA_ANALYSIS'],
    suggestedAgentType: agentForArea(area), suggestedToolCategories: ['OPTIMIZATION_TOOLS'],
    riskLevel: 'MEDIUM', estimatedComplexity: 'MEDIUM', canRunInParallel: false, executionPriority: 50,
  };
  const recommendation: NodeBlueprint = {
    type: 'RECOMMENDATION', title: 'Recommend Top Opportunities',
    description: 'Surface the highest-priority opportunities',
    objective: 'Produce actionable recommendations',
    requiredCapabilities: ['DECISION_SUPPORT', 'REASONING'],
    suggestedAgentType: agentForArea(area), suggestedToolCategories: ['DATA_ANALYSIS_TOOLS'],
    riskLevel: 'LOW', estimatedComplexity: 'MEDIUM', canRunInParallel: false, executionPriority: 60,
  };
  const nodes = [MEMORY_RETRIEVAL, DATA_RETRIEVAL, scoring, recommendation, VALIDATION, FINAL_SYNTHESIS];
  const edges: PlanBlueprint['edges'] = [
    [0, 1, 'FINISH_TO_START', true],
    [1, 2, 'DATA_DEPENDENCY', true],
    [2, 3, 'DATA_DEPENDENCY', true],
    [3, 4, 'VALIDATION_DEPENDENCY', true],
    [4, 5, 'DATA_DEPENDENCY', true],
  ];
  return baseBlueprint(nodes, edges, area, secondary, 'Optimización comercial');
}

function predictBlueprint(area: BusinessArea, secondary: IntentCategory[]): PlanBlueprint {
  const forecasting: NodeBlueprint = {
    type: 'FORECASTING', title: 'Forecast Next Quarter',
    description: 'Generate forecasts for the next quarter',
    objective: 'Predict future values based on historical data',
    requiredCapabilities: ['FORECASTING', 'DATA_ANALYSIS'],
    suggestedAgentType: 'DATA_ANALYST_AGENT', suggestedToolCategories: ['FORECASTING_TOOLS'],
    riskLevel: 'MEDIUM', estimatedComplexity: 'HIGH', canRunInParallel: true, executionPriority: 50,
  };
  const nodes = [MEMORY_RETRIEVAL, DATA_RETRIEVAL, analysisNode(area), forecasting, VALIDATION, FINAL_SYNTHESIS];
  const edges: PlanBlueprint['edges'] = [
    [0, 1, 'FINISH_TO_START', true],
    [1, 2, 'DATA_DEPENDENCY', true],
    [1, 3, 'DATA_DEPENDENCY', true],
    [2, 4, 'VALIDATION_DEPENDENCY', true],
    [3, 4, 'VALIDATION_DEPENDENCY', true],
    [4, 5, 'DATA_DEPENDENCY', true],
  ];
  // If RECOMMEND is a secondary intent, add a recommendation node.
  if (secondary.includes('RECOMMEND')) {
    const rec: NodeBlueprint = {
      type: 'RECOMMENDATION', title: 'Recommend Products to Push',
      description: 'Recommend which products to promote based on forecasts',
      objective: 'Translate forecasts into product recommendations',
      requiredCapabilities: ['DECISION_SUPPORT', 'REASONING'],
      suggestedAgentType: agentForArea(area), suggestedToolCategories: ['DATA_ANALYSIS_TOOLS'],
      riskLevel: 'LOW', estimatedComplexity: 'MEDIUM', canRunInParallel: false, executionPriority: 70,
    };
    nodes.splice(5, 0, rec);
    edges.push([4, 5, 'DATA_DEPENDENCY', true], [5, 6, 'DATA_DEPENDENCY', true]);
  }
  return baseBlueprint(nodes, edges, area, secondary, 'Predicción y recomendación');
}

function recommendBlueprint(area: BusinessArea, secondary: IntentCategory[]): PlanBlueprint {
  const recommendation: NodeBlueprint = {
    type: 'RECOMMENDATION', title: 'Generate Recommendations',
    description: 'Produce actionable recommendations',
    objective: 'Recommend the best course of action',
    requiredCapabilities: ['DECISION_SUPPORT', 'REASONING'],
    suggestedAgentType: agentForArea(area), suggestedToolCategories: ['DATA_ANALYSIS_TOOLS'],
    riskLevel: 'LOW', estimatedComplexity: 'MEDIUM', canRunInParallel: false, executionPriority: 60,
  };
  const nodes = [MEMORY_RETRIEVAL, DATA_RETRIEVAL, analysisNode(area), recommendation, VALIDATION, FINAL_SYNTHESIS];
  const edges: PlanBlueprint['edges'] = [
    [0, 1, 'FINISH_TO_START', true],
    [1, 2, 'DATA_DEPENDENCY', true],
    [2, 3, 'DATA_DEPENDENCY', true],
    [3, 4, 'VALIDATION_DEPENDENCY', true],
    [4, 5, 'DATA_DEPENDENCY', true],
  ];
  return baseBlueprint(nodes, edges, area, secondary, 'Recomendación');
}

function compareBlueprint(area: BusinessArea, secondary: IntentCategory[]): PlanBlueprint {
  const comparison: NodeBlueprint = {
    type: 'COMPARISON', title: 'Compare Alternatives',
    description: 'Compare options against defined criteria',
    objective: 'Evaluate alternatives systematically',
    requiredCapabilities: ['REASONING', 'DATA_ANALYSIS'],
    suggestedAgentType: agentForArea(area), suggestedToolCategories: ['DATA_ANALYSIS_TOOLS'],
    riskLevel: 'LOW', estimatedComplexity: 'MEDIUM', canRunInParallel: false, executionPriority: 50,
  };
  const nodes = [MEMORY_RETRIEVAL, DATA_RETRIEVAL, comparison, VALIDATION, FINAL_SYNTHESIS];
  const edges: PlanBlueprint['edges'] = [
    [0, 1, 'FINISH_TO_START', true],
    [1, 2, 'DATA_DEPENDENCY', true],
    [2, 3, 'VALIDATION_DEPENDENCY', true],
    [3, 4, 'DATA_DEPENDENCY', true],
  ];
  return baseBlueprint(nodes, edges, area, secondary, 'Comparación');
}

function executeBlueprint(area: BusinessArea, secondary: IntentCategory[]): PlanBlueprint {
  const execution: NodeBlueprint = {
    type: 'WORKFLOW_DESIGN', title: 'Design Execution Workflow',
    description: 'Design the workflow for the requested action',
    objective: 'Produce an executable workflow design',
    requiredCapabilities: ['WORKFLOW_CREATION', 'TOOL_EXECUTION'],
    suggestedAgentType: agentForArea(area), suggestedToolCategories: ['WORKFLOW_TOOLS'],
    riskLevel: 'CRITICAL', estimatedComplexity: 'HIGH', canRunInParallel: false, executionPriority: 60,
  };
  const nodes = [MEMORY_RETRIEVAL, DATA_RETRIEVAL, analysisNode(area), execution, VALIDATION, FINAL_SYNTHESIS];
  const edges: PlanBlueprint['edges'] = [
    [0, 1, 'FINISH_TO_START', true],
    [1, 2, 'DATA_DEPENDENCY', true],
    [2, 3, 'DATA_DEPENDENCY', true],
    [3, 4, 'APPROVAL_DEPENDENCY', true],
    [4, 5, 'DATA_DEPENDENCY', true],
  ];
  return baseBlueprint(nodes, edges, area, secondary, 'Ejecución de acción');
}

function createBlueprint(area: BusinessArea, secondary: IntentCategory[]): PlanBlueprint {
  const generation: NodeBlueprint = {
    type: 'DOCUMENT_GENERATION', title: 'Generate Document',
    description: 'Generate the requested document or artifact',
    objective: 'Produce the requested deliverable',
    requiredCapabilities: ['WORKFLOW_CREATION', 'REASONING'],
    suggestedAgentType: agentForArea(area), suggestedToolCategories: ['DOCUMENT_TOOLS'],
    riskLevel: 'MEDIUM', estimatedComplexity: 'MEDIUM', canRunInParallel: false, executionPriority: 50,
  };
  const nodes = [MEMORY_RETRIEVAL, DATA_RETRIEVAL, generation, VALIDATION, FINAL_SYNTHESIS];
  const edges: PlanBlueprint['edges'] = [
    [0, 1, 'FINISH_TO_START', true],
    [1, 2, 'DATA_DEPENDENCY', true],
    [2, 3, 'VALIDATION_DEPENDENCY', true],
    [3, 4, 'DATA_DEPENDENCY', true],
  ];
  return baseBlueprint(nodes, edges, area, secondary, 'Creación de artefacto');
}

function planBlueprint(area: BusinessArea, secondary: IntentCategory[]): PlanBlueprint {
  const planning: NodeBlueprint = {
    type: 'WORKFLOW_DESIGN', title: 'Design Plan',
    description: 'Design a structured plan',
    objective: 'Produce a structured plan document',
    requiredCapabilities: ['PLANNING', 'REASONING'],
    suggestedAgentType: 'STRATEGY_AGENT', suggestedToolCategories: ['WORKFLOW_TOOLS'],
    riskLevel: 'LOW', estimatedComplexity: 'MEDIUM', canRunInParallel: false, executionPriority: 50,
  };
  const nodes = [MEMORY_RETRIEVAL, DATA_RETRIEVAL, planning, VALIDATION, FINAL_SYNTHESIS];
  const edges: PlanBlueprint['edges'] = [
    [0, 1, 'FINISH_TO_START', true],
    [1, 2, 'DATA_DEPENDENCY', true],
    [2, 3, 'VALIDATION_DEPENDENCY', true],
    [3, 4, 'DATA_DEPENDENCY', true],
  ];
  return baseBlueprint(nodes, edges, area, secondary, 'Planificación');
}

function monitorBlueprint(area: BusinessArea, secondary: IntentCategory[]): PlanBlueprint {
  const monitoring: NodeBlueprint = {
    type: 'ANALYSIS', title: 'Monitor Metrics',
    description: 'Set up monitoring and tracking',
    objective: 'Establish ongoing observation',
    requiredCapabilities: ['DATA_ANALYSIS', 'MEMORY_RETRIEVAL'],
    suggestedAgentType: agentForArea(area), suggestedToolCategories: ['METRICS_TOOLS'],
    riskLevel: 'LOW', estimatedComplexity: 'LOW', canRunInParallel: true, executionPriority: 50,
  };
  const nodes = [MEMORY_RETRIEVAL, DATA_RETRIEVAL, monitoring, VALIDATION, FINAL_SYNTHESIS];
  const edges: PlanBlueprint['edges'] = [
    [0, 1, 'FINISH_TO_START', true],
    [1, 2, 'DATA_DEPENDENCY', true],
    [2, 3, 'VALIDATION_DEPENDENCY', true],
    [3, 4, 'DATA_DEPENDENCY', true],
  ];
  return baseBlueprint(nodes, edges, area, secondary, 'Monitorización');
}

function investigateBlueprint(area: BusinessArea, secondary: IntentCategory[]): PlanBlueprint {
  const investigation: NodeBlueprint = {
    type: 'ANALYSIS', title: 'Investigate',
    description: 'Perform systematic investigation',
    objective: 'Uncover root causes and findings',
    requiredCapabilities: ['DATA_ANALYSIS', 'DOCUMENT_ANALYSIS', 'REASONING'],
    suggestedAgentType: 'RESEARCH_AGENT', suggestedToolCategories: ['DOCUMENT_TOOLS'],
    riskLevel: 'MEDIUM', estimatedComplexity: 'HIGH', canRunInParallel: true, executionPriority: 50,
  };
  const nodes = [MEMORY_RETRIEVAL, DATA_RETRIEVAL, investigation, VALIDATION, FINAL_SYNTHESIS];
  const edges: PlanBlueprint['edges'] = [
    [0, 1, 'FINISH_TO_START', true],
    [1, 2, 'DATA_DEPENDENCY', true],
    [2, 3, 'VALIDATION_DEPENDENCY', true],
    [3, 4, 'DATA_DEPENDENCY', true],
  ];
  return baseBlueprint(nodes, edges, area, secondary, 'Investigación');
}

function explainBlueprint(area: BusinessArea, secondary: IntentCategory[]): PlanBlueprint {
  const explanation: NodeBlueprint = {
    type: 'REASONING', title: 'Explain Findings',
    description: 'Produce a clear explanation',
    objective: 'Explain the reasons behind observed outcomes',
    requiredCapabilities: ['REASONING', 'DATA_ANALYSIS'],
    suggestedAgentType: agentForArea(area), suggestedToolCategories: ['DATA_ANALYSIS_TOOLS'],
    riskLevel: 'LOW', estimatedComplexity: 'MEDIUM', canRunInParallel: false, executionPriority: 50,
  };
  const nodes = [MEMORY_RETRIEVAL, DATA_RETRIEVAL, explanation, VALIDATION, FINAL_SYNTHESIS];
  const edges: PlanBlueprint['edges'] = [
    [0, 1, 'FINISH_TO_START', true],
    [1, 2, 'DATA_DEPENDENCY', true],
    [2, 3, 'VALIDATION_DEPENDENCY', true],
    [3, 4, 'DATA_DEPENDENCY', true],
  ];
  return baseBlueprint(nodes, edges, area, secondary, 'Explicación');
}

function unknownBlueprint(): PlanBlueprint {
  const nodes = [FINAL_SYNTHESIS];
  const edges: PlanBlueprint['edges'] = [];
  return {
    nodes, edges,
    title: 'Plan indeterminado',
    objective: 'No se pudo determinar un objetivo claro',
    summary: 'La intención no es suficientemente clara para generar un plan.',
    requiredDataSources: [],
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────────

function baseBlueprint(
  nodes: NodeBlueprint[], edges: PlanBlueprint['edges'],
  area: BusinessArea, _secondary: IntentCategory[], label: string,
): PlanBlueprint {
  return {
    nodes, edges,
    title:      label,
    objective:  `Plan generado para ${label.toLowerCase()} en el área ${area}`,
    summary:    `Plan determinista para la intención principal en ${area}.`,
    requiredDataSources: dataSourcesForArea(area),
  };
}

function dataSourcesForArea(area: BusinessArea): string[] {
  const map: Partial<Record<BusinessArea, string[]>> = {
    FINANCE: ['erp.finance', 'metrics.financial'],
    SALES: ['crm.opportunities', 'crm.pipelines'],
    MARKETING: ['crm.campaigns', 'metrics.marketing'],
    OPERATIONS: ['erp.operations', 'metrics.operational'],
    HUMAN_RESOURCES: ['hr.employees', 'hr.payroll'],
    CUSTOMER_SERVICE: ['crm.tickets', 'crm.satisfaction'],
    PROCUREMENT: ['erp.procurement', 'erp.suppliers'],
    LOGISTICS: ['erp.logistics', 'erp.inventory'],
    LEGAL: ['documents.contracts', 'documents.compliance'],
    INFORMATION_TECHNOLOGY: ['metrics.infrastructure', 'metrics.systems'],
    PRODUCT: ['metrics.product', 'crm.feedback'],
    STRATEGY: ['metrics.executive', 'market.research'],
    GENERAL_MANAGEMENT: ['metrics.executive'],
  };
  return map[area] ?? ['metrics.general'];
}
