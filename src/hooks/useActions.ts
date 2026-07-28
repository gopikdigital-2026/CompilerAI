import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { useOrganization } from './useOrganization';
import {
  fetchActions, createAction, updateActionStatus, updateActionProgress,
  assignAction, updateActionPriority, fetchActionHistory, fetchActionComments,
  addActionComment, fetchNotifications, markNotificationRead, markAllNotificationsRead,
} from '../services/actions.service';
import type { ActionRecord, ActionStatus, ActionNotification } from '../types/action';
import type { CreateActionInput } from '../lib/actionEngine';

export function useActions() {
  const { user } = useAuth();
  const { activeOrg, members } = useOrganization();
  const [actions, setActions] = useState<ActionRecord[]>([]);
  const [notifications, setNotifications] = useState<ActionNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const orgId = activeOrg?.id ?? null;

  const refresh = useCallback(async () => {
    if (!orgId) { setActions([]); setLoading(false); return; }
    setLoading(true);
    try {
      const [acts, notifs] = await Promise.all([
        fetchActions(orgId),
        user ? fetchNotifications(user.id) : Promise.resolve([]),
      ]);
      setActions(acts);
      setNotifications(notifs);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [orgId, user]);

  useEffect(() => { refresh(); }, [refresh]);

  const create = useCallback(async (input: Omit<CreateActionInput, 'organizationId' | 'userId'>) => {
    if (!orgId || !user) return;
    const action = await createAction({ ...input, organizationId: orgId, userId: user.id });
    setActions((prev) => [action, ...prev]);
    await refresh();
    return action;
  }, [orgId, user, refresh]);

  const changeStatus = useCallback(async (actionId: string, status: ActionStatus, comment?: string) => {
    if (!orgId || !user) return;
    await updateActionStatus(actionId, orgId, user.id, status, comment);
    await refresh();
  }, [orgId, user, refresh]);

  const changeProgress = useCallback(async (actionId: string, progress: number) => {
    if (!orgId || !user) return;
    await updateActionProgress(actionId, orgId, user.id, progress);
    setActions((prev) => prev.map((a) => a.id === actionId ? { ...a, progress } : a));
  }, [orgId, user]);

  const assign = useCallback(async (actionId: string, assigneeId: string) => {
    if (!orgId || !user) return;
    await assignAction(actionId, orgId, user.id, assigneeId);
    await refresh();
  }, [orgId, user, refresh]);

  const changePriority = useCallback(async (actionId: string, priority: string) => {
    if (!orgId || !user) return;
    await updateActionPriority(actionId, orgId, user.id, priority);
    await refresh();
  }, [orgId, user, refresh]);

  const getHistory = useCallback(async (actionId: string) => {
    return fetchActionHistory(actionId);
  }, []);

  const getComments = useCallback(async (actionId: string) => {
    return fetchActionComments(actionId);
  }, []);

  const addComment = useCallback(async (actionId: string, content: string) => {
    if (!orgId || !user) return;
    await addActionComment(actionId, orgId, user.id, content);
  }, [orgId, user]);

  const markRead = useCallback(async (notificationId: string) => {
    await markNotificationRead(notificationId);
    setNotifications((prev) => prev.map((n) => n.id === notificationId ? { ...n, read: true } : n));
  }, []);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    await markAllNotificationsRead(user.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, [user]);

  return {
    actions, notifications, members, loading, error,
    create, changeStatus, changeProgress, assign, changePriority,
    getHistory, getComments, addComment,
    markRead, markAllRead, refresh,
  };
}
