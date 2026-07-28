export type ActionStatus =
  | 'draft'
  | 'pending'
  | 'assigned'
  | 'in_progress'
  | 'blocked'
  | 'completed'
  | 'cancelled';

export type ActionPriority = 'critical' | 'high' | 'medium' | 'low';
export type ActionImpact = 'high' | 'medium' | 'low';

export interface ActionRecord {
  id: string;
  organization_id: string;
  opportunity_id: string | null;
  user_id: string;
  title: string;
  description: string | null;
  action_type: string;
  origin: 'opportunity' | 'manual';
  priority: ActionPriority;
  expected_impact: string | null;
  expected_roi: string | null;
  status: ActionStatus;
  assigned_to: string | null;
  progress: number;
  due_date: string | null;
  impact: ActionImpact;
  urgency: ActionImpact;
  effort: ActionImpact;
  risk: ActionImpact;
  dependencies: string[];
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  scheduled_for: string | null;
  org_name?: string;
  assignee_name?: string | null;
  opportunity_title?: string | null;
}

export interface ActionHistoryEntry {
  id: string;
  action_id: string;
  organization_id: string;
  user_id: string;
  user_email: string | null;
  action: string;
  action_label: string | null;
  from_status: ActionStatus | null;
  to_status: ActionStatus | null;
  comment: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface ActionComment {
  id: string;
  action_id: string;
  organization_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author_name?: string | null;
}

export interface ActionAssignment {
  id: string;
  action_id: string;
  assigned_to: string;
  assigned_by: string;
  created_at: string;
}

export interface ActionNotification {
  id: string;
  organization_id: string;
  action_id: string;
  user_id: string;
  type: 'action_created' | 'priority_changed' | 'assignee_changed' | 'action_completed' | 'action_blocked';
  message: string | null;
  read: boolean;
  created_at: string;
  action_title?: string | null;
}

export const ACTION_STATUS_INFO: Record<ActionStatus, { label: string; color: string; icon: string }> = {
  draft:       { label: 'Borrador',       color: 'bg-neutral-500/15 text-neutral-400 border-neutral-500/20', icon: 'FileEdit' },
  pending:     { label: 'Pendiente',      color: 'bg-warning-500/15 text-warning-400 border-warning-500/20', icon: 'Clock' },
  assigned:    { label: 'Asignada',       color: 'bg-brand-500/15 text-brand-400 border-brand-500/20', icon: 'UserCheck' },
  in_progress: { label: 'En progreso',    color: 'bg-accent-500/15 text-accent-400 border-accent-500/20', icon: 'Loader' },
  blocked:     { label: 'Bloqueada',      color: 'bg-error-500/15 text-error-400 border-error-500/20', icon: 'AlertOctagon' },
  completed:   { label: 'Completada',     color: 'bg-success-500/15 text-success-400 border-success-500/20', icon: 'CheckCircle' },
  cancelled:   { label: 'Cancelada',      color: 'bg-neutral-500/15 text-neutral-500 border-neutral-500/20', icon: 'XCircle' },
};

export const ACTION_PRIORITY_INFO: Record<ActionPriority, { label: string; color: string }> = {
  critical: { label: 'Crítica', color: 'bg-error-500/15 text-error-400 border-error-500/20' },
  high:     { label: 'Alta',    color: 'bg-warning-500/15 text-warning-400 border-warning-500/20' },
  medium:   { label: 'Media',   color: 'bg-brand-500/15 text-brand-400 border-brand-500/20' },
  low:      { label: 'Baja',    color: 'bg-neutral-500/15 text-neutral-400 border-neutral-500/20' },
};

export const ACTION_TRANSITIONS: Record<ActionStatus, ActionStatus[]> = {
  draft:       ['pending', 'cancelled'],
  pending:     ['assigned', 'in_progress', 'cancelled'],
  assigned:    ['in_progress', 'blocked', 'cancelled'],
  in_progress: ['blocked', 'completed', 'cancelled'],
  blocked:     ['in_progress', 'cancelled'],
  completed:   [],
  cancelled:   [],
};

export function canTransitionTo(from: ActionStatus, to: ActionStatus): boolean {
  return ACTION_TRANSITIONS[from]?.includes(to) ?? false;
}
