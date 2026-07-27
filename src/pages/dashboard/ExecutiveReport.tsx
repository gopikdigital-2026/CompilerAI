import {
  Activity, TrendingUp, TrendingDown, Minus, AlertTriangle,
  CheckCircle, XCircle, Lightbulb, Target, Zap, Clock,
  FileText, Database, ChevronDown, ChevronUp, ShieldAlert,
  ArrowRight, DollarSign, BarChart3,
} from 'lucide-react';
import { useState } from 'react';
import { useAnalysis } from '../../hooks/useAnalysis';
import { useOrganization } from '../../hooks/useOrganization';
import { useTranslation } from '../../hooks/useTranslation';
import type { ExecutiveReportData, HealthScoreDimension } from '../../types/analysis';

const trendIcons = {
  up: TrendingUp,
  down: TrendingDown,
  stable: Minus,
  unknown: Activity,
};

const trendColors = {
  up: 'text-success-400',
  down: 'text-error-400',
  stable: 'text-neutral-400',
  unknown: 'text-neutral-500',
};

const qualityColors = {
  high: 'text-success-400 bg-success-500/10',
  medium: 'text-warning-400 bg-warning-500/10',
  low: 'text-error-400 bg-error-500/10',
  insufficient: 'text-neutral-400 bg-neutral-500/10',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatDuration(ms: number | null | undefined): string {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function ExecutiveReportPage() {
  const analysis = useAnalysis();
  const { activeOrg } = useOrganization();
  const { t } = useTranslation();
  const [expandedDimensions, setExpandedDimensions] = useState<Set<string>>(new Set());

  const report = analysis.executiveReport;
  const result = analysis.result;

  if (!report || !result) {
    return (
      <div data-testid="executive-report" className="p-6">
        <div className="card p-8 flex flex-col items-center justify-center text-center min-h-[300px]">
          <FileText size={32} className="text-neutral-400 mb-3" />
          <p className="text-sm font-medium text-neutral-200 mb-1">No hay informe ejecutivo disponible</p>
          <p className="text-xs text-neutral-500">Realiza un análisis para generar el informe ejecutivo.</p>
        </div>
      </div>
    );
  }

  const { healthScore, report: execReport, dataQuality } = report;
  const TrendIcon = trendIcons[healthScore.trend];

  const toggleDimension = (id: string) => {
    setExpandedDimensions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const scoreColor = healthScore.score >= 70 ? 'text-success-400' : healthScore.score >= 50 ? 'text-warning-400' : 'text-error-400';
  const scoreBg = healthScore.score >= 70 ? 'from-success-500/20' : healthScore.score >= 50 ? 'from-warning-500/20' : 'from-error-500/20';

  return (
    <div data-testid="executive-report" className="p-6 space-y-5 animate-fade-in max-w-5xl mx-auto">
      {/* ── Executive Header ───────────────────────────────────────────── */}
      <div className={`card p-6 bg-gradient-to-br ${scoreBg} to-surface-800 border-surface-600`}>
        <div className="flex items-start justify-between gap-6 flex-wrap">
          {/* Health Score Ring */}
          <div className="flex items-center gap-5">
            <div className="relative w-24 h-24 flex items-center justify-center flex-shrink-0">
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="6" className="text-surface-700" />
                <circle
                  cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="6"
                  className={scoreColor}
                  strokeDasharray={`${(healthScore.score / 100) * 264} 264`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-2xl font-bold ${scoreColor}`}>{healthScore.score}</span>
                <span className="text-[10px] text-neutral-500">/ 100</span>
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-100">Informe Ejecutivo</h2>
              <p className="text-sm text-neutral-400 mt-0.5">{activeOrg?.name}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className={`text-xs font-medium ${scoreColor}`}>{healthScore.label}</span>
                <span className={`flex items-center gap-1 text-xs ${trendColors[healthScore.trend]}`}>
                  <TrendIcon size={12} /> {healthScore.trend === 'up' ? 'Mejorando' : healthScore.trend === 'down' ? 'Empeorando' : healthScore.trend === 'stable' ? 'Estable' : 'Sin tendencia'}
                </span>
              </div>
            </div>
          </div>

          {/* Meta info */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
            <div>
              <span className="text-neutral-600">Fecha</span>
              <p className="text-neutral-300">{analysis.currentAnalysisId ? formatDate(new Date().toISOString()) : '—'}</p>
            </div>
            <div>
              <span className="text-neutral-600">Duración</span>
              <p className="text-neutral-300">{formatDuration(analysis.history[0]?.duration_ms)}</p>
            </div>
            <div>
              <span className="text-neutral-600">Confianza</span>
              <p className="text-brand-400">{healthScore.confidence}%</p>
            </div>
            <div>
              <span className="text-neutral-600">Calidad de datos</span>
              <p className={`inline-flex items-center gap-1 ${qualityColors[dataQuality.level]}`}>
                <Database size={10} /> {dataQuality.label}
              </p>
            </div>
          </div>
        </div>

        {/* Next Best Action + Economic Impact */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5 pt-5 border-t border-surface-700">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center flex-shrink-0">
              <Zap size={14} className="text-brand-400" />
            </div>
            <div>
              <p className="text-[10px] text-neutral-600 font-medium uppercase tracking-wider">Próxima mejor acción</p>
              <p className="text-sm text-neutral-200 mt-0.5">{execReport.nextBestAction}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent-500/10 flex items-center justify-center flex-shrink-0">
              <DollarSign size={14} className="text-accent-400" />
            </div>
            <div>
              <p className="text-[10px] text-neutral-600 font-medium uppercase tracking-wider">Impacto económico</p>
              <p className="text-sm text-neutral-200 mt-0.5">{execReport.economicImpact}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── AI Executive Summary (5 questions) ─────────────────────────── */}
      <div data-testid="executive-summary" className="card">
        <div className="px-5 py-4 border-b border-surface-700 flex items-center gap-2">
          <Lightbulb size={16} className="text-brand-400" />
          <h3 className="text-sm font-semibold text-neutral-100">Resumen Ejecutivo IA</h3>
          <span className="text-xs text-neutral-600 ml-auto flex items-center gap-1">
            <Clock size={10} /> {execReport.readabilityTime}
          </span>
        </div>
        <div className="divide-y divide-surface-700">
          {[
            execReport.what,
            execReport.why,
            execReport.impact,
            execReport.whatToDo,
            execReport.whatHappensIfNothing,
          ].map((section, i) => (
            <div key={i} className="px-5 py-4">
              <p className="text-xs font-medium text-brand-400 mb-1.5">{section.question}</p>
              <p className="text-sm text-neutral-300 leading-relaxed">{section.answer}</p>
              {section.evidence.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {section.evidence.map((ev, j) => (
                    <div key={j} className="flex items-start gap-2 text-xs">
                      <span className={`px-1.5 py-0.5 rounded ${qualityColors[ev.quality]} flex-shrink-0`}>
                        {ev.confidence}%
                      </span>
                      <span className="text-neutral-500">
                        <span className="text-neutral-400 font-mono">{ev.source}</span>
                        {' — '}
                        {ev.metric}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {section.evidence.length === 0 && (
                <p className="mt-2 text-xs text-neutral-600 italic">Información insuficiente para emitir una recomendación fiable.</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Strengths, Weaknesses, Risks ──────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-xs font-medium text-success-400 mb-2 flex items-center gap-1">
            <CheckCircle size={12} /> Fortalezas
          </p>
          {result.strengths.length > 0 ? (
            <ul className="space-y-1.5">
              {result.strengths.map((s, i) => (
                <li key={i} className="text-xs text-neutral-400 flex items-start gap-1.5">
                  <CheckCircle size={10} className="text-success-400 mt-0.5 flex-shrink-0" /> {s}
                </li>
              ))}
            </ul>
          ) : <p className="text-xs text-neutral-600">Sin fortalezas detectadas</p>}
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium text-warning-400 mb-2 flex items-center gap-1">
            <ShieldAlert size={12} /> Debilidades
          </p>
          {report.weaknesses.length > 0 ? (
            <ul className="space-y-1.5">
              {report.weaknesses.slice(0, 5).map((w, i) => (
                <li key={i} className="text-xs text-neutral-400 flex items-start gap-1.5">
                  <AlertTriangle size={10} className="text-warning-400 mt-0.5 flex-shrink-0" /> {w}
                </li>
              ))}
            </ul>
          ) : <p className="text-xs text-neutral-600">Sin debilidades detectadas</p>}
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium text-error-400 mb-2 flex items-center gap-1">
            <XCircle size={12} /> Riesgos
          </p>
          {result.risks.length > 0 ? (
            <ul className="space-y-1.5">
              {result.risks.map((r, i) => (
                <li key={i} className="text-xs text-neutral-400 flex items-start gap-1.5">
                  <AlertTriangle size={10} className="text-error-400 mt-0.5 flex-shrink-0" /> {r}
                </li>
              ))}
            </ul>
          ) : <p className="text-xs text-neutral-600">Sin riesgos detectados</p>}
        </div>
      </div>

      {/* ── Health Score Dimensions ───────────────────────────────────── */}
      <div data-testid="health-score-breakdown" className="card">
        <div className="px-5 py-4 border-b border-surface-700 flex items-center gap-2">
          <BarChart3 size={16} className="text-brand-400" />
          <h3 className="text-sm font-semibold text-neutral-100">Health Score — Desglose</h3>
        </div>
        <div className="p-4">
          <p className="text-xs text-neutral-500 mb-4 leading-relaxed">{healthScore.calculationMethod}</p>
          <div className="space-y-2">
            {healthScore.dimensions.map((dim) => (
              <DimensionRow
                key={dim.id}
                dim={dim}
                expanded={expandedDimensions.has(dim.id)}
                onToggle={() => toggleDimension(dim.id)}
              />
            ))}
          </div>
        </div>
        <div className="px-5 py-3 border-t border-surface-700 flex items-center gap-4 text-xs">
          <span className="text-neutral-600">Fuentes utilizadas:</span>
          <div className="flex flex-wrap gap-1.5">
            {healthScore.sourcesUsed.map((src, i) => (
              <span key={i} className="px-1.5 py-0.5 rounded bg-surface-700 text-neutral-500 font-mono text-[10px]">{src}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Top Opportunities ─────────────────────────────────────────── */}
      <div className="card">
        <div className="px-5 py-4 border-b border-surface-700 flex items-center gap-2">
          <Target size={16} className="text-accent-400" />
          <h3 className="text-sm font-semibold text-neutral-100">Oportunidades prioritarias</h3>
          <span className="text-xs text-neutral-500 ml-auto">{result.opportunities.length} detectadas</span>
        </div>
        <div className="divide-y divide-surface-700">
          {result.opportunities.slice(0, 5).map((opp) => (
            <div key={opp.id} className="px-5 py-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-neutral-200">{opp.title}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    opp.priority === 'critical' ? 'bg-error-500/15 text-error-400' :
                    opp.priority === 'high' ? 'bg-warning-500/15 text-warning-400' :
                    'bg-brand-500/15 text-brand-400'
                  }`}>{opp.priority}</span>
                </div>
                <p className="text-xs text-neutral-500 mt-0.5">{opp.estimated_roi}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-neutral-400">{opp.confidence}% confianza</p>
                <p className="text-[10px] text-neutral-600 font-mono">{opp.source}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DimensionRow({ dim, expanded, onToggle }: { dim: HealthScoreDimension; expanded: boolean; onToggle: () => void }) {
  const scoreColor = dim.score >= 60 ? 'text-success-400' : dim.score >= 40 ? 'text-warning-400' : 'text-error-400';
  const barColor = dim.score >= 60 ? 'bg-success-500' : dim.score >= 40 ? 'bg-warning-500' : 'bg-error-500';
  const Chevron = expanded ? ChevronUp : ChevronDown;

  return (
    <div className="rounded-lg bg-surface-800 border border-surface-700">
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-surface-750 transition-colors">
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-neutral-200">{dim.label}</span>
            <span className={`text-sm font-bold ${scoreColor}`}>{dim.score}</span>
          </div>
          <div className="h-1 bg-surface-700 rounded-full overflow-hidden">
            <div className={`h-full ${barColor} transition-all`} style={{ width: `${dim.score}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] text-neutral-600">{Math.round(dim.weight * 100)}%</span>
          <Chevron size={14} className="text-neutral-500" />
        </div>
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-2 animate-fade-in">
          <p className="text-xs text-neutral-400">{dim.description}</p>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-neutral-600">Confianza:</span>
            <span className={dim.confidence >= 70 ? 'text-success-400' : dim.confidence >= 40 ? 'text-warning-400' : 'text-error-400'}>
              {dim.confidence}%
            </span>
            <span className="text-neutral-600 ml-2">Peso:</span>
            <span className="text-neutral-400">{Math.round(dim.weight * 100)}%</span>
          </div>
          {dim.sources.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-neutral-600">Fuentes:</span>
              {dim.sources.map((s, i) => (
                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-surface-700 text-neutral-500 font-mono">{s}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
