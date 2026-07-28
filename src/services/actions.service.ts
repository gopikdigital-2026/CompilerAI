import { supabase } from '../lib/supabase';
import { track } from '../lib/telemetry';
import { logger } from '../lib/logger';
import type {
  ActionRecord, ActionStatus, ActionHistoryEntry, ActionComment, ActionNotification,
} from '../types/action';
import type { CreateActionInput } from '../lib/actionEngine';

export async function fetchActions(orgId: string): Promise<ActionRecord[]> {
  const { data, error } = await supabase
    .from('action_plans')
    .select(`
      *,
      organizations!inner(name),
      profiles:assigned_to(full_name),
      business_opportunities(title)
    `)
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });
  if (error) { logger.supabaseError('fetchActions', error); throw error; }
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: row.id as string,
    organization_id: row.organization_id as string,
    opportunity_id: row.opportunity_id as string | null,
    user_id: row.user_id as string,
    title: row.title as string,
    description: row.description as string | null,
    action_type: row.action_type as string,
    origin: (row.origin as 'opportunity' | 'manual') ?? 'manual',
    priority: row.priority as ActionRecord['priority'],
    expected_impact: row.expected_impact as string | null,
    expected_roi: row.expected_roi as string | null,
    status: row.status as ActionStatus,
    assigned_to: row.assigned_to as string | null,
    progress: row.progress as number,
    due_date: row.due_date as string | null,
    impact: row.impact as ActionRecord['impact'],
    urgency: row.urgency as ActionRecord['urgency'],
    effort: row.effort as ActionRecord['effort'],
    risk: row.risk as ActionRecord['risk'],
    dependencies: (row.dependencies as string[]) ?? [],
    metadata: row.metadata as Record<string, unknown> | null,
    created_at: row.created_at as string,
    updated_at: (row.updated_at as string) ?? row.created_at as string,
    completed_at: row.completed_at as string | null,
    scheduled_for: row.scheduled_for as string | null,
    org_name: (row.organizations as Record<string, unknown>)?.name as string | undefined,
    assignee_name: (row.profiles as Record<string, unknown>)?.full_name as string | null,
    opportunity_title: (row.business_opportunities as Record<string, unknown>)?.title as string | null,
  }));
}

export async function createAction(input: CreateActionInput): Promise<ActionRecord> {
  const insertData = {
    organization_id: input.organizationId,
    opportunity_id: input.opportunityId ?? null,
    user_id: input.userId,
    title: input.title,
    description: input.description ?? null,
    action_type: 'execute',
    origin: input.origin ?? 'manual',
    priority: input.priority ?? 'medium',
    expected_impact: input.expectedImpact ?? null,
    expected_roi: input.expectedRoi ?? null,
    status: 'pending',
    impact: input.impact ?? 'medium',
    urgency: input.urgency ?? 'medium',
    effort: input.effort ?? 'medium',
    risk: input.risk ?? 'low',
    dependencies: input.dependencies ?? [],
    due_date: input.dueDate ?? null,
  };

  const { data, error } = await supabase
    .from('action_plans')
    .insert(insertData)
    .select()
    .single();
  if (error) { logger.supabaseError('createAction', error); throw error; }

  const action = data as ActionRecord;
  track('action_created', { action_id: action.id, origin: input.origin });

  await supabase.from('action_history').insert({
    action_id: action.id,
    organization_id: input.organizationId,
    user_id: input.userId,
    action: 'action_created',
    action_label: 'Acción creada',
    to_status: 'pending',
    comment: null,
  });

  await createActionNotification(
    input.organizationId,
    action.id,
    input.userId,
    'action_created',
    `Nueva acción creada: ${input.title}`,
  );

  return action;
}

export async function updateActionStatus(
  actionId: string,
  orgId: string,
  userId: string,
  newStatus: ActionStatus,
  comment?: string,
): Promise<void> {
  const { data: current } = await supabase
    .from('action_plans')
    .select('status, title')
    .eq('id', actionId)
    .maybeSingle();
  if (!current) throw new Error('Action not found');

  const fromStatus = current.status as ActionStatus;

  const { error } = await supabase
    .from('action_plans')
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
      completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
    })
    .eq('id', actionId);
  if (error) { logger.supabaseError('updateActionStatus', error); throw error; }

  await supabase.from('action_history').insert({
    action_id: actionId,
    organization_id: orgId,
    user_id: userId,
    action: 'status_changed',
    action_label: 'Cambio de estado',
    from_status: fromStatus,
    to_status: newStatus,
    comment: comment ?? null,
  });

  track('action_status_changed', { action_id: actionId, from: fromStatus, to: newStatus });

  if (newStatus === 'completed') {
    await createActionNotification(orgId, actionId, userId, 'action_completed', `Acción completada: ${current.title}`);
  } else if (newStatus === 'blocked') {
    await createActionNotification(orgId, actionId, userId, 'action_blocked', `Acción bloqueada: ${current.title}`);
  }
}

export async function updateActionProgress(
  actionId: string,
  orgId: string,
  userId: string,
  progress: number,
): Promise<void> {
  const clamped = Math.max(0, Math.min(100, progress));
  const { error } = await supabase
    .from('action_plans')
    .update({
      progress: clamped,
      updated_at: new Date().toISOString(),
      status: clamped === 100 ? 'completed' : clamped > 0 ? 'in_progress' : undefined,
      completed_at: clamped === 100 ? new Date().toISOString() : null,
    })
    .eq('id', actionId);
  if (error) { logger.supabaseError('updateActionProgress', error); throw error; }

  track('action_progress_updated', { action_id: actionId, progress: clamped });
}

export async function assignAction(
  actionId: string,
  orgId: string,
  assignedBy: string,
  assigneeId: string,
): Promise<void> {
  const { error: updateError } = await supabase
    .from('action_plans')
    .update({
      assigned_to: assigneeId,
      status: 'assigned',
      updated_at: new Date().toISOString(),
    })
    .eq('id', actionId);
  if (updateError) { logger.supabaseError('assignAction', updateError); throw updateError; }

  await supabase.from('action_assignments').insert({
    action_id: actionId,
    organization_id: orgId,
    assigned_to: assigneeId,
    assigned_by: assignedBy,
  });

  const { data: action } = await supabase
    .from('action_plans')
    .select('title')
    .eq('id', actionId)
    .maybeSingle();

  await supabase.from('action_history').insert({
    action_id: actionId,
    organization_id: orgId,
    user_id: assignedBy,
    action: 'assignee_changed',
    action_label: 'Responsable asignado',
    comment: `Asignado a ${assigneeId}`,
  });

  await createActionNotification(orgId, actionId, assigneeId, 'assignee_changed', `Asignada: ${action?.title ?? ''}`);

  track('action_assigned', { action_id: actionId, assignee: assigneeId });
}

export async function updateActionPriority(
  actionId: string,
  orgId: string,
  userId: string,
  newPriority: string,
): Promise<void> {
  const { error } = await supabase
    .from('action_plans')
    .update({ priority: newPriority, updated_at: new Date().toISOString() })
    .eq('id', actionId);
  if (error) { logger.supabaseError('updateActionPriority', error); throw error; }

  await supabase.from('action_history').insert({
    action_id: actionId,
    organization_id: orgId,
    user_id: userId,
    action: 'priority_changed',
    action_label: 'Prioridad cambiada',
    comment: `Nueva prioridad: ${newPriority}`,
  });

  const { data: action } = await supabase
    .from('action_plans')
    .select('assigned_to, title')
    .eq('id', actionId)
    .maybeSingle();

  if (action?.assigned_to) {
    await createActionNotification(orgId, actionId, action.assigned_to, 'priority_changed', `Prioridad actualizada: ${action.title}`);
  }

  track('action_priority_changed', { action_id: actionId, priority: newPriority });
}

export async function fetchActionHistory(actionId: string): Promise<ActionHistoryEntry[]> {
  const { data, error } = await supabase
    .from('action_history')
    .select('*')
    .eq('action_id', actionId)
    .order('created_at', { ascending: true });
  if (error) { logger.supabaseError('fetchActionHistory', error); throw error; }
  return (data ?? []) as ActionHistoryEntry[];
}

export async function fetchActionComments(actionId: string): Promise<ActionComment[]> {
  const { data, error } = await supabase
    .from('action_comments')
    .select('*, profiles:user_id(full_name)')
    .eq('action_id', actionId)
    .order('created_at', { ascending: true });
  if (error) { logger.supabaseError('fetchActionComments', error); throw error; }
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: row.id as string,
    action_id: row.action_id as string,
    organization_id: row.organization_id as string,
    user_id: row.user_id as string,
    content: row.content as string,
    created_at: row.created_at as string,
    author_name: (row.profiles as Record<string, unknown>)?.full_name as string | null,
  }));
}

export async function addActionComment(
  actionId: string,
  orgId: string,
  userId: string,
  content: string,
): Promise<void> {
  const { error } = await supabase
    .from('action_comments')
    .insert({
      action_id: actionId,
      organization_id: orgId,
      user_id: userId,
      content,
    });
  if (error) { logger.supabaseError('addActionComment', error); throw error; }
}

export async function fetchNotifications(userId: string): Promise<ActionNotification[]> {
  const { data, error } = await supabase
    .from('action_notifications')
    .select('*, action_plans(title)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) { logger.supabaseError('fetchNotifications', error); throw error; }
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: row.id as string,
    organization_id: row.organization_id as string,
    action_id: row.action_id as string,
    user_id: row.user_id as string,
    type: row.type as ActionNotification['type'],
    message: row.message as string | null,
    read: row.read as boolean,
    created_at: row.created_at as string,
    action_title: (row.action_plans as Record<string, unknown>)?.title as string | null,
  }));
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('action_notifications')
    .update({ read: true })
    .eq('id', notificationId);
  if (error) { logger.supabaseError('markNotificationRead', error); throw error; }
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('action_notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);
  if (error) { logger.supabaseError('markAllNotificationsRead', error); throw error; }
}

async function createActionNotification(
  orgId: string,
  actionId: string,
  userId: string,
  type: ActionNotification['type'],
  message: string,
): Promise<void> {
  await supabase.from('action_notifications').insert({
    organization_id: orgId,
    action_id: actionId,
    user_id: userId,
    type,
    message,
  });
}
