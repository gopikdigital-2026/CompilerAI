import { useState, useMemo } from 'react';
import {
  ListTodo, Filter, Bell, CheckCircle2, AlertOctagon,
  TrendingUp, Clock, DollarSign, Loader2, X,
} from 'lucide-react';
import { useActions } from '../../hooks/useActions';
import { useAuth } from '../../hooks/useAuth';
import { useOrganization } from '../../hooks/useOrganization';
import { calculateActionStats, detectBlockers } from '../../lib/actionEngine';
import { ActionCard } from '../../components/action/ActionCard';
import { ActionDetailModal } from '../../components/action/ActionDetailModal';
import { ReportStateView } from '../../components/analysis/ReportStateView';
import type { ActionRecord, ActionStatus } from '../../types/action';
import type { OrgMember } from '../../types/database';

type StatusFilter = ActionStatus | 'all';
type PriorityFilter = 'critical' | 'high' | 'medium' | 'low' | 'all';

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'pending', label: 'Pendientes' },
  { id: 'assigned', label: 'Asignadas' },
  { id: 'in_progress', label: 'En progreso' },
  { id: 'blocked', label: 'Bloqueadas' },
  { id: 'completed', label: 'Completadas' },
];

const PRIORITY_FILTERS: { id: PriorityFilter; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'critical', label: 'Críticas' },
  { id: 'high', label: 'Altas' },
  { id: 'medium', label: 'Medias' },
  { id: 'low', label: 'Bajas' },
];

interface StatWidgetProps {
  label: string;
  value: string | number;
  icon: typeof ListTodo;
  color: string;
  testId: string;
}

function StatWidget({ label, value, icon: Icon, color, testId }: StatWidgetProps) {
  return (
    <div data-testid={testId} className="card p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={18} />
        </div>
        <div>
          <p className="text-2xl font-bold text-neutral-100">{value}</p>
          <p className="text-xs text-neutral-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

export function ActionCenter() {
  const { user } = useAuth();
  const { activeOrg, members } = useOrganization();
  const {
    actions, notifications, loading, error,
    create, changeStatus, changeProgress, assign, changePriority,
    getHistory, getComments, addComment, markRead, markAllRead, refresh,
  } = useActions();

  const [selectedAction, setSelectedAction] = useState<ActionRecord | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);

  const stats = useMemo(() => calculateActionStats(actions), [actions]);
  const allBlockers = useMemo(() => {
    const blocked: { action: ActionRecord; blockers: string[] }[] = [];
    for (const a of actions) {
      const bl = detectBlockers(a, actions);
      if (bl.length > 0) blocked.push({ action: a, blockers: bl });
    }
    return blocked;
  }, [actions]);

  const filteredActions = useMemo(() => {
    return actions.filter((a) => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && a.priority !== priorityFilter) return false;
      if (searchQuery && !a.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [actions, statusFilter, priorityFilter, searchQuery]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const memberList: OrgMember[] = members;

  if (loading) {
    return (
      <div data-testid="action-center" className="p-6">
        <ReportStateView state="generating" />
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid="action-center" className="p-6">
        <ReportStateView state="backend_error" onAction={refresh} />
      </div>
    );
  }

  if (!activeOrg) {
    return (
      <div data-testid="action-center" className="p-6">
        <ReportStateView state="no_organization" onAction={() => window.location.hash = '/dashboard'} />
      </div>
    );
  }

  return (
    <div data-testid="action-center" className="p-6 space-y-5 animate-fade-in max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-gradient flex items-center justify-center">
            <ListTodo size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-neutral-100">Action Center</h1>
            <p className="text-xs text-neutral-500">Acciones generadas por CompilerAI</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            data-testid="notifications-toggle"
            onClick={() => setShowNotifications(!showNotifications)}
            className="btn-ghost text-xs flex items-center gap-1.5 relative"
            aria-label="Notificaciones"
          >
            <Bell size={14} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-error-500 text-[9px] text-white flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
          <button onClick={refresh} className="btn-ghost text-xs" aria-label="Actualizar">
            Actualizar
          </button>
        </div>
      </div>

      {/* Notifications panel */}
      {showNotifications && (
        <div data-testid="notifications-panel" className="card p-4 space-y-2 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-neutral-200">Notificaciones</h3>
            {unreadCount > 0 && (
              <button
                data-testid="mark-all-read"
                onClick={markAllRead}
                className="text-xs text-brand-400 hover:text-brand-300"
              >
                Marcar todas como leídas
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <p className="text-xs text-neutral-600 py-4 text-center">Sin notificaciones.</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {notifications.slice(0, 20).map((n) => (
                <button
                  key={n.id}
                  data-testid="notification-item"
                  onClick={() => markRead(n.id)}
                  className={`w-full text-left p-2 rounded text-xs flex items-start gap-2 ${
                    n.read ? 'bg-surface-800/50' : 'bg-brand-500/5 border border-brand-500/20'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${n.read ? 'bg-neutral-600' : 'bg-brand-500'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-neutral-300">{n.message}</p>
                    <p className="text-[10px] text-neutral-600">{new Date(n.created_at).toLocaleString('es-ES')}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Dashboard widgets */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatWidget
          label="Acciones abiertas"
          value={stats.openCount}
          icon={ListTodo}
          color="bg-brand-500/15 text-brand-400"
          testId="widget-open"
        />
        <StatWidget
          label="Críticas"
          value={stats.criticalCount}
          icon={AlertOctagon}
          color="bg-error-500/15 text-error-400"
          testId="widget-critical"
        />
        <StatWidget
          label="Completadas"
          value={stats.completedCount}
          icon={CheckCircle2}
          color="bg-success-500/15 text-success-400"
          testId="widget-completed"
        />
        <StatWidget
          label="ROI esperado"
          value={`€${(stats.totalRoiValue / 1000).toFixed(1)}K`}
          icon={DollarSign}
          color="bg-accent-500/15 text-accent-400"
          testId="widget-roi"
        />
        <StatWidget
          label="Tiempo medio (días)"
          value={stats.avgResolutionDays || '—'}
          icon={Clock}
          color="bg-warning-500/15 text-warning-400"
          testId="widget-avg-time"
        />
      </div>

      {/* Blockers alert */}
      {allBlockers.length > 0 && (
        <div data-testid="blockers-alert" className="card p-3 border-error-500/20 bg-error-500/5">
          <div className="flex items-center gap-2 text-xs text-error-400 mb-2">
            <AlertOctagon size={14} />
            <span className="font-medium">{allBlockers.length} acción(es) bloqueada(s)</span>
          </div>
          <div className="space-y-1">
            {allBlockers.slice(0, 3).map(({ action, blockers }) => (
              <div key={action.id} className="text-xs text-neutral-400">
                <span className="text-neutral-300">{action.title}:</span> {blockers.join(', ')}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card p-3 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={14} className="text-neutral-500" />
          <span className="text-xs text-neutral-600">Estado:</span>
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              data-testid={`status-filter-${f.id}`}
              onClick={() => setStatusFilter(f.id)}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                statusFilter === f.id
                  ? 'bg-brand-500/15 text-brand-400 border border-brand-500/20'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <TrendingUp size={14} className="text-neutral-500" />
          <span className="text-xs text-neutral-600">Prioridad:</span>
          {PRIORITY_FILTERS.map((f) => (
            <button
              key={f.id}
              data-testid={`priority-filter-${f.id}`}
              onClick={() => setPriorityFilter(f.id)}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                priorityFilter === f.id
                  ? 'bg-brand-500/15 text-brand-400 border border-brand-500/20'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar acción..."
          className="input text-xs"
          data-testid="action-search"
          aria-label="Buscar acciones"
        />
      </div>

      {/* Action list */}
      {filteredActions.length === 0 ? (
        <div className="card p-8 flex flex-col items-center justify-center text-center min-h-[200px]">
          <ListTodo size={32} className="text-neutral-600 mb-3" />
          <p className="text-sm font-medium text-neutral-300 mb-1">
            {actions.length === 0 ? 'No hay acciones todavía' : 'No hay acciones que coincidan con los filtros'}
          </p>
          <p className="text-xs text-neutral-500">
            {actions.length === 0
              ? 'Aprueba una oportunidad desde el análisis para crear tu primera acción.'
              : 'Prueba a cambiar los filtros.'}
          </p>
        </div>
      ) : (
        <div data-testid="action-list" className="grid md:grid-cols-2 gap-3">
          {filteredActions.map((action) => (
            <ActionCard key={action.id} action={action} onClick={() => setSelectedAction(action)} />
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selectedAction && (
        <ActionDetailModal
          action={selectedAction}
          members={memberList}
          onClose={() => setSelectedAction(null)}
          onStatusChange={changeStatus}
          onProgressChange={changeProgress}
          onAssign={assign}
          onPriorityChange={changePriority}
          onAddComment={addComment}
          onFetchHistory={getHistory}
          onFetchComments={getComments}
        />
      )}
    </div>
  );
}
