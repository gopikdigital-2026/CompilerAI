import { useState, useEffect, useCallback } from 'react';
import {
  X, Clock, UserCheck, AlertOctagon, CheckCircle, XCircle,
  Play, MessageSquare, History, Send, TrendingUp, DollarSign,
  AlertTriangle, Link2, Calendar,
} from 'lucide-react';
import type { ActionRecord, ActionStatus, ActionHistoryEntry, ActionComment } from '../../types/action';
import { ACTION_STATUS_INFO, canTransitionTo } from '../../types/action';
import { ActionStatusBadge, ActionPriorityBadge } from './ActionCard';

interface ActionDetailModalProps {
  action: ActionRecord;
  members: { id: string; profile: { full_name: string } }[];
  onClose: () => void;
  onStatusChange: (id: string, status: ActionStatus, comment?: string) => Promise<void>;
  onProgressChange: (id: string, progress: number) => Promise<void>;
  onAssign: (id: string, assigneeId: string) => Promise<void>;
  onPriorityChange: (id: string, priority: string) => Promise<void>;
  onAddComment: (id: string, content: string) => Promise<void>;
  onFetchHistory: (id: string) => Promise<ActionHistoryEntry[]>;
  onFetchComments: (id: string) => Promise<ActionComment[]>;
}

type DetailTab = 'overview' | 'history' | 'comments';

export function ActionDetailModal({
  action, members, onClose,
  onStatusChange, onProgressChange, onAssign, onPriorityChange, onAddComment,
  onFetchHistory, onFetchComments,
}: ActionDetailModalProps) {
  const [tab, setTab] = useState<DetailTab>('overview');
  const [history, setHistory] = useState<ActionHistoryEntry[]>([]);
  const [comments, setComments] = useState<ActionComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [statusComment, setStatusComment] = useState('');
  const [showStatusDialog, setShowStatusDialog] = useState<ActionStatus | null>(null);
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');

  const loadHistory = useCallback(async () => {
    try { setHistory(await onFetchHistory(action.id)); } catch { setHistory([]); }
  }, [action.id, onFetchHistory]);

  const loadComments = useCallback(async () => {
    try { setComments(await onFetchComments(action.id)); } catch { setComments([]); }
  }, [action.id, onFetchComments]);

  useEffect(() => {
    if (tab === 'history') loadHistory();
    if (tab === 'comments') loadComments();
  }, [tab, loadHistory, loadComments]);

  const availableStatuses: ActionStatus[] = ['pending', 'assigned', 'in_progress', 'blocked', 'completed', 'cancelled'];

  const handleStatusChange = async () => {
    if (!showStatusDialog) return;
    await onStatusChange(action.id, showStatusDialog, statusComment || undefined);
    setShowStatusDialog(null);
    setStatusComment('');
    await loadHistory();
  };

  const handleAssign = async () => {
    if (!selectedAssignee) return;
    await onAssign(action.id, selectedAssignee);
    setSelectedAssignee('');
    await loadHistory();
  };

  const handlePriority = async () => {
    if (!selectedPriority) return;
    await onPriorityChange(action.id, selectedPriority);
    setSelectedPriority('');
    await loadHistory();
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    await onAddComment(action.id, commentText.trim());
    setCommentText('');
    await loadComments();
  };

  return (
    <div
      data-testid="action-detail-modal"
      role="dialog"
      aria-modal="true"
      aria-label={`Detalle de acción: ${action.title}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-surface-700">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h2 className="text-base font-semibold text-neutral-100">{action.title}</h2>
              <ActionPriorityBadge priority={action.priority} />
              <ActionStatusBadge status={action.status} size="md" />
            </div>
            {action.description && <p className="text-sm text-neutral-500">{action.description}</p>}
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-300 flex-shrink-0" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-5 border-b border-surface-700">
          {([
            { id: 'overview' as const, label: 'Resumen', icon: TrendingUp },
            { id: 'history' as const, label: 'Historial', icon: History },
            { id: 'comments' as const, label: 'Comentarios', icon: MessageSquare },
          ]).map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                data-testid={`action-tab-${t.id}`}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs border-b-2 transition-colors ${
                  tab === t.id ? 'border-brand-500 text-brand-400' : 'border-transparent text-neutral-500 hover:text-neutral-300'
                }`}
              >
                <Icon size={12} /> {t.label}
                {t.id === 'comments' && comments.length > 0 && (
                  <span className="text-[9px] px-1 rounded bg-surface-700 text-neutral-500">{comments.length}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'overview' && (
            <div data-testid="action-overview" className="space-y-4">
              {/* Metrics grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="card p-3">
                  <div className="flex items-center gap-1.5 text-xs text-neutral-600 mb-1">
                    <DollarSign size={11} /> ROI esperado
                  </div>
                  <p className="text-sm text-neutral-200">{action.expected_roi ?? '—'}</p>
                </div>
                <div className="card p-3">
                  <div className="flex items-center gap-1.5 text-xs text-neutral-600 mb-1">
                    <TrendingUp size={11} /> Impacto esperado
                  </div>
                  <p className="text-sm text-neutral-200">{action.expected_impact ?? '—'}</p>
                </div>
                <div className="card p-3">
                  <div className="flex items-center gap-1.5 text-xs text-neutral-600 mb-1">
                    <AlertTriangle size={11} /> Riesgo
                  </div>
                  <p className="text-sm text-neutral-200 capitalize">{action.risk}</p>
                </div>
                <div className="card p-3">
                  <div className="flex items-center gap-1.5 text-xs text-neutral-600 mb-1">
                    <Calendar size={11} /> Fecha límite
                  </div>
                  <p className="text-sm text-neutral-200">
                    {action.due_date ? new Date(action.due_date).toLocaleDateString('es-ES') : 'Sin fecha'}
                  </p>
                </div>
              </div>

              {/* Origin */}
              {action.opportunity_title && (
                <div className="card p-3 flex items-center gap-2 text-xs">
                  <Link2 size={12} className="text-brand-400" />
                  <span className="text-neutral-600">Oportunidad origen:</span>
                  <span className="text-neutral-300">{action.opportunity_title}</span>
                </div>
              )}

              {/* Progress slider */}
              {action.status !== 'completed' && action.status !== 'cancelled' && (
                <div className="card p-3">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-neutral-600">Progreso</span>
                    <span className="text-neutral-300">{action.progress}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={action.progress}
                    onChange={(e) => onProgressChange(action.id, parseInt(e.target.value))}
                    className="w-full accent-brand-500"
                    data-testid="action-progress-slider"
                    aria-label="Progreso de la acción"
                  />
                </div>
              )}

              {/* Assignment */}
              <div className="card p-3 space-y-2">
                <div className="text-xs text-neutral-600">Responsable</div>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedAssignee}
                    onChange={(e) => setSelectedAssignee(e.target.value)}
                    className="input flex-1 text-xs"
                    data-testid="action-assignee-select"
                    aria-label="Seleccionar responsable"
                  >
                    <option value="">{action.assignee_name ?? 'Sin asignar'}</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>{m.profile.full_name}</option>
                    ))}
                  </select>
                  {selectedAssignee && (
                    <button
                      data-testid="action-assign-confirm"
                      onClick={handleAssign}
                      className="btn-primary text-xs"
                    >
                      Asignar
                    </button>
                  )}
                </div>
              </div>

              {/* Priority */}
              <div className="card p-3 space-y-2">
                <div className="text-xs text-neutral-600">Prioridad</div>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(e.target.value)}
                    className="input flex-1 text-xs"
                    data-testid="action-priority-select"
                    aria-label="Cambiar prioridad"
                  >
                    <option value="">{ACTION_STATUS_INFO[action.status]?.label ?? action.priority}</option>
                    <option value="critical">Crítica</option>
                    <option value="high">Alta</option>
                    <option value="medium">Media</option>
                    <option value="low">Baja</option>
                  </select>
                  {selectedPriority && (
                    <button
                      data-testid="action-priority-confirm"
                      onClick={handlePriority}
                      className="btn-primary text-xs"
                    >
                      Cambiar
                    </button>
                  )}
                </div>
              </div>

              {/* Status transitions */}
              <div className="card p-3 space-y-2">
                <div className="text-xs text-neutral-600">Cambiar estado</div>
                <div className="flex flex-wrap gap-2">
                  {availableStatuses
                    .filter((s) => s !== action.status && canTransitionTo(action.status, s))
                    .map((s) => {
                      const info = ACTION_STATUS_INFO[s];
                      return (
                        <button
                          key={s}
                          data-testid={`action-transition-${s}`}
                          onClick={() => setShowStatusDialog(s)}
                          className={`text-xs px-2 py-1 rounded border ${info.color} hover:opacity-80 transition-opacity`}
                        >
                          {info.label}
                        </button>
                      );
                    })}
                  {availableStatuses.filter((s) => s !== action.status && canTransitionTo(action.status, s)).length === 0 && (
                    <p className="text-xs text-neutral-600">No hay transiciones disponibles desde este estado.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === 'history' && (
            <div data-testid="action-history" className="space-y-3">
              {history.length === 0 ? (
                <p className="text-xs text-neutral-600 text-center py-8">Sin historial todavía.</p>
              ) : (
                <ol className="space-y-3">
                  {history.map((entry) => (
                    <li key={entry.id} data-testid="history-entry" className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-neutral-300">{entry.action_label ?? entry.action}</span>
                          <time className="text-[10px] text-neutral-600">
                            {new Date(entry.created_at).toLocaleString('es-ES')}
                          </time>
                        </div>
                        {entry.from_status && entry.to_status && (
                          <p className="text-[10px] text-neutral-500 mt-0.5">
                            {entry.from_status} → {entry.to_status}
                          </p>
                        )}
                        {entry.comment && (
                          <p className="text-xs text-neutral-400 mt-1">{entry.comment}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}

          {tab === 'comments' && (
            <div data-testid="action-comments" className="space-y-3">
              {comments.length === 0 ? (
                <p className="text-xs text-neutral-600 text-center py-4">Sin comentarios todavía.</p>
              ) : (
                <div className="space-y-3">
                  {comments.map((c) => (
                    <div key={c.id} data-testid="comment-entry" className="card p-3">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-medium text-neutral-300">{c.author_name ?? 'Usuario'}</span>
                        <time className="text-[10px] text-neutral-600">
                          {new Date(c.created_at).toLocaleString('es-ES')}
                        </time>
                      </div>
                      <p className="text-xs text-neutral-400">{c.content}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2 pt-2 border-t border-surface-700">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                  placeholder="Escribe un comentario..."
                  className="input flex-1 text-xs"
                  data-testid="comment-input"
                  aria-label="Nuevo comentario"
                />
                <button
                  data-testid="comment-send"
                  onClick={handleAddComment}
                  disabled={!commentText.trim()}
                  className="btn-primary text-xs disabled:opacity-50"
                >
                  <Send size={12} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Status change dialog */}
        {showStatusDialog && (
          <div className="p-4 border-t border-surface-700 bg-surface-800/50 space-y-2">
            <p className="text-xs text-neutral-400">
              Cambiar estado a: <span className="font-medium text-neutral-200">{ACTION_STATUS_INFO[showStatusDialog].label}</span>
            </p>
            <input
              type="text"
              value={statusComment}
              onChange={(e) => setStatusComment(e.target.value)}
              placeholder="Comentario (opcional)..."
              className="input text-xs"
              data-testid="status-comment-input"
              aria-label="Comentario del cambio de estado"
            />
            <div className="flex gap-2">
              <button
                data-testid="status-change-confirm"
                onClick={handleStatusChange}
                className="btn-primary text-xs"
              >
                Confirmar
              </button>
              <button
                onClick={() => { setShowStatusDialog(null); setStatusComment(''); }}
                className="btn-ghost text-xs"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
