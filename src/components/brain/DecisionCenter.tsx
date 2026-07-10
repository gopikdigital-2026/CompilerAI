import React from 'react';
import {
  CheckCircle2, Clock, AlertTriangle, XCircle, HelpCircle,
  Bot, Wrench, ChevronRight,
} from 'lucide-react';
import type { BrainDecision, BrainModule, RiskLevel, DecisionStatus } from '../../types/brain';

const MODULE_LABELS: Record<BrainModule, string> = {
  decision:     'Decisión',
  planning:     'Planning',
  reasoning:    'Reasoning',
  strategy:     'Estrategia',
  risk:         'Riesgo',
  optimization: 'Optimización',
};

const MODULE_COLORS: Record<BrainModule, string> = {
  decision:     'text-sky-400 bg-sky-400/10 border-sky-400/20',
  planning:     'text-blue-400 bg-blue-400/10 border-blue-400/20',
  reasoning:    'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
  strategy:     'text-amber-400 bg-amber-400/10 border-amber-400/20',
  risk:         'text-error-400 bg-error-400/10 border-error-400/20',
  optimization: 'text-success-400 bg-success-400/10 border-success-400/20',
};

const RISK_CONFIG: Record<RiskLevel, { label: string; color: string }> = {
  low:      { label: 'Bajo',     color: 'text-success-400 bg-success-400/10 border-success-400/20' },
  medium:   { label: 'Medio',    color: 'text-warning-400 bg-warning-400/10 border-warning-400/20' },
  high:     { label: 'Alto',     color: 'text-orange-400 bg-orange-400/10 border-orange-400/20' },
  critical: { label: 'Crítico',  color: 'text-error-400 bg-error-400/10 border-error-400/20' },
};

const STATUS_CONFIG: Record<DecisionStatus, { label: string; icon: React.ReactNode; color: string }> = {
  executed: { label: 'Ejecutada', icon: <CheckCircle2 size={11} />, color: 'text-success-400' },
  pending:  { label: 'Pendiente', icon: <Clock size={11} />,        color: 'text-warning-400' },
  rejected: { label: 'Rechazada', icon: <XCircle size={11} />,      color: 'text-error-400' },
};

function ConfidencePill({ value }: { value: number }) {
  const color = value >= 90 ? 'text-success-400' : value >= 70 ? 'text-warning-400' : 'text-error-400';
  const barColor = value >= 90 ? 'bg-success-500' : value >= 70 ? 'bg-warning-500' : 'bg-error-500';
  return (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      <div className="w-16 h-1 bg-surface-700 rounded-full overflow-hidden">
        <div className={`h-full ${barColor} rounded-full`} style={{ width: `${value}%` }} />
      </div>
      <span className={`text-xs font-bold font-mono ${color}`}>{value}%</span>
    </div>
  );
}

function minsAgoLabel(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 60_000;
  if (diff < 1) return 'ahora';
  if (diff < 60) return `hace ${Math.round(diff)}m`;
  return `hace ${Math.round(diff / 60)}h`;
}

interface DecisionCenterProps {
  decisions: BrainDecision[];
  filter: string;
  onFilterChange: (f: string) => void;
  onOpenWhy: (d: BrainDecision) => void;
}

const FILTERS = [
  { id: 'all',      label: 'Todas' },
  { id: 'pending',  label: 'Pendientes' },
  { id: 'decision', label: 'Decisión' },
  { id: 'planning', label: 'Planning' },
  { id: 'strategy', label: 'Estrategia' },
  { id: 'risk',     label: 'Riesgo' },
  { id: 'optimization', label: 'Optimización' },
];

export function DecisionCenter({ decisions, filter, onFilterChange, onOpenWhy }: DecisionCenterProps) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Filter bar */}
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-surface-700 flex-wrap flex-shrink-0">
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => onFilterChange(f.id)}
            className={`text-xs px-3 py-1 rounded-full border transition-all duration-150
              ${filter === f.id
                ? 'border-sky-500/40 bg-sky-500/15 text-sky-300'
                : 'border-surface-600 text-neutral-500 hover:text-neutral-300'
              }`}
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto text-[10px] text-neutral-600">{decisions.length} decisiones</span>
      </div>

      {/* Decision list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {decisions.map(dec => {
          const moduleCfg = MODULE_COLORS[dec.module];
          const riskCfg = RISK_CONFIG[dec.riskLevel];
          const statusCfg = STATUS_CONFIG[dec.status];
          return (
            <div
              key={dec.id}
              className="rounded-xl border border-surface-600 bg-surface-800 p-4 hover:border-surface-500 hover:bg-surface-750 transition-all group"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  {/* Header row */}
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${moduleCfg}`}>
                      {MODULE_LABELS[dec.module]}
                    </span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${riskCfg.color}`}>
                      Riesgo: {riskCfg.label}
                    </span>
                    <div className={`flex items-center gap-1 text-[10px] ${statusCfg.color}`}>
                      {statusCfg.icon}<span>{statusCfg.label}</span>
                    </div>
                  </div>
                  {/* Title */}
                  <p className="text-sm font-semibold text-neutral-100 leading-snug mb-1">{dec.title}</p>
                  {/* Reason */}
                  <p className="text-[11px] text-neutral-500 leading-relaxed line-clamp-2">{dec.reason}</p>
                  {/* Agents + tools */}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Bot size={10} className="text-neutral-600" />
                    {dec.agents.slice(0, 3).map(a => (
                      <span key={a} className="text-[10px] bg-surface-700 border border-surface-600 text-neutral-500 px-1.5 py-0.5 rounded-full">{a}</span>
                    ))}
                    {dec.tools.length > 0 && (
                      <>
                        <Wrench size={10} className="text-neutral-700 ml-1" />
                        {dec.tools.slice(0, 2).map(t => (
                          <span key={t} className="text-[10px] text-neutral-700">{t}</span>
                        ))}
                      </>
                    )}
                  </div>
                </div>
                {/* Right side */}
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <ConfidencePill value={dec.confidence} />
                  <span className="text-[10px] text-neutral-700">{minsAgoLabel(dec.createdAt)}</span>
                  <button
                    onClick={() => onOpenWhy(dec)}
                    className="flex items-center gap-1.5 text-[11px] text-sky-400 hover:text-sky-300 transition-colors mt-1"
                  >
                    <HelpCircle size={12} /> ¿Por qué? <ChevronRight size={10} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
