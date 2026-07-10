import React, { useState } from 'react';
import {
  GitMerge, DollarSign, Clock, Cpu, Trash2, Repeat2, CheckCircle2,
  TrendingDown, Zap,
} from 'lucide-react';
import type { BrainOptimization, OptimizationType, EffortLevel, ImpactLevel } from '../../types/brain';

const TYPE_CONFIG: Record<OptimizationType, { icon: React.ReactNode; label: string; color: string }> = {
  merge:   { icon: <GitMerge size={12} />,    label: 'Fusión',      color: 'text-sky-400' },
  remove:  { icon: <Trash2 size={12} />,      label: 'Eliminar',    color: 'text-error-400' },
  cost:    { icon: <DollarSign size={12} />,  label: 'Coste',       color: 'text-success-400' },
  time:    { icon: <Clock size={12} />,       label: 'Tiempo',      color: 'text-amber-400' },
  memory:  { icon: <Cpu size={12} />,         label: 'Memoria',     color: 'text-blue-400' },
  reuse:   { icon: <Repeat2 size={12} />,     label: 'Reutilizar',  color: 'text-purple-400' },
};

const EFFORT_CONFIG: Record<EffortLevel, { label: string; color: string }> = {
  low:    { label: 'Bajo',   color: 'text-success-400' },
  medium: { label: 'Medio',  color: 'text-warning-400' },
  high:   { label: 'Alto',   color: 'text-error-400' },
};

const IMPACT_CONFIG: Record<ImpactLevel, { label: string; color: string }> = {
  low:      { label: 'Bajo',    color: 'text-neutral-500' },
  medium:   { label: 'Medio',   color: 'text-warning-400' },
  high:     { label: 'Alto',    color: 'text-orange-400' },
  critical: { label: 'Crítico', color: 'text-error-400' },
};

function OptimizationCard({ opt }: { opt: BrainOptimization }) {
  const typeCfg = TYPE_CONFIG[opt.type];
  const effortCfg = EFFORT_CONFIG[opt.effort];
  const impactCfg = IMPACT_CONFIG[opt.impact];

  return (
    <div className={`rounded-xl border bg-surface-800 p-4 transition-all hover:border-surface-500 hover:bg-surface-750
      ${opt.implemented ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg bg-surface-700 flex-shrink-0 ${typeCfg.color}`}>
            {typeCfg.icon}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-medium ${typeCfg.color}`}>{typeCfg.label}</span>
              {opt.implemented && (
                <span className="flex items-center gap-1 text-[9px] text-success-400 bg-success-400/10 border border-success-400/20 px-1.5 py-0.5 rounded-full">
                  <CheckCircle2 size={8} /> Implementada
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-neutral-100 leading-snug">{opt.title}</p>
          </div>
        </div>
        {/* Saving percent badge */}
        <div className="flex-shrink-0 text-right">
          <div className={`text-lg font-bold font-mono ${opt.savingPercent >= 50 ? 'text-success-400' : opt.savingPercent >= 20 ? 'text-warning-400' : 'text-neutral-400'}`}>
            -{opt.savingPercent}%
          </div>
          <p className="text-[9px] text-neutral-700">ahorro</p>
        </div>
      </div>

      <p className="text-[11px] text-neutral-500 leading-relaxed mb-3">{opt.description}</p>

      {/* Before / After */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-error-500/5 border border-error-500/15 rounded-lg p-2">
          <p className="text-[9px] text-error-400 font-medium mb-1 uppercase">Antes</p>
          <p className="text-[10px] text-neutral-500 leading-relaxed">{opt.before}</p>
        </div>
        <div className="bg-success-500/5 border border-success-500/15 rounded-lg p-2">
          <p className="text-[9px] text-success-400 font-medium mb-1 uppercase">Después</p>
          <p className="text-[10px] text-neutral-400 leading-relaxed">{opt.after}</p>
        </div>
      </div>

      {/* Savings row */}
      <div className="flex items-center gap-3 flex-wrap text-[10px] mb-2">
        {opt.savingTime && opt.savingTime !== '0s' && (
          <span className="flex items-center gap-1 text-amber-400">
            <Clock size={9} /> {opt.savingTime}
          </span>
        )}
        {opt.savingCost && opt.savingCost !== '$0' && (
          <span className="flex items-center gap-1 text-success-400">
            <DollarSign size={9} /> {opt.savingCost}
          </span>
        )}
        <span className={`flex items-center gap-1 ${impactCfg.color}`}>
          <TrendingDown size={9} /> Impacto: {impactCfg.label}
        </span>
        <span className={`flex items-center gap-1 ${effortCfg.color}`}>
          <Zap size={9} /> Esfuerzo: {effortCfg.label}
        </span>
      </div>

      {/* Affected agents */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {opt.affectedAgents.map(a => (
          <span key={a} className="text-[10px] bg-surface-700 border border-surface-600 text-neutral-500 px-1.5 py-0.5 rounded-full">
            {a}
          </span>
        ))}
      </div>
    </div>
  );
}

interface OptimizationCenterProps {
  optimizations: BrainOptimization[];
}

export function OptimizationCenter({ optimizations }: OptimizationCenterProps) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all');
  const filtered = filter === 'all'
    ? optimizations
    : filter === 'pending'
      ? optimizations.filter(o => !o.implemented)
      : optimizations.filter(o => o.implemented);

  const totalSavingPct = Math.round(
    optimizations.filter(o => !o.implemented).reduce((sum, o) => sum + o.savingPercent, 0) / Math.max(optimizations.filter(o => !o.implemented).length, 1)
  );

  const sortedFiltered = [...filtered].sort((a, b) => b.priority - a.priority);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-surface-700 flex-shrink-0 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-surface-750 rounded-xl border border-surface-600 p-3 text-center">
            <p className="text-[10px] text-neutral-600">Pendientes</p>
            <p className="text-xl font-bold text-amber-400">{optimizations.filter(o => !o.implemented).length}</p>
          </div>
          <div className="flex-1 bg-surface-750 rounded-xl border border-surface-600 p-3 text-center">
            <p className="text-[10px] text-neutral-600">Implementadas</p>
            <p className="text-xl font-bold text-success-400">{optimizations.filter(o => o.implemented).length}</p>
          </div>
          <div className="flex-1 bg-surface-750 rounded-xl border border-surface-600 p-3 text-center">
            <p className="text-[10px] text-neutral-600">Ahorro medio</p>
            <p className="text-xl font-bold text-sky-400">{totalSavingPct}%</p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-1.5">
          {(['all', 'pending', 'done'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1 rounded-full border transition-all
                ${filter === f
                  ? 'border-sky-500/40 bg-sky-500/15 text-sky-300'
                  : 'border-surface-600 text-neutral-500 hover:text-neutral-300'}`}
            >
              {f === 'all' ? 'Todas' : f === 'pending' ? 'Pendientes' : 'Implementadas'}
            </button>
          ))}
          <span className="ml-auto text-[10px] text-neutral-600">{filtered.length} optimizaciones</span>
        </div>
      </div>

      {/* Optimization cards sorted by priority */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {sortedFiltered.map(opt => (
          <OptimizationCard key={opt.id} opt={opt} />
        ))}
      </div>
    </div>
  );
}
