// ─── Risk classification rules ──────────────────────────────────────────────────
// Pure rules for identifying and classifying enterprise risks in a plan.

import type { IntentResult } from '../../intent/models/IntentResult';
import type { ExecutionGraph } from '../models/ExecutionGraph';
import type { PlanRisk, RiskLevel } from '../models/PlanRisk';

export function classifyRisks(
  graph: ExecutionGraph, intent: IntentResult,
): PlanRisk[] {
  const risks: PlanRisk[] = [];

  // Insufficient data
  const unavailableInputs = graph.nodes.flatMap(n =>
    n.inputs.filter(i => !i.available).map(i => i.name)
  );
  if (unavailableInputs.length > 0) {
    risks.push({
      kind: 'INSUFFICIENT_DATA',
      level: 'HIGH',
      description: `${unavailableInputs.length} input(s) unavailable`,
      nodeIds: graph.nodes.filter(n => n.inputs.some(i => !i.available)).map(n => n.nodeId),
      mitigation: 'Ensure data sources are connected before execution.',
    });
  }

  // Restricted information
  const restrictedNodes = graph.nodes.filter(n =>
    n.inputs.some(i => i.classification === 'RESTRICTED')
    || n.expectedOutputs.some(o => o.classification === 'RESTRICTED')
  );
  if (restrictedNodes.length > 0 || intent.affectedEntities.some(e => e.classification === 'RESTRICTED')) {
    risks.push({
      kind: 'RESTRICTED_INFORMATION',
      level: 'HIGH',
      description: 'Plan handles restricted information',
      nodeIds: restrictedNodes.map(n => n.nodeId),
      mitigation: 'Ensure all nodes handling restricted data have human approval gates.',
    });
  }

  // Irreversible actions
  const irreversibleNodes = graph.nodes.filter(n =>
    n.type === 'WORKFLOW_DESIGN' || n.type === 'DOCUMENT_GENERATION'
  );
  if (irreversibleNodes.length > 0 && intent.impact === 'CRITICAL') {
    risks.push({
      kind: 'IRREVERSIBLE_ACTION',
      level: 'CRITICAL',
      description: 'Plan contains potentially irreversible actions',
      nodeIds: irreversibleNodes.map(n => n.nodeId),
      mitigation: 'Require human approval before any irreversible step.',
    });
  }

  // Financial impact
  if (intent.businessArea === 'FINANCE' && intent.impact !== 'LOW') {
    risks.push({
      kind: 'FINANCIAL_IMPACT',
      level: intent.impact as RiskLevel,
      description: 'Plan has financial impact',
      nodeIds: [],
      mitigation: 'Review financial implications with a financial analyst.',
    });
  }

  // Workforce impact
  if (intent.businessArea === 'HUMAN_RESOURCES') {
    risks.push({
      kind: 'WORKFORCE_IMPACT',
      level: intent.impact === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
      description: 'Plan affects workforce',
      nodeIds: [],
      mitigation: 'Ensure HR and legal review before execution.',
    });
  }

  // Legal impact
  if (intent.businessArea === 'LEGAL'
      || intent.constraints.some(c => c.type === 'compliance')) {
    risks.push({
      kind: 'LEGAL_IMPACT',
      level: 'HIGH',
      description: 'Plan has legal or regulatory implications',
      nodeIds: [],
      mitigation: 'Involve legal counsel before execution.',
    });
  }

  // External exposure
  const externalNodes = graph.nodes.filter(n =>
    n.requiredCapabilities.includes('EXTERNAL_DATA_ACCESS')
  );
  if (externalNodes.length > 0) {
    risks.push({
      kind: 'EXTERNAL_EXPOSURE',
      level: 'MEDIUM',
      description: 'Plan depends on external systems',
      nodeIds: externalNodes.map(n => n.nodeId),
      mitigation: 'Validate external service availability and credentials.',
    });
  }

  // Low confidence
  if (intent.confidenceScore < 55) {
    risks.push({
      kind: 'LOW_CONFIDENCE',
      level: intent.confidenceScore < 35 ? 'HIGH' : 'MEDIUM',
      description: `Intent confidence is low (${intent.confidenceScore})`,
      nodeIds: [],
      mitigation: 'Request clarification or additional context before execution.',
    });
  }

  // External dependency
  if (externalNodes.length > 0) {
    risks.push({
      kind: 'EXTERNAL_DEPENDENCY',
      level: 'MEDIUM',
      description: 'Plan depends on external data sources',
      nodeIds: externalNodes.map(n => n.nodeId),
      mitigation: 'Have fallback strategies for external service failures.',
    });
  }

  // High-impact automation
  if (intent.impact === 'CRITICAL' || intent.impact === 'HIGH') {
    risks.push({
      kind: 'HIGH_IMPACT_AUTOMATION',
      level: intent.impact as RiskLevel,
      description: 'Automated execution of high-impact action',
      nodeIds: [],
      mitigation: 'Mandate human approval before any high-impact automated step.',
    });
  }

  return risks;
}

export function maxRiskLevel(risks: PlanRisk[]): RiskLevel {
  const order: RiskLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  let maxIdx = 0;
  for (const r of risks) {
    const idx = order.indexOf(r.level);
    if (idx > maxIdx) maxIdx = idx;
  }
  return order[maxIdx];
}
