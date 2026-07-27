import { useMemo } from 'react';
import {
  TrendingUp, TrendingDown, Minus, Activity, Plus,
  CheckCircle, XCircle, AlertTriangle, BarChart3, GitCompare,
} from 'lucide-react';
import { useAnalysis } from '../../hooks/useAnalysis';
import { useOrganization } from '../../hooks/useOrganization';
import { calculateHealthScore, assessDataQuality } from '../../lib/healthScoreEngine';
import type { AnalysisHistoryItem } from '../../types/analysis';

export function HistoricalComparison() {
  const analysis = useAnalysis();
  const { activeOrg } = useOrganization();

  // Build comparison data from history
  const comparison = useMemo(() => {
    if (analysis.history.length < 2) return null;

    // Sort by date ascending
    const sorted = [...analysis.history].sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    const previous = sorted[sorted.length - 2];
    const current = sorted[sorted.length - 1];

    // Health score evolution (approximate from confidence + opportunities)
    const prevScore = previous.confidence;
    const currScore = current.confidence;
    const scoreDelta = currScore - prevScore;

    // Opportunities new/resolved
    const currentOpps = analysis.result?.opportunities ?? [];
    const newOpps = currentOpps.filter((o) => o.status === 'new').length;
    const resolvedOpps = currentOpps.filter((o) =>
      o.status === 'completed' || o.status === 'discarded' || o.status === 'automated'
    ).length;

    // Risks: compare current risks count with previous
    const currentRisks = analysis.result?.risks ?? [];
    const newRisks = currentRisks.slice(0, 3); // Simplified: treat current risks as potentially new
    const eliminatedRisks = previous.error ?? '';

    return {
      previous,
      current,
      scoreDelta,
      prevScore,
      currScore,
      newOpps,
      resolvedOpps,
      currentRisks: currentRisks.length,
      newRisks,
      dates: sorted.map((s) => s.created_at),
      scores: sorted.map((s) => s.confidence),
    };
  }, [analysis.history, analysis.result]);

  if (!comparison) {
    return (
      <div data-testid="historical-comparison" className="card p-8 text-center">
        <GitCompare size={28} className="text-neutral-600 mx-auto mb-2" />
        <p className="text-sm text-neutral-400">Se necesitan al menos 2 análisis para mostrar la comparativa</p>
        <p className="text-xs text-neutral-600 mt-1">Realiza otro análisis para ver la evolución de {activeOrg?.name ?? 'tu organización'}.</p>
      </div>
    );
  }

  const { scoreDelta, prevScore, currScore, newOpps, resolvedOpps, currentRisks } = comparison;
  const ScoreIcon = scoreDelta > 0 ? TrendingUp : scoreDelta < 0 ? TrendingDown : Minus;
  const scoreColor = scoreDelta > 0 ? 'text-success-400' : scoreDelta < 0 ? 'text-error-400' : 'text-neutral-400';

  return (
    <div data-testid="historical-comparison" className="space-y-4">
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-1">
          <GitCompare size={16} className="text-brand-400" />
          <h3 className="text-sm font-semibold text-neutral-100">Comparativa Histórica</h3>
        </div>
        <p className="text-xs text-neutral-500">
          Evolución del Health Score y oportunidades para {activeOrg?.name ?? 'tu organización'}.
          Nunca se comparan organizaciones distintas.
        </p>
      </div>

      {/* Health Score evolution */}
      <div className="card p-4">
        <p className="text-xs font-medium text-neutral-400 mb-3 flex items-center gap-1">
          <Activity size={12} /> Evolución del Health Score
        </p>
        <div className="flex items-center justify-between gap-4">
          <div className="text-center">
            <p className="text-[10px] text-neutral-600">Análisis anterior</p>
            <p className="text-2xl font-bold text-neutral-300">{prevScore}</p>
            <p className="text-[10px] text-neutral-600">{formatDate(comparison.previous.created_at)}</p>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className={`flex items-center gap-1 ${scoreColor}`}>
              <ScoreIcon size={20} />
              <span className="text-sm font-bold">
                {scoreDelta > 0 ? '+' : ''}{scoreDelta}
              </span>
            </div>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-neutral-600">Análisis actual</p>
            <p className={`text-2xl font-bold ${scoreColor}`}>{currScore}</p>
            <p className="text-[10px] text-neutral-600">{formatDate(comparison.current.created_at)}</p>
          </div>
        </div>

        {/* Mini sparkline */}
        {comparison.scores.length > 1 && (
          <div className="mt-4">
            <Sparkline scores={comparison.scores} />
          </div>
        )}
      </div>

      {/* Changes grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-3">
          <p className="text-xs font-medium text-brand-400 mb-2 flex items-center gap-1">
            <Plus size={12} /> Oportunidades nuevas
          </p>
          <p className="text-2xl font-bold text-neutral-200">{newOpps}</p>
        </div>
        <div className="card p-3">
          <p className="text-xs font-medium text-success-400 mb-2 flex items-center gap-1">
            <CheckCircle size={12} /> Oportunidades resueltas
          </p>
          <p className="text-2xl font-bold text-neutral-200">{resolvedOpps}</p>
        </div>
        <div className="card p-3">
          <p className="text-xs font-medium text-error-400 mb-2 flex items-center gap-1">
            <AlertTriangle size={12} /> Riesgos actuales
          </p>
          <p className="text-2xl font-bold text-neutral-200">{currentRisks}</p>
        </div>
        <div className="card p-3">
          <p className="text-xs font-medium text-warning-400 mb-2 flex items-center gap-1">
            <XCircle size={12} /> Riesgos nuevos
          </p>
          <p className="text-2xl font-bold text-neutral-200">{comparison.newRisks.length}</p>
        </div>
      </div>

      {/* Trends */}
      <div className="card p-4">
        <p className="text-xs font-medium text-neutral-400 mb-3 flex items-center gap-1">
          <BarChart3 size={12} /> Tendencias
        </p>
        <div className="space-y-2">
          <TrendRow label="Health Score" delta={scoreDelta} />
          <TrendRow label="Oportunidades detectadas" delta={comparison.current.opportunities_count - comparison.previous.opportunities_count} />
          <TrendRow label="Confianza del análisis" delta={comparison.current.confidence - comparison.previous.confidence} />
        </div>
      </div>
    </div>
  );
}

function TrendRow({ label, delta }: { label: string; delta: number }) {
  const Icon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const color = delta > 0 ? 'text-success-400' : delta < 0 ? 'text-error-400' : 'text-neutral-400';
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-neutral-400">{label}</span>
      <span className={`flex items-center gap-1 ${color}`}>
        <Icon size={12} /> {delta > 0 ? '+' : ''}{delta}
      </span>
    </div>
  );
}

function Sparkline({ scores }: { scores: number[] }) {
  const max = Math.max(...scores, 100);
  const min = Math.min(...scores, 0);
  const range = max - min || 1;
  const points = scores.map((s, i) => {
    const x = (i / (scores.length - 1)) * 100;
    const y = 100 - ((s - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox="0 0 100 100" className="w-full h-12" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke="rgb(99, 102, 241)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {scores.map((s, i) => {
        const x = (i / (scores.length - 1)) * 100;
        const y = 100 - ((s - min) / range) * 100;
        return <circle key={i} cx={x} cy={y} r="2" fill="rgb(99, 102, 241)" />;
      })}
    </svg>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}
