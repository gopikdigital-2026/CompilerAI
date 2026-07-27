import { useMemo } from 'react';
import {
  Calendar, Target, AlertTriangle, Link2, User,
  TrendingUp, Zap, Rocket, Flag,
} from 'lucide-react';
import type { AnalysisResult } from '../../types/analysis';
import { generateRoadmap } from '../../lib/roadmapEngine';
import { track } from '../../lib/telemetry';

interface RoadmapViewProps {
  analysisResult: AnalysisResult;
}

const phaseIcons = {
  '7days': Zap,
  '30days': Target,
  '90days': Rocket,
};

const phaseColors = {
  '7days': 'border-success-500/20 bg-success-500/5',
  '30days': 'border-brand-500/20 bg-brand-500/5',
  '90days': 'border-accent-500/20 bg-accent-500/5',
};

export function RoadmapView({ analysisResult }: RoadmapViewProps) {
  const roadmap = useMemo(() => {
    const r = generateRoadmap(analysisResult);
    track('roadmap_generated', { phases: r.phases.length, opportunities: analysisResult.opportunities.length });
    return r;
  }, [analysisResult]);

  return (
    <div data-testid="roadmap-view" className="space-y-4">
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-1">
          <Flag size={16} className="text-brand-400" />
          <h3 className="text-sm font-semibold text-neutral-100">Roadmap Automático</h3>
        </div>
        <p className="text-xs text-neutral-500">
          Generado automáticamente a partir de las {analysisResult.opportunities.length} oportunidades detectadas.
          Cada fase incluye objetivo, acciones, impacto, riesgos, dependencias y responsable sugerido.
        </p>
      </div>

      <div className="space-y-3">
        {roadmap.phases.map((phase, idx) => {
          const Icon = phaseIcons[phase.phase];
          return (
            <div
              key={phase.phase}
              data-testid={`roadmap-phase-${phase.phase}`}
              className={`card p-4 border ${phaseColors[phase.phase]}`}
            >
              {/* Phase header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-surface-800 flex items-center justify-center flex-shrink-0">
                  <Icon size={16} className="text-neutral-300" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-neutral-100">{phase.label}</h4>
                    <span className="text-[10px] text-neutral-600">Fase {idx + 1}</span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">{phase.objective}</p>
                </div>
              </div>

              {/* Actions */}
              {phase.actions.length > 0 ? (
                <div className="space-y-1.5 mb-3">
                  <p className="text-[10px] text-neutral-600 uppercase tracking-wider">Acciones</p>
                  {phase.actions.map((action, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-neutral-300">
                      <span className="w-4 h-4 rounded bg-surface-700 flex items-center justify-center text-[9px] text-neutral-500 flex-shrink-0 mt-0.5">{i + 1}</span>
                      {action}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-neutral-600 italic mb-3">Sin acciones en esta fase</p>
              )}

              {/* Grid: Impact, Owner, Risks, Dependencies */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-surface-700">
                <div>
                  <p className="text-[10px] text-neutral-600 uppercase tracking-wider flex items-center gap-1 mb-1">
                    <TrendingUp size={10} /> Impacto esperado
                  </p>
                  <p className="text-xs text-neutral-300">{phase.expectedImpact}</p>
                </div>
                <div>
                  <p className="text-[10px] text-neutral-600 uppercase tracking-wider flex items-center gap-1 mb-1">
                    <User size={10} /> Responsable sugerido
                  </p>
                  <p className="text-xs text-neutral-300">{phase.suggestedOwner}</p>
                </div>
                {phase.risks.length > 0 && (
                  <div>
                    <p className="text-[10px] text-neutral-600 uppercase tracking-wider flex items-center gap-1 mb-1">
                      <AlertTriangle size={10} /> Riesgos
                    </p>
                    <ul className="space-y-0.5">
                      {phase.risks.slice(0, 3).map((r, i) => (
                        <li key={i} className="text-xs text-neutral-400 flex items-start gap-1">
                          <AlertTriangle size={8} className="text-warning-400 mt-1 flex-shrink-0" /> {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {phase.dependencies.length > 0 && (
                  <div>
                    <p className="text-[10px] text-neutral-600 uppercase tracking-wider flex items-center gap-1 mb-1">
                      <Link2 size={10} /> Dependencias
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {phase.dependencies.map((d, i) => (
                        <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-surface-700 text-neutral-500 font-mono">{d}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Opportunity count */}
              {phase.opportunities.length > 0 && (
                <div className="mt-3 pt-3 border-t border-surface-700">
                  <p className="text-[10px] text-neutral-600">
                    {phase.opportunities.length} oportunidad(es) asignada(s) a esta fase
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
