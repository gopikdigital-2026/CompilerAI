import {
  Clock, UserCheck, Loader, AlertOctagon, CheckCircle, XCircle,
  FileEdit, TrendingUp, Calendar, ArrowRight,
} from 'lucide-react';
import type { ActionStatus } from '../../types/action';
import { ACTION_STATUS_INFO } from '../../types/action';

const ICONS: Record<string, typeof Clock> = {
  draft: FileEdit,
  pending: Clock,
  assigned: UserCheck,
  in_progress: Loader,
  blocked: AlertOctagon,
  completed: CheckCircle,
  cancelled: XCircle,
};

interface ActionStatusBadgeProps {
  status: ActionStatus;
  size?: 'sm' | 'md';
}

export function ActionStatusBadge({ status, size = 'sm' }: ActionStatusBadgeProps) {
  const info = ACTION_STATUS_INFO[status];
  const Icon = ICONS[status] ?? Clock;
  const sizeClasses = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1';
  return (
    <span
      data-testid={`action-status-${status}`}
      className={`inline-flex items-center gap-1 rounded border ${info.color} ${sizeClasses}`}
    >
      <Icon size={size === 'sm' ? 10 : 12} className={status === 'in_progress' ? 'animate-spin' : ''} />
      {info.label}
    </span>
  );
}

interface ActionPriorityBadgeProps {
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export function ActionPriorityBadge({ priority }: ActionPriorityBadgeProps) {
  const colors: Record<string, string> = {
    critical: 'bg-error-500/15 text-error-400 border-error-500/20',
    high: 'bg-warning-500/15 text-warning-400 border-warning-500/20',
    medium: 'bg-brand-500/15 text-brand-400 border-brand-500/20',
    low: 'bg-neutral-500/15 text-neutral-400 border-neutral-500/20',
  };
  const labels: Record<string, string> = {
    critical: 'Crítica', high: 'Alta', medium: 'Media', low: 'Baja',
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${colors[priority]}`}>
      {labels[priority]}
    </span>
  );
}

interface ActionCardProps {
  action: import('../../types/action').ActionRecord;
  onClick: () => void;
}

export function ActionCard({ action, onClick }: ActionCardProps) {
  const dueDate = action.due_date ? new Date(action.due_date) : null;
  const isOverdue = dueDate && dueDate < new Date() && !['completed', 'cancelled'].includes(action.status);

  return (
    <button
      data-testid="action-card"
      onClick={onClick}
      className="card p-4 text-left hover:border-surface-600 transition-colors w-full"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-neutral-200 truncate">{action.title}</p>
            <ActionPriorityBadge priority={action.priority} />
          </div>
          {action.description && (
            <p className="text-xs text-neutral-500 mt-1 line-clamp-2">{action.description}</p>
          )}
        </div>
        <ActionStatusBadge status={action.status} />
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs mt-3">
        <div className="flex items-center gap-1.5">
          <TrendingUp size={11} className="text-brand-400" />
          <span className="text-neutral-600">ROI</span>
          <span className="text-neutral-300 truncate">{action.expected_roi ?? '—'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <UserCheck size={11} className="text-neutral-500" />
          <span className="text-neutral-600">Resp.</span>
          <span className="text-neutral-300 truncate">{action.assignee_name ?? 'Sin asignar'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar size={11} className={isOverdue ? 'text-error-400' : 'text-neutral-500'} />
          <span className="text-neutral-600">Límite</span>
          <span className={`truncate ${isOverdue ? 'text-error-400' : 'text-neutral-300'}`}>
            {action.due_date ? new Date(action.due_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : '—'}
          </span>
        </div>
      </div>

      {action.progress > 0 && action.status !== 'completed' && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-[10px] text-neutral-600 mb-1">
            <span>Progreso</span>
            <span>{action.progress}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-surface-700 overflow-hidden">
            <div
              className="h-full bg-brand-500 rounded-full transition-all"
              style={{ width: `${action.progress}%` }}
              role="progressbar"
              aria-valuenow={action.progress}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>
      )}

      {action.opportunity_title && (
        <div className="mt-2 pt-2 border-t border-surface-700 flex items-center gap-1.5 text-[10px] text-neutral-600">
          <ArrowRight size={10} />
          <span>Desde: {action.opportunity_title}</span>
        </div>
      )}
    </button>
  );
}
