import React from 'react';
import {
  CheckCircle2, XCircle, Clock, Zap, DollarSign, Bot,
  TrendingUp, Lightbulb, RotateCcw, Play,
} from 'lucide-react';
import type { ExecutionSummaryData } from '../../types/execution';

interface ExecutionSummaryProps {
  summary: ExecutionSummaryData;
  blueprintName: string;
  lang: string;
  onReset: () => void;
  onRunAgain: () => void;
}

function MetricCard({
  icon, label, value, sub, accent = false,
}: { icon: React.ReactNode; label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="bg-surface-800 border border-surface-700 rounded-xl p-4 flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-neutral-500 mb-1">
        <span>{icon}</span>
        <span className="text-xs">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${accent ? 'text-brand-300' : 'text-neutral-100'}`}>{value}</p>
      {sub && <p className="text-xs text-neutral-600">{sub}</p>}
    </div>
  );
}

function SuccessGauge({ rate }: { rate: number }) {
  const color = rate >= 90 ? '#22c55e' : rate >= 70 ? '#f59e0b' : '#ef4444';
  const r = 38;
  const circ = 2 * Math.PI * r;
  const fill = (rate / 100) * circ;
  return (
    <svg width="100" height="100" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
      <circle
        cx="50" cy="50" r={r} fill="none"
        stroke={color} strokeWidth="8"
        strokeDasharray={`${fill} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
        style={{ transition: 'stroke-dasharray 1s ease' }}
      />
      <text x="50" y="54" textAnchor="middle" fill={color} fontSize="18" fontWeight="800">{rate}%</text>
    </svg>
  );
}

export function ExecutionSummary({ summary, blueprintName, lang, onReset, onRunAgain }: ExecutionSummaryProps) {
  const isEs = lang === 'es';
  const totalSec = (summary.totalDurationMs / 1000).toFixed(1);
  const isSuccess = summary.stepsErrored === 0;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className={`px-5 py-4 border-b border-surface-700 ${isSuccess ? 'bg-success-500/5' : 'bg-warning-500/5'}`}>
        <div className="flex items-center gap-3">
          {isSuccess
            ? <CheckCircle2 size={22} className="text-success-400 flex-shrink-0" />
            : <XCircle size={22} className="text-warning-400 flex-shrink-0" />
          }
          <div>
            <h3 className={`text-base font-bold ${isSuccess ? 'text-success-300' : 'text-warning-300'}`}>
              {isSuccess
                ? (isEs ? 'Ejecución completada' : 'Execution complete')
                : (isEs ? 'Completada con errores' : 'Completed with errors')}
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5 truncate max-w-xs">{blueprintName}</p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Success gauge + stats grid */}
        <div className="flex items-center gap-5">
          <div className="flex flex-col items-center flex-shrink-0">
            <SuccessGauge rate={summary.successRate} />
            <p className="text-[10px] text-neutral-600 mt-1">{isEs ? 'éxito' : 'success'}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 flex-1">
            <MetricCard
              icon={<Clock size={13} />}
              label={isEs ? 'Tiempo total' : 'Total time'}
              value={`${totalSec}s`}
              sub={isEs ? 'tiempo real' : 'wall time'}
              accent
            />
            <MetricCard
              icon={<DollarSign size={13} />}
              label={isEs ? 'Coste total' : 'Total cost'}
              value={`$${summary.totalCostUsd.toFixed(4)}`}
              sub={isEs ? 'esta ejecución' : 'this run'}
            />
            <MetricCard
              icon={<Zap size={13} />}
              label="Tokens"
              value={summary.totalTokens.toLocaleString()}
              sub={isEs ? 'tokens consumidos' : 'tokens used'}
            />
            <MetricCard
              icon={<Bot size={13} />}
              label={isEs ? 'Agentes' : 'Agents'}
              value={String(summary.agentsUsed)}
              sub={`${summary.stepsCompleted}/${summary.stepsCompleted + summary.stepsErrored} ${isEs ? 'pasos OK' : 'steps OK'}`}
            />
          </div>
        </div>

        {/* Steps breakdown */}
        <div className="bg-surface-800 border border-surface-700 rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-wider text-neutral-600 font-medium mb-3">
            {isEs ? 'Desglose de pasos' : 'Steps breakdown'}
          </p>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-success-400" />
              <span className="text-sm font-bold text-success-300">{summary.stepsCompleted}</span>
              <span className="text-xs text-neutral-500">{isEs ? 'completados' : 'completed'}</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle size={14} className="text-error-400" />
              <span className="text-sm font-bold text-error-300">{summary.stepsErrored}</span>
              <span className="text-xs text-neutral-500">{isEs ? 'con error' : 'errored'}</span>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-3 h-2 bg-surface-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-success-500 rounded-full transition-all duration-1000"
              style={{ width: `${summary.successRate}%` }}
            />
          </div>
        </div>

        {/* Optimizations */}
        {summary.optimizations.length > 0 && (
          <div className="bg-brand-500/5 border border-brand-500/15 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb size={14} className="text-brand-400" />
              <p className="text-xs font-semibold text-brand-300">
                {isEs ? 'Recomendaciones de optimización' : 'Optimization recommendations'}
              </p>
            </div>
            <ul className="space-y-2">
              {summary.optimizations.map((opt, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-neutral-400 leading-relaxed">
                  <span className="text-brand-500 font-bold flex-shrink-0 mt-0.5">·</span>
                  {opt}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={onRunAgain} className="btn-primary flex-1 justify-center text-sm">
            <Play size={13} /> {isEs ? 'Ejecutar de nuevo' : 'Run again'}
          </button>
          <button onClick={onReset} className="btn-secondary px-4 text-sm">
            <RotateCcw size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
