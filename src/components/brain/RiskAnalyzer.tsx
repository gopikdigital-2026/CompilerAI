import React, { useState } from 'react';
import {
  AlertTriangle, AlertCircle, CheckCircle2, Info,
  ShieldCheck, ShieldAlert, X,
} from 'lucide-react';
import type { BrainRisk, RiskLevel, RiskCategory } from '../../types/brain';

const SEVERITY_CONFIG: Record<RiskLevel, { label: string; color: string; dot: string; ring: string }> = {
  low:      { label: 'Bajo',    color: 'text-success-400', dot: 'bg-success-400', ring: 'border-success-400/30' },
  medium:   { label: 'Medio',   color: 'text-warning-400', dot: 'bg-warning-400', ring: 'border-warning-400/30' },
  high:     { label: 'Alto',    color: 'text-orange-400',  dot: 'bg-orange-400',  ring: 'border-orange-400/30' },
  critical: { label: 'Crítico', color: 'text-error-400',   dot: 'bg-error-400',   ring: 'border-error-400/30' },
};

const STATUS_CONFIG = {
  open:      { label: 'Abierto',   icon: <AlertCircle size={10} />, color: 'text-error-400 bg-error-400/10 border-error-400/20' },
  mitigated: { label: 'Mitigado',  icon: <ShieldCheck size={10} />, color: 'text-success-400 bg-success-400/10 border-success-400/20' },
  accepted:  { label: 'Aceptado',  icon: <CheckCircle2 size={10} />, color: 'text-neutral-400 bg-surface-700 border-surface-600' },
} as const;

const CATEGORY_LABELS: Record<RiskCategory, string> = {
  error:       'Error',
  dependency:  'Dependencia',
  bottleneck:  'Cuello de botella',
  integration: 'Integración',
  conflict:    'Conflicto',
  cost:        'Coste',
};

function ProbabilityImpactDot({ probability, severity }: { probability: number; severity: RiskLevel }) {
  const xPct = probability * 100;
  const yMap: Record<RiskLevel, number> = { low: 80, medium: 55, high: 30, critical: 10 };
  const yPct = yMap[severity];
  const cfg = SEVERITY_CONFIG[severity];

  return { x: xPct, y: yPct, cfg };
}

function RiskMatrix({ risks }: { risks: BrainRisk[] }) {
  return (
    <div className="rounded-xl border border-surface-600 bg-surface-800 p-4">
      <p className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider mb-3">Matriz Probabilidad × Impacto</p>
      <div className="relative h-40 w-full">
        {/* Grid background */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Danger zones */}
          <rect x="50" y="0" width="50" height="50" fill="rgba(239,68,68,0.06)" />
          <rect x="0" y="0" width="50" height="50" fill="rgba(245,158,11,0.04)" />
          <rect x="50" y="50" width="50" height="50" fill="rgba(245,158,11,0.04)" />
          <rect x="0" y="50" width="50" height="50" fill="rgba(34,197,94,0.04)" />
          {/* Grid lines */}
          {[25, 50, 75].map(v => (
            <React.Fragment key={v}>
              <line x1={v} y1="0" x2={v} y2="100" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
              <line x1="0" y1={v} x2="100" y2={v} stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
            </React.Fragment>
          ))}
        </svg>
        {/* Axis labels */}
        <span className="absolute bottom-0 left-0 text-[9px] text-neutral-700">Baja prob.</span>
        <span className="absolute bottom-0 right-0 text-[9px] text-neutral-700">Alta prob.</span>
        <span className="absolute top-0 left-0 text-[9px] text-neutral-700 -rotate-90 origin-bottom-left translate-y-14">Impacto</span>
        {/* Risk dots */}
        {risks.map(risk => {
          const { x, y, cfg } = ProbabilityImpactDot({ probability: risk.probability, severity: risk.severity });
          return (
            <div
              key={risk.id}
              className={`absolute w-3 h-3 rounded-full ${cfg.dot} opacity-80 -translate-x-1/2 -translate-y-1/2
                ring-2 ring-surface-800 flex items-center justify-center`}
              style={{ left: `${x}%`, top: `${y}%` }}
              title={risk.title}
            />
          );
        })}
      </div>
      <div className="flex items-center gap-3 mt-2 flex-wrap text-[9px]">
        {(Object.entries(SEVERITY_CONFIG) as [RiskLevel, typeof SEVERITY_CONFIG[RiskLevel]][]).map(([level, cfg]) => (
          <span key={level} className={`flex items-center gap-1 ${cfg.color}`}>
            <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </span>
        ))}
      </div>
    </div>
  );
}

interface RiskAnalyzerProps {
  risks: BrainRisk[];
}

export function RiskAnalyzer({ risks }: RiskAnalyzerProps) {
  const [filter, setFilter] = useState<'all' | 'open' | 'mitigated' | 'accepted'>('all');

  const filtered = filter === 'all' ? risks : risks.filter(r => r.status === filter);
  const openCount = risks.filter(r => r.status === 'open').length;
  const criticalCount = risks.filter(r => r.severity === 'critical').length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header stats */}
      <div className="px-4 py-3 border-b border-surface-700 flex-shrink-0 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-surface-750 rounded-xl border border-surface-600 p-3 text-center">
            <p className="text-[10px] text-neutral-600">Riesgos abiertos</p>
            <p className="text-xl font-bold text-error-400">{openCount}</p>
          </div>
          <div className="flex-1 bg-surface-750 rounded-xl border border-surface-600 p-3 text-center">
            <p className="text-[10px] text-neutral-600">Críticos</p>
            <p className="text-xl font-bold text-orange-400">{criticalCount}</p>
          </div>
          <div className="flex-1 bg-surface-750 rounded-xl border border-surface-600 p-3 text-center">
            <p className="text-[10px] text-neutral-600">Total</p>
            <p className="text-xl font-bold text-neutral-300">{risks.length}</p>
          </div>
        </div>

        <RiskMatrix risks={risks} />

        {/* Filter */}
        <div className="flex items-center gap-1.5">
          {(['all', 'open', 'mitigated', 'accepted'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1 rounded-full border transition-all
                ${filter === f
                  ? 'border-sky-500/40 bg-sky-500/15 text-sky-300'
                  : 'border-surface-600 text-neutral-500 hover:text-neutral-300'}`}
            >
              {f === 'all' ? 'Todos' : f === 'open' ? 'Abiertos' : f === 'mitigated' ? 'Mitigados' : 'Aceptados'}
            </button>
          ))}
          <span className="ml-auto text-[10px] text-neutral-600">{filtered.length} riesgos</span>
        </div>
      </div>

      {/* Risk list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filtered.map(risk => {
          const sevCfg = SEVERITY_CONFIG[risk.severity];
          const statusCfg = STATUS_CONFIG[risk.status];
          return (
            <div
              key={risk.id}
              className={`rounded-xl border bg-surface-800 p-4 transition-all hover:bg-surface-750
                ${risk.status === 'open' && risk.severity === 'critical' ? 'border-error-500/30' : 'border-surface-600'}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${sevCfg.color} ${sevCfg.dot.replace('bg-', 'bg-')}/10 ${sevCfg.ring}`}>
                      {sevCfg.label}
                    </span>
                    <span className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border ${statusCfg.color}`}>
                      {statusCfg.icon} {statusCfg.label}
                    </span>
                    <span className="text-[10px] text-neutral-700">{CATEGORY_LABELS[risk.category]}</span>
                  </div>
                  <p className="text-sm font-semibold text-neutral-100 leading-snug mb-1">{risk.title}</p>
                  <p className="text-[11px] text-neutral-500 leading-relaxed">{risk.description}</p>

                  {/* Mitigation */}
                  <div className="mt-2 p-2 rounded-lg bg-surface-750 border border-surface-700">
                    <p className="text-[9px] font-medium text-neutral-600 uppercase tracking-wider mb-1">Mitigación</p>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">{risk.mitigation}</p>
                  </div>

                  {/* Affected components */}
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {risk.affectedComponents.map(c => (
                      <span key={c} className="text-[10px] bg-surface-700 border border-surface-600 text-neutral-500 px-1.5 py-0.5 rounded-full">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Probability gauge */}
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <div className="relative w-10 h-10">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="14" fill="none" strokeWidth="3" className="stroke-surface-700" />
                      <circle
                        cx="18" cy="18" r="14" fill="none" strokeWidth="3"
                        className={sevCfg.color.replace('text-', 'stroke-')}
                        strokeDasharray={`${risk.probability * 87.96} 87.96`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className={`absolute inset-0 flex items-center justify-center text-[9px] font-bold font-mono ${sevCfg.color}`}>
                      {Math.round(risk.probability * 100)}%
                    </span>
                  </div>
                  <span className="text-[9px] text-neutral-700">prob.</span>
                  {risk.estimatedCostImpact && (
                    <span className="text-[9px] text-neutral-700 text-center leading-tight max-w-14">
                      {risk.estimatedCostImpact}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
