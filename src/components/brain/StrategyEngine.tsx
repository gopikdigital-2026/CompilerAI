import React, { useState } from 'react';
import {
  Zap, DollarSign, Shield, Building2, Star, Clock,
  TrendingUp, AlertTriangle, CheckCircle2, Users,
} from 'lucide-react';
import type { Strategy, StrategyType } from '../../types/brain';

const TYPE_CONFIG: Record<StrategyType, { icon: React.ReactNode; color: string; accent: string }> = {
  fast:       { icon: <Zap size={14} />,       color: 'text-amber-400',   accent: 'border-amber-500/30 bg-amber-500/5' },
  economic:   { icon: <DollarSign size={14} />, color: 'text-success-400', accent: 'border-success-500/30 bg-success-500/5' },
  safe:       { icon: <Shield size={14} />,     color: 'text-sky-400',     accent: 'border-sky-500/30 bg-sky-500/5' },
  enterprise: { icon: <Building2 size={14} />,  color: 'text-purple-400',  accent: 'border-purple-500/30 bg-purple-500/5' },
};

function RiskBar({ value }: { value: number }) {
  const color = value <= 20 ? 'bg-success-500' : value <= 50 ? 'bg-warning-500' : 'bg-error-500';
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-14 h-1.5 bg-surface-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-[10px] font-mono text-neutral-500">{value}</span>
    </div>
  );
}

function StrategyCard({ strategy, selected, onSelect }: {
  strategy: Strategy;
  selected: boolean;
  onSelect: () => void;
}) {
  const cfg = TYPE_CONFIG[strategy.type];

  return (
    <div
      onClick={onSelect}
      className={`rounded-xl border p-4 cursor-pointer transition-all relative
        ${selected ? cfg.accent + ' ' + cfg.color.replace('text-', 'border-') : 'border-surface-600 bg-surface-800 hover:border-surface-500'}`}
    >
      {strategy.recommended && (
        <div className="absolute -top-2 left-3">
          <span className="flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full bg-success-500 text-white">
            <Star size={8} fill="currentColor" /> RECOMENDADA
          </span>
        </div>
      )}

      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg bg-surface-700 ${cfg.color}`}>{cfg.icon}</div>
          <div>
            <p className={`text-sm font-bold ${selected ? cfg.color : 'text-neutral-200'}`}>{strategy.name}</p>
            <p className="text-[10px] text-neutral-600">{strategy.tagline}</p>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className={`text-base font-bold font-mono ${selected ? cfg.color : 'text-neutral-300'}`}>
            {strategy.estimatedCost}
          </p>
          <p className="text-[10px] text-neutral-600">{strategy.estimatedTime}</p>
        </div>
      </div>

      <p className="text-[11px] text-neutral-500 leading-relaxed mb-3">{strategy.description}</p>

      {/* Metrics row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-surface-750 rounded-lg p-2 text-center">
          <p className="text-[10px] text-neutral-700">Latencia</p>
          <p className="text-xs font-bold font-mono text-neutral-300">{strategy.metrics.avgLatencyS}s</p>
        </div>
        <div className="bg-surface-750 rounded-lg p-2 text-center">
          <p className="text-[10px] text-neutral-700">Error rate</p>
          <p className={`text-xs font-bold font-mono ${strategy.metrics.errorRate <= 1 ? 'text-success-400' : strategy.metrics.errorRate <= 3 ? 'text-warning-400' : 'text-error-400'}`}>
            {strategy.metrics.errorRate}%
          </p>
        </div>
        <div className="bg-surface-750 rounded-lg p-2 text-center">
          <p className="text-[10px] text-neutral-700">Escalab.</p>
          <p className="text-xs font-bold font-mono text-neutral-300">{strategy.metrics.scalability}/10</p>
        </div>
      </div>

      {/* Chips */}
      <div className="flex items-center gap-2 flex-wrap text-[10px] text-neutral-600">
        <span className="flex items-center gap-1"><Users size={9} /> {strategy.agentCount} agentes</span>
        <span className="flex items-center gap-1"><CheckCircle2 size={9} /> {strategy.successRate}% éxito</span>
        <span className="flex items-center gap-1"><AlertTriangle size={9} /> Riesgo: <RiskBar value={strategy.riskScore} /></span>
      </div>
    </div>
  );
}

interface StrategyEngineProps {
  strategies: Strategy[];
}

export function StrategyEngine({ strategies }: StrategyEngineProps) {
  const [selectedId, setSelectedId] = useState(strategies.find(s => s.recommended)?.id ?? strategies[0].id);
  const selected = strategies.find(s => s.id === selectedId) ?? strategies[0];
  const cfg = TYPE_CONFIG[selected.type];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Strategy grid */}
      <div className="flex-shrink-0 p-4 border-b border-surface-700">
        <div className="grid grid-cols-2 gap-3">
          {strategies.map(s => (
            <StrategyCard
              key={s.id}
              strategy={s}
              selected={selectedId === s.id}
              onSelect={() => setSelectedId(s.id)}
            />
          ))}
        </div>
      </div>

      {/* Comparison detail for selected */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg bg-surface-700 ${cfg.color}`}>{cfg.icon}</div>
          <p className="text-sm font-semibold text-neutral-200">{selected.name} — Detalle</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Pros */}
          <div className="rounded-xl border border-surface-600 bg-surface-800 p-3">
            <p className="text-[10px] font-medium text-success-400 uppercase tracking-wider mb-2">Ventajas</p>
            <ul className="space-y-1.5">
              {selected.pros.map((pro, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 size={10} className="text-success-400 mt-0.5 flex-shrink-0" />
                  <span className="text-[11px] text-neutral-400 leading-relaxed">{pro}</span>
                </li>
              ))}
            </ul>
          </div>
          {/* Cons */}
          <div className="rounded-xl border border-surface-600 bg-surface-800 p-3">
            <p className="text-[10px] font-medium text-error-400 uppercase tracking-wider mb-2">Desventajas</p>
            <ul className="space-y-1.5">
              {selected.cons.map((con, i) => (
                <li key={i} className="flex items-start gap-2">
                  <AlertTriangle size={10} className="text-error-400 mt-0.5 flex-shrink-0" />
                  <span className="text-[11px] text-neutral-400 leading-relaxed">{con}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Comparison table */}
        <div className="rounded-xl border border-surface-600 bg-surface-800 overflow-hidden">
          <div className="px-4 py-2 border-b border-surface-700">
            <p className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider">Comparativa de métricas</p>
          </div>
          <div className="divide-y divide-surface-700">
            {strategies.map(s => {
              const sCfg = TYPE_CONFIG[s.type];
              return (
                <div
                  key={s.id}
                  className={`px-4 py-2.5 flex items-center gap-3 cursor-pointer transition-colors hover:bg-surface-750
                    ${s.id === selectedId ? 'bg-surface-750' : ''}`}
                  onClick={() => setSelectedId(s.id)}
                >
                  <div className={`flex items-center gap-2 w-36 flex-shrink-0 ${sCfg.color}`}>
                    {sCfg.icon}
                    <span className="text-xs font-medium">{s.name}</span>
                    {s.recommended && <Star size={8} className="text-success-400" fill="currentColor" />}
                  </div>
                  <div className="flex-1 grid grid-cols-4 gap-2 text-[10px]">
                    <div className="text-center">
                      <p className="text-neutral-700 mb-0.5">Tiempo</p>
                      <p className="font-mono text-neutral-300">{s.metrics.avgLatencyS}s</p>
                    </div>
                    <div className="text-center">
                      <p className="text-neutral-700 mb-0.5">Coste</p>
                      <p className="font-mono text-neutral-300">${s.metrics.costPerRun}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-neutral-700 mb-0.5">Errores</p>
                      <p className={`font-mono ${s.metrics.errorRate <= 1 ? 'text-success-400' : s.metrics.errorRate <= 3 ? 'text-warning-400' : 'text-error-400'}`}>
                        {s.metrics.errorRate}%
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-neutral-700 mb-0.5">Éxito</p>
                      <p className="font-mono text-neutral-300">{s.successRate}%</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
