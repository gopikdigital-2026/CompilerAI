// ─── Human approval rules ──────────────────────────────────────────────────────
// Pure rules for determining when a plan node requires human approval.
// The Planning Engine only marks approval as necessary — no approval flow here.

import type { IntentResult } from '../../intent/models/IntentResult';
import type { PlanNode } from '../models/PlanNode';
import type { ApprovalReason } from '../models/HumanApprovalRequirement';

export interface ApprovalDecision {
  requiresApproval: boolean;
  reason?: ApprovalReason;
  rationale?: string;
}

export function evaluateApproval(
  node: PlanNode, intent: IntentResult,
): ApprovalDecision {
  // Workforce reduction
  if (node.type === 'WORKFLOW_DESIGN' && intent.businessArea === 'HUMAN_RESOURCES'
      && intent.impact === 'CRITICAL') {
    return {
      requiresApproval: true,
      reason: 'WORKFORCE_REDUCTION',
      rationale: 'La acción afecta a la plantilla y requiere aprobación ejecutiva.',
    };
  }

  // Financial movements of high impact
  if (intent.businessArea === 'FINANCE' && intent.impact === 'HIGH') {
    return {
      requiresApproval: true,
      reason: 'FINANCIAL_MOVEMENT',
      rationale: 'El movimiento financiero tiene alto impacto y requiere aprobación.',
    };
  }

  // Legal or regulatory changes
  if (intent.businessArea === 'LEGAL' || node.type === 'DOCUMENT_GENERATION'
      && intent.constraints.some(c => c.type === 'compliance')) {
    return {
      requiresApproval: true,
      reason: 'LEGAL_OR_REGULATORY_CHANGE',
      rationale: 'El cambio legal o regulatorio requiere aprobación.',
    };
  }

  // Restricted data access
  if (intent.affectedEntities.some(e => e.classification === 'RESTRICTED')
      || intent.constraints.some(c => c.classification === 'RESTRICTED')) {
    return {
      requiresApproval: true,
      reason: 'RESTRICTED_DATA_ACCESS',
      rationale: 'El acceso a datos restringidos requiere aprobación.',
    };
  }

  // High impact + low confidence
  if ((intent.impact === 'HIGH' || intent.impact === 'CRITICAL')
      && intent.confidenceScore < 55) {
    return {
      requiresApproval: true,
      reason: 'HIGH_IMPACT_LOW_CONFIDENCE',
      rationale: 'Alto impacto con baja confianza requiere aprobación humana.',
    };
  }

  // High-impact external execution
  if (node.requiredCapabilities.includes('EXTERNAL_DATA_ACCESS')
      && (intent.impact === 'HIGH' || intent.impact === 'CRITICAL')) {
    return {
      requiresApproval: true,
      reason: 'HIGH_IMPACT_EXTERNAL_EXECUTION',
      rationale: 'La ejecución externa de alto impacto requiere aprobación.',
    };
  }

  return { requiresApproval: false };
}
