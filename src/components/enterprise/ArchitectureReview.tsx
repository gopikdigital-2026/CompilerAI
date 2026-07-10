import { useState } from 'react';
import { CheckCircle, Clock, Wrench, AlertTriangle, ChevronDown, ChevronRight, Package, GitBranch, Layers } from 'lucide-react';
import { ARCH_MODULES, ROADMAP } from '../../lib/enterpriseMocks';
import type { ModuleStatus, RiskLevel } from '../../types/enterprise';

const STATUS_CONFIG: Record<ModuleStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  complete:     { label: 'Completo',      color: '#34d399', bg: 'rgba(52,211,153,0.1)',  icon: <CheckCircle size={11} /> },
  'in-progress':{ label: 'En progreso',   color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',  icon: <Wrench size={11} /> },
  partial:      { label: 'Parcial',       color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  icon: <AlertTriangle size={11} /> },
  planned:      { label: 'Planificado',   color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', icon: <Clock size={11} /> },
};

const RISK_CONFIG: Record<RiskLevel, { label: string; color: string }> = {
  low:      { label: 'Bajo',     color: '#34d399' },
  medium:   { label: 'Medio',    color: '#f59e0b' },
  high:     { label: 'Alto',     color: '#f87171' },
  critical: { label: 'Crítico',  color: '#ef4444' },
};

const ROADMAP_STATUS = {
  done:    { color: '#34d399', label: 'Completado' },
  active:  { color: '#60a5fa', label: 'Activo'     },
  planned: { color: '#94a3b8', label: 'Planificado' },
};

type ArchTab = 'modules' | 'roadmap';

export function ArchitectureReview() {
  const [tab, setTab]     = useState<ArchTab>('modules');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const totalModules   = ARCH_MODULES.length;
  const completeCount  = ARCH_MODULES.filter(m => m.status === 'complete').length;
  const avgCoverage    = Math.round(ARCH_MODULES.reduce((s, m) => s + m.coverage, 0) / totalModules);
  const highRisk       = ARCH_MODULES.filter(m => m.riskLevel === 'high' || m.riskLevel === 'critical').length;

  return (
    <div className="p-6 space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        <SCard label="Módulos completos" value={`${completeCount}/${totalModules}`} color="#34d399" />
        <SCard label="Cobertura funcional" value={`${avgCoverage}%`}               color="#60a5fa" />
        <SCard label="Riesgo alto"         value={String(highRisk)}                 color="#f87171" />
        <SCard label="Componentes"         value={String(ARCH_MODULES.reduce((s, m) => s + m.components, 0))} color="#a78bfa" />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-surface-950 border border-surface-800 p-1 rounded-xl w-fit">
        {([['modules', 'Módulos'], ['roadmap', 'Roadmap']] as [ArchTab, string][]).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              tab === id ? 'bg-surface-700 text-neutral-100 shadow' : 'text-neutral-500 hover:text-neutral-300'
            }`}>{label}
          </button>
        ))}
      </div>

      {/* Modules */}
      {tab === 'modules' && (
        <div className="space-y-2">
          {ARCH_MODULES.map(m => {
            const sc   = STATUS_CONFIG[m.status];
            const rc   = RISK_CONFIG[m.riskLevel];
            const open = expanded.has(m.id);
            return (
              <div key={m.id} className="bg-surface-800 border border-surface-700 rounded-2xl overflow-hidden hover:border-surface-600 transition-colors">
                <button className="w-full flex items-center gap-3 px-4 py-3.5" onClick={() => toggleExpand(m.id)}>
                  {/* Coverage arc (simple) */}
                  <div className="relative w-10 h-10 flex-shrink-0">
                    <svg width="40" height="40" viewBox="0 0 40 40">
                      <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                      <circle cx="20" cy="20" r="16" fill="none" stroke={sc.color} strokeWidth="3"
                        strokeDasharray={`${(m.coverage / 100) * 100.5} 100.5`}
                        strokeLinecap="round" transform="rotate(-90 20 20)"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-neutral-300">{m.coverage}%</span>
                  </div>

                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-xs font-semibold text-neutral-200">{m.name}</p>
                      <span className="flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded"
                        style={{ background: sc.bg, color: sc.color }}>{sc.icon} {sc.label}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px]">
                      <span className="text-neutral-600">{m.components} componentes</span>
                      <span className="font-semibold" style={{ color: rc.color }}>Riesgo: {rc.label}</span>
                      {m.techDebt.length > 0 && (
                        <span className="text-amber-500">{m.techDebt.length} deuda técnica</span>
                      )}
                    </div>
                  </div>
                  {open ? <ChevronDown size={14} className="text-neutral-600 flex-shrink-0" /> : <ChevronRight size={14} className="text-neutral-600 flex-shrink-0" />}
                </button>

                {open && (
                  <div className="border-t border-surface-700 px-4 py-3 space-y-3">
                    <p className="text-[10px] text-neutral-400 leading-relaxed">{m.notes}</p>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[9px] font-semibold uppercase tracking-widest text-neutral-600 mb-1.5">Dependencias</p>
                        <div className="flex flex-wrap gap-1">
                          {m.dependencies.map(d => (
                            <span key={d} className="text-[9px] bg-surface-700 text-neutral-400 px-2 py-0.5 rounded-md border border-surface-600">{d}</span>
                          ))}
                        </div>
                      </div>
                      {m.techDebt.length > 0 && (
                        <div>
                          <p className="text-[9px] font-semibold uppercase tracking-widest text-amber-600 mb-1.5">Deuda técnica</p>
                          <div className="space-y-1">
                            {m.techDebt.map(d => (
                              <p key={d} className="text-[10px] text-amber-500/80">• {d}</p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Roadmap */}
      {tab === 'roadmap' && (
        <div className="relative pl-6">
          {/* Vertical line */}
          <div className="absolute left-2.5 top-3 bottom-3 w-px bg-surface-700" />

          <div className="space-y-4">
            {ROADMAP.map(phase => {
              const sc = ROADMAP_STATUS[phase.status];
              return (
                <div key={phase.phase} className="relative">
                  {/* Dot */}
                  <div className="absolute -left-6 top-3 w-3 h-3 rounded-full border-2 z-10"
                    style={{ background: phase.status === 'planned' ? '#1e293b' : sc.color, borderColor: sc.color }} />

                  <div className="bg-surface-800 border border-surface-700 rounded-2xl px-4 py-4 hover:border-surface-600 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono text-neutral-600">Fase {phase.phase}</span>
                        <p className="text-xs font-semibold text-neutral-200">{phase.title}</p>
                        <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: `${sc.color}18`, color: sc.color }}>
                          {sc.label}
                        </span>
                      </div>
                      <span className="text-[10px] text-neutral-600 font-mono">{phase.eta}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {phase.items.map(item => (
                        <span key={item}
                          className={`text-[10px] px-2 py-0.5 rounded-md border ${
                            phase.status === 'done'
                              ? 'bg-green-900/20 text-green-400 border-green-900/40'
                              : phase.status === 'active'
                              ? 'bg-blue-900/20 text-blue-400 border-blue-900/40'
                              : 'bg-surface-700 text-neutral-500 border-surface-600'
                          }`}
                        >{item}</span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function SCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-surface-800 border border-surface-700 rounded-xl px-4 py-3 text-center">
      <p className="text-base font-bold" style={{ color }}>{value}</p>
      <p className="text-[10px] text-neutral-500 mt-0.5">{label}</p>
    </div>
  );
}
