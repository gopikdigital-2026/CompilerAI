import type { AnalysisOpportunity } from '../types/analysis';
import type { ActionRecord, ActionStatus, ActionPriority, ActionImpact } from '../types/action';
import { calculateROI } from './roiEngine';
import { calculatePriority } from './prioritizationEngine';

export interface CreateActionInput {
  organizationId: string;
  opportunityId?: string;
  userId: string;
  title: string;
  description?: string;
  priority?: ActionPriority;
  expectedImpact?: string;
  expectedRoi?: string;
  dueDate?: string;
  impact?: ActionImpact;
  urgency?: ActionImpact;
  effort?: ActionImpact;
  risk?: ActionImpact;
  dependencies?: string[];
  origin?: 'opportunity' | 'manual';
}

export function opportunityToAction(
  opp: AnalysisOpportunity,
  organizationId: string,
  userId: string,
): CreateActionInput {
  const roi = calculateROI(opp);
  const prio = calculatePriority({
    impact: opp.impact,
    confidence: opp.confidence,
    effort: opp.effort,
    implementationTime: opp.implementationTime,
    dependencies: opp.dependencies,
    risk: opp.risk,
  });

  return {
    organizationId,
    opportunityId: opp.id,
    userId,
    title: opp.title,
    description: opp.description,
    priority: prio.priority,
    expectedImpact: opp.economicImpact,
    expectedRoi: `${roi.roiPercentage}% (€${roi.netROI.toLocaleString()} neto anual)`,
    dueDate: undefined,
    impact: opp.impact,
    urgency: opp.impact === 'high' ? 'high' : 'medium',
    effort: opp.effort,
    risk: opp.risk,
    dependencies: opp.dependencies,
    origin: 'opportunity',
  };
}

export function detectBlockers(action: ActionRecord, allActions: ActionRecord[]): string[] {
  const blockers: string[] = [];

  if (action.dependencies.length > 0) {
    for (const depId of action.dependencies) {
      const dep = allActions.find((a) => a.id === depId || a.opportunity_id === depId);
      if (dep && dep.status !== 'completed') {
        blockers.push(`Dependencia no completada: ${dep.title}`);
      }
    }
  }

  if (action.status === 'in_progress' && action.progress === 0) {
    blockers.push('Sin progreso registrado');
  }

  if (action.due_date) {
    const due = new Date(action.due_date);
    const now = new Date();
    if (due < now && action.status !== 'completed' && action.status !== 'cancelled') {
      blockers.push('Fecha límite vencida');
    }
  }

  return blockers;
}

export function recalculatePriority(action: ActionRecord): ActionPriority {
  const urgencyWeight = { high: 3, medium: 2, low: 1 };
  const impactWeight = { high: 3, medium: 2, low: 1 };

  const score = urgencyWeight[action.urgency] + impactWeight[action.impact];

  if (score >= 6) return 'critical';
  if (score >= 5) return 'high';
  if (score >= 3) return 'medium';
  return 'low';
}

export function calculateAvgResolutionTime(actions: ActionRecord[]): number {
  const completed = actions.filter((a) => a.status === 'completed' && a.completed_at && a.created_at);
  if (completed.length === 0) return 0;
  const totalMs = completed.reduce((sum, a) => {
    const created = new Date(a.created_at!).getTime();
    const completedAt = new Date(a.completed_at!).getTime();
    return sum + (completedAt - created);
  }, 0);
  return Math.round(totalMs / completed.length / (1000 * 60 * 60 * 24));
}

export function calculateActionStats(actions: ActionRecord[]) {
  const open = actions.filter((a) => !['completed', 'cancelled'].includes(a.status));
  const critical = actions.filter((a) => a.priority === 'critical' && !['completed', 'cancelled'].includes(a.status));
  const completed = actions.filter((a) => a.status === 'completed');
  const blocked = actions.filter((a) => a.status === 'blocked');
  const avgResolutionDays = calculateAvgResolutionTime(actions);

  const totalRoiValue = actions
    .filter((a) => a.status === 'completed' && a.expected_roi)
    .reduce((sum, a) => {
      const match = a.expected_roi?.match(/€([\d,.]+)/);
      return sum + (match ? parseFloat(match[1].replace(/[,.]/g, '')) : 0);
    }, 0);

  return {
    openCount: open.length,
    criticalCount: critical.length,
    completedCount: completed.length,
    blockedCount: blocked.length,
    avgResolutionDays,
    totalRoiValue,
  };
}

export const NOTIFICATION_TYPES = {
  action_created: 'Acción creada',
  priority_changed: 'Prioridad cambiada',
  assignee_changed: 'Responsable cambiado',
  action_completed: 'Acción completada',
  action_blocked: 'Acción bloqueada',
} as const;
