import { useState, useEffect } from 'react';
import {
  Zap, Loader2, AlertCircle, CheckCircle, XCircle, Clock,
  Target, TrendingUp, TrendingDown, Minus, Trash2, Eye,
  MessageSquare, GitBranch, ChevronRight, History, RotateCcw,
  Lightbulb, ShieldAlert, Award,
} from 'lucide-react';
import { useAnalysis } from '../../hooks/useAnalysis';
import { useOrganization } from '../../hooks/useOrganization';
import { useTranslation } from '../../hooks/useTranslation';
import { track } from '../../lib/telemetry';
import type { AnalysisOpportunity, BusinessArea, OpportunityPriority } from '../../types/analysis';

const priorityColors: Record<string, string> = {
  critical: 'bg-error-500/15 text-error-400 border-error-500/20',
  high: 'bg-warning-500/15 text-warning-400 border-warning-500/20',
  medium: 'bg-brand-500/15 text-brand-400 border-brand-500/20',
  low: 'bg-neutral-500/15 text-neutral-400 border-neutral-500/20',
};

const statusIcons: Record<string, typeof CheckCircle> = {
  completed: CheckCircle,
  error: XCircle,
  cancelled: XCircle,
  running: Loader2,
  pending: Clock,
};

function formatDuration(ms: number | null): string {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function AnalysisPage() {
  const analysis = useAnalysis();
  const { activeOrg } = useOrganization();
  const { t } = useTranslation();
  const a = t.analysis;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [selectedOpp, setSelectedOpp] = useState<AnalysisOpportunity | null>(null);

  const isRunning = ['preparing', 'validating', 'collecting', 'analyzing', 'generating', 'finalizing'].includes(analysis.status);

  useEffect(() => {
    if (analysis.status === 'completed' && analysis.result) {
      track('analysis_opened', { analysis_id: analysis.currentAnalysisId });
    }
  }, [analysis.status, analysis.currentAnalysisId]);

  // No organization state
  if (!activeOrg) {
    return (
      <div data-testid="analysis-page" className="p-6">
        <div className="card p-8 flex flex-col items-center justify-center text-center min-h-[300px]">
          <AlertCircle size={32} className="text-neutral-400 mb-3" />
          <p className="text-sm font-medium text-neutral-200 mb-1">{a.noOrg}</p>
          <p className="text-xs text-neutral-500">{a.noOrgDesc}</p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="analysis-page" className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="card p-5 bg-gradient-to-r from-brand-600/15 to-accent-600/10 border-brand-500/20">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-neutral-100 flex items-center gap-2">
              <Zap size={20} className="text-brand-400" />
              {a.title}
            </h2>
            <p className="text-sm text-neutral-400 mt-1">{a.subtitle}</p>
          </div>
          {analysis.status === 'idle' && (
            <button
              data-testid="analysis-start"
              onClick={() => analysis.startAnalysis()}
              className="btn-primary text-sm flex items-center gap-2"
            >
              <Zap size={16} /> {a.start}
            </button>
          )}
          {isRunning && (
            <button
              onClick={() => analysis.cancelAnalysis()}
              className="btn-ghost text-sm flex items-center gap-2 text-error-400"
            >
              <XCircle size={16} /> {a.cancel}
            </button>
          )}
          {analysis.status === 'completed' && (
            <button
              onClick={() => analysis.resetAnalysis()}
              className="btn-ghost text-sm flex items-center gap-2"
            >
              <RotateCcw size={16} /> {a.newAnalysis}
            </button>
          )}
          {analysis.status === 'error' && (
            <button
              onClick={() => { analysis.resetAnalysis(); analysis.startAnalysis(); }}
              className="btn-primary text-sm flex items-center gap-2"
            >
              <RotateCcw size={16} /> {a.retry}
            </button>
          )}
        </div>
      </div>

      {/* Error state */}
      {analysis.status === 'error' && analysis.error && (
        <div className="card p-5 border-error-500/20 bg-error-500/5">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-error-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-error-400">{a.error}</p>
              <p className="text-xs text-neutral-400 mt-1">{analysis.error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Progress state */}
      {isRunning && (
        <div data-testid="analysis-progress" className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Loader2 size={16} className="animate-spin text-brand-400" />
            <h3 className="text-sm font-semibold text-neutral-100">{a.progress}</h3>
          </div>

          {/* Overall progress bar */}
          <div className="mb-4">
            <div className="h-2 bg-surface-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-500 transition-all duration-300"
                style={{
                  width: `${(analysis.stages.filter((s) => s.status === 'completed').length / analysis.stages.length) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Stage list */}
          <div className="space-y-3">
            {analysis.stages.map((stage) => {
              const Icon = statusIcons[stage.status] ?? Clock;
              return (
                <div key={stage.id} className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    stage.status === 'completed' ? 'bg-success-500/10 text-success-400' :
                    stage.status === 'running' ? 'bg-brand-500/10 text-brand-400' :
                    stage.status === 'error' ? 'bg-error-500/10 text-error-400' :
                    'bg-surface-700 text-neutral-500'
                  }`}>
                    <Icon size={14} className={stage.status === 'running' ? 'animate-spin' : ''} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${stage.status === 'completed' ? 'text-neutral-400' : 'text-neutral-200'}`}>
                      {stage.label}
                    </p>
                    <p className="text-xs text-neutral-500">{stage.description}</p>
                  </div>
                  {stage.status === 'running' && (
                    <div className="w-16 h-1 bg-surface-700 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-500 transition-all duration-200" style={{ width: `${stage.progress}%` }} />
                    </div>
                  )}
                  {stage.status === 'completed' && (
                    <CheckCircle size={14} className="text-success-400 flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cancelled state */}
      {analysis.status === 'cancelled' && (
        <div className="card p-5 border-neutral-500/20">
          <div className="flex items-center gap-3">
            <XCircle size={20} className="text-neutral-400" />
            <p className="text-sm text-neutral-300">{a.cancelled}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {analysis.status === 'completed' && analysis.result && (
        <div data-testid="analysis-results" className="space-y-6">
          {/* Summary */}
          <div data-testid="analysis-summary" className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb size={16} className="text-brand-400" />
              <h3 className="text-sm font-semibold text-neutral-100">{a.summary}</h3>
            </div>
            <p className="text-sm text-neutral-300 leading-relaxed mb-4">{analysis.result.summary}</p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-success-400 mb-2 flex items-center gap-1">
                  <Award size={12} /> {a.strengths}
                </p>
                {analysis.result.strengths.length > 0 ? (
                  <ul className="space-y-1">
                    {analysis.result.strengths.map((s, i) => (
                      <li key={i} className="text-xs text-neutral-400 flex items-start gap-1.5">
                        <CheckCircle size={12} className="text-success-400 mt-0.5 flex-shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-neutral-500">—</p>
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-error-400 mb-2 flex items-center gap-1">
                  <ShieldAlert size={12} /> {a.risks}
                </p>
                {analysis.result.risks.length > 0 ? (
                  <ul className="space-y-1">
                    {analysis.result.risks.map((r, i) => (
                      <li key={i} className="text-xs text-neutral-400 flex items-start gap-1.5">
                        <AlertCircle size={12} className="text-error-400 mt-0.5 flex-shrink-0" />
                        {r}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-neutral-500">—</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-surface-700">
              <span className="text-xs text-neutral-500">{a.confidence}:</span>
              <span className="text-sm font-medium text-brand-400">{analysis.result.confidence}%</span>
              <span className="text-xs text-neutral-600 ml-auto">{a.engineVersion}: {analysis.result.engineVersion}</span>
            </div>
          </div>

          {/* Areas */}
          <div data-testid="analysis-areas" className="card">
            <div className="px-5 py-4 border-b border-surface-700">
              <h3 className="text-sm font-semibold text-neutral-100">{a.areas}</h3>
            </div>
            <div className="divide-y divide-surface-700">
              {analysis.result.areas.map((area) => {
                const areaLabel = (a as any)[`area${area.area.charAt(0).toUpperCase()}${area.area.slice(1)}`] ?? area.area;
                const scoreColor = area.score >= 60 ? 'text-success-400' : area.score >= 40 ? 'text-warning-400' : 'text-error-400';
                return (
                  <div key={area.area} className="px-5 py-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-neutral-200">{areaLabel}</p>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 bg-surface-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${area.score >= 60 ? 'bg-success-500' : area.score >= 40 ? 'bg-warning-500' : 'bg-error-500'}`}
                            style={{ width: `${area.score}%` }}
                          />
                        </div>
                        <span className={`text-sm font-bold ${scoreColor}`}>{area.score}</span>
                      </div>
                    </div>
                    <p className="text-xs text-neutral-400 mb-2">{area.explanation}</p>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {area.evidence.map((e, i) => (
                        <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-surface-700 text-neutral-500 font-mono">{e}</span>
                      ))}
                    </div>
                    {area.actions.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {area.actions.map((action, i) => (
                          <span key={i} className="text-xs text-brand-400">{action}</span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Opportunities */}
          <div data-testid="analysis-opportunities" className="card">
            <div className="px-5 py-4 border-b border-surface-700">
              <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
                <Target size={16} className="text-accent-400" />
                {a.opportunities}
                <span className="text-xs text-neutral-500">({analysis.result.opportunities.length})</span>
              </h3>
            </div>
            <div className="divide-y divide-surface-700">
              {analysis.result.opportunities.map((opp) => (
                <div key={opp.id} className="px-5 py-4 hover:bg-surface-750 transition-colors">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-neutral-200">{opp.title}</p>
                      <p className="text-xs text-neutral-500 mt-1">{opp.description}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded border flex-shrink-0 ${priorityColors[opp.priority] ?? priorityColors.medium}`}>
                      {(a as any)[`priority${opp.priority.charAt(0).toUpperCase()}${opp.priority.slice(1)}`] ?? opp.priority}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-xs text-neutral-500 mb-3">
                    <div>
                      <span className="text-neutral-600">{a.confidence}</span>
                      <p className="text-neutral-300 mt-0.5">{opp.confidence}%</p>
                    </div>
                    <div>
                      <span className="text-neutral-600">{a.impact}</span>
                      <p className="text-neutral-300 mt-0.5 capitalize">{opp.impact}</p>
                    </div>
                    <div>
                      <span className="text-neutral-600">{a.effort}</span>
                      <p className="text-neutral-300 mt-0.5 capitalize">{opp.effort}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 mb-3">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-700 text-neutral-500 font-mono">{opp.source}</span>
                    <span className="text-[10px] text-neutral-600">{opp.estimated_roi}</span>
                  </div>

                  {/* Evidence */}
                  {opp.evidence.length > 0 && (
                    <div className="mb-3 p-2 rounded-lg bg-surface-800 border border-surface-700">
                      <p className="text-[10px] text-neutral-600 font-medium mb-1">{a.evidence}</p>
                      {opp.evidence.map((ev, i) => (
                        <div key={i} className="text-xs text-neutral-500">
                          <span className="text-neutral-400">{a.dataUsed}:</span> {ev.dataUsed}
                          <span className="mx-1">·</span>
                          <span className="text-neutral-400">{a.connector}:</span> {ev.connector}
                          <span className="mx-1">·</span>
                          <span className="text-neutral-400">{a.limitations}:</span> {ev.limitations}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      data-testid="approve-opportunity"
                      onClick={() => analysis.updateOpportunityStatus(opp.id, 'approved')}
                      disabled={opp.status !== 'new'}
                      className="text-xs text-success-400 hover:text-success-300 disabled:text-neutral-600 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      <CheckCircle size={12} /> {a.approve}
                    </button>
                    <button
                      data-testid="reject-opportunity"
                      onClick={() => analysis.updateOpportunityStatus(opp.id, 'discarded')}
                      disabled={opp.status !== 'new'}
                      className="text-xs text-neutral-500 hover:text-neutral-400 disabled:text-neutral-600 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      <XCircle size={12} /> {a.discard}
                    </button>
                    <button
                      data-testid="send-to-copilot"
                      onClick={() => {
                        analysis.updateOpportunityStatus(opp.id, 'sent_to_copilot');
                        setSelectedOpp(opp);
                      }}
                      className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1"
                    >
                      <MessageSquare size={12} /> {a.sendToCopilot}
                    </button>
                    <button
                      data-testid="create-automation"
                      onClick={() => analysis.updateOpportunityStatus(opp.id, 'automated')}
                      className="text-xs text-accent-400 hover:text-accent-300 flex items-center gap-1"
                    >
                      <GitBranch size={12} /> {a.createAutomation}
                    </button>
                    <button
                      onClick={() => setSelectedOpp(opp)}
                      className="text-xs text-neutral-500 hover:text-neutral-400 flex items-center gap-1"
                    >
                      <Eye size={12} /> {a.viewDetail}
                    </button>

                    {/* Status badge */}
                    {opp.status !== 'new' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-700 text-neutral-400 ml-auto">
                        {(a as any)[`status${opp.status === 'sent_to_copilot' ? 'Copilot' : opp.status === 'approved' ? 'Approved' : opp.status === 'discarded' ? 'Discarded' : opp.status === 'automated' ? 'Automated' : 'New'}`] ?? opp.status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* History */}
      <div data-testid="analysis-history" className="card">
        <div className="px-5 py-4 border-b border-surface-700">
          <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
            <History size={16} className="text-neutral-400" />
            {a.history}
          </h3>
        </div>

        {analysis.history.length === 0 ? (
          <div className="p-8 text-center">
            <History size={32} className="text-neutral-600 mx-auto mb-2" />
            <p className="text-sm text-neutral-500">{a.noHistory}</p>
            <p className="text-xs text-neutral-600 mt-1">{a.noHistoryDesc}</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-700">
            {analysis.history.map((item) => (
              <div key={item.id} className="px-5 py-3 flex items-center justify-between hover:bg-surface-750 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    item.status === 'completed' ? 'bg-success-500/10 text-success-400' :
                    item.status === 'error' ? 'bg-error-500/10 text-error-400' :
                    item.status === 'cancelled' ? 'bg-neutral-500/10 text-neutral-400' :
                    'bg-brand-500/10 text-brand-400'
                  }`}>
                    {item.status === 'completed' ? <CheckCircle size={14} /> :
                     item.status === 'error' ? <XCircle size={14} /> :
                     item.status === 'cancelled' ? <XCircle size={14} /> :
                     <Clock size={14} />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-200 truncate">{item.scope ?? a.title}</p>
                    <p className="text-xs text-neutral-500">
                      {formatDate(item.created_at)} · {formatDuration(item.duration_ms)} · {item.opportunities_count} {a.opportunities.toLowerCase()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {item.confidence > 0 && (
                    <span className="text-xs text-brand-400">{item.confidence}%</span>
                  )}
                  {item.status === 'completed' && (
                    <button
                      onClick={() => analysis.loadAnalysis(item.id)}
                      className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1"
                    >
                      <Eye size={12} /> {a.viewDetail}
                    </button>
                  )}
                  <button
                    onClick={() => setShowDeleteConfirm(item.id)}
                    className="text-xs text-neutral-500 hover:text-error-400 flex items-center gap-1"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-fade-in" data-testid="delete-confirm-modal">
          <div className="card p-6 max-w-sm w-full mx-4">
            <h4 className="text-sm font-semibold text-neutral-100 mb-2">{a.deleteConfirm}</h4>
            <p className="text-xs text-neutral-400 mb-4">{a.deleteConfirmDesc}</p>
            <div className="flex items-center gap-2 justify-end">
              <button onClick={() => setShowDeleteConfirm(null)} className="btn-ghost text-sm">
                {t.common.cancel}
              </button>
              <button
                onClick={() => {
                  analysis.deleteAnalysis(showDeleteConfirm);
                  setShowDeleteConfirm(null);
                }}
                className="btn-primary text-sm bg-error-500 hover:bg-error-600"
              >
                {a.delete}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Opportunity detail modal */}
      {selectedOpp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-fade-in" data-testid="opportunity-detail-modal">
          <div className="card p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-3">
              <h4 className="text-sm font-semibold text-neutral-100">{selectedOpp.title}</h4>
              <button onClick={() => setSelectedOpp(null)} className="text-neutral-500 hover:text-neutral-300">
                <XCircle size={16} />
              </button>
            </div>
            <p className="text-sm text-neutral-400 mb-4">{selectedOpp.description}</p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <p className="text-xs text-neutral-600">{a.priority}</p>
                <p className="text-sm text-neutral-200 capitalize">{(a as any)[`priority${selectedOpp.priority.charAt(0).toUpperCase()}${selectedOpp.priority.slice(1)}`] ?? selectedOpp.priority}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-600">{a.confidence}</p>
                <p className="text-sm text-neutral-200">{selectedOpp.confidence}%</p>
              </div>
              <div>
                <p className="text-xs text-neutral-600">{a.impact}</p>
                <p className="text-sm text-neutral-200 capitalize">{selectedOpp.impact}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-600">{a.effort}</p>
                <p className="text-sm text-neutral-200 capitalize">{selectedOpp.effort}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-600">{a.roi}</p>
                <p className="text-sm text-neutral-200">{selectedOpp.estimated_roi}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-600">{a.source}</p>
                <p className="text-sm text-neutral-200 font-mono">{selectedOpp.source}</p>
              </div>
            </div>

            {selectedOpp.evidence.length > 0 && (
              <div className="p-3 rounded-lg bg-surface-800 border border-surface-700 mb-4">
                <p className="text-xs font-medium text-neutral-400 mb-2">{a.evidence}</p>
                {selectedOpp.evidence.map((ev, i) => (
                  <div key={i} className="text-xs text-neutral-500 space-y-1">
                    <div><span className="text-neutral-400">{a.dataUsed}:</span> {ev.dataUsed}</div>
                    <div><span className="text-neutral-400">{a.connector}:</span> {ev.connector}</div>
                    <div><span className="text-neutral-400">{a.confidence}:</span> {ev.confidence}%</div>
                    <div><span className="text-neutral-400">{a.limitations}:</span> {ev.limitations}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 justify-end">
              <button onClick={() => setSelectedOpp(null)} className="btn-ghost text-sm">
                {t.common.close}
              </button>
              {selectedOpp.status === 'new' && (
                <>
                  <button
                    onClick={() => { analysis.updateOpportunityStatus(selectedOpp.id, 'approved'); setSelectedOpp(null); }}
                    className="btn-primary text-sm"
                  >
                    {a.approve}
                  </button>
                  <button
                    onClick={() => { analysis.updateOpportunityStatus(selectedOpp.id, 'sent_to_copilot'); }}
                    className="btn-ghost text-sm text-brand-400"
                  >
                    {a.sendToCopilot}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
