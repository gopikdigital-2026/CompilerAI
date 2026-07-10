import React, { useState } from 'react';
import {
  CheckCircle2, Clock, Circle, ChevronDown, ChevronRight,
  GitBranch, AlertCircle, Zap,
} from 'lucide-react';
import type { MasterPlan, PlanObjective, PriorityLevel } from '../../types/brain';

const PRIORITY_CONFIG: Record<PriorityLevel, { label: string; color: string }> = {
  critical: { label: 'Crítico', color: 'text-error-400 bg-error-400/10 border-error-400/20' },
  high:     { label: 'Alto',    color: 'text-orange-400 bg-orange-400/10 border-orange-400/20' },
  medium:   { label: 'Medio',   color: 'text-warning-400 bg-warning-400/10 border-warning-400/20' },
  low:      { label: 'Bajo',    color: 'text-success-400 bg-success-400/10 border-success-400/20' },
};

const STATUS_CONFIG = {
  complete:    { icon: <CheckCircle2 size={14} />, color: 'text-success-400', bar: 'bg-success-500' },
  'in-progress': { icon: <Clock size={14} />,       color: 'text-warning-400', bar: 'bg-warning-500' },
  pending:     { icon: <Circle size={14} />,        color: 'text-neutral-600', bar: 'bg-surface-600' },
} as const;

function ObjectiveCard({ obj, index, allObjectives }: {
  obj: PlanObjective;
  index: number;
  allObjectives: PlanObjective[];
}) {
  const [expanded, setExpanded] = useState(index < 2);
  const priorityCfg = PRIORITY_CONFIG[obj.priority];
  const statusCfg = STATUS_CONFIG[obj.status];
  const deps = obj.dependencies.map(depId => allObjectives.find(o => o.id === depId)).filter(Boolean) as PlanObjective[];

  const progress = obj.status === 'complete' ? 100 : obj.status === 'in-progress' ? 55 : 0;

  return (
    <div className={`rounded-xl border bg-surface-800 overflow-hidden transition-all
      ${obj.status === 'in-progress' ? 'border-warning-500/40' : 'border-surface-600'}`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-surface-750 transition-colors"
      >
        <div className="flex-shrink-0 mt-0.5">
          <div className={statusCfg.color}>{statusCfg.icon}</div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-[10px] text-neutral-600 font-mono">OBJ-{index + 1}</span>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${priorityCfg.color}`}>
              {priorityCfg.label}
            </span>
            <span className={`text-[10px] font-medium ${statusCfg.color}`}>
              {obj.status === 'complete' ? 'Completado' : obj.status === 'in-progress' ? 'En progreso' : 'Pendiente'}
            </span>
          </div>
          <p className="text-sm font-semibold text-neutral-100 leading-snug">{obj.title}</p>
          <p className="text-[11px] text-neutral-500 mt-0.5 line-clamp-1">{obj.description}</p>
        </div>
        <div className="flex-shrink-0 flex flex-col items-end gap-1">
          <span className="text-[10px] text-neutral-600">{obj.estimatedHours}h</span>
          <div className={`text-neutral-500 transition-transform ${expanded ? 'rotate-180' : ''}`}>
            <ChevronDown size={14} />
          </div>
        </div>
      </button>

      {/* Progress bar */}
      <div className="h-0.5 bg-surface-700 mx-4">
        <div className={`h-full ${statusCfg.bar} rounded-full transition-all`} style={{ width: `${progress}%` }} />
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="p-4 pt-3 space-y-3 border-t border-surface-700">
          {/* Sub-objectives */}
          <div>
            <p className="text-[10px] font-medium text-neutral-600 uppercase tracking-wider mb-2">
              Sub-objetivos ({obj.subObjectives.length})
            </p>
            <ul className="space-y-1.5">
              {obj.subObjectives.map((sub, i) => (
                <li key={i} className="flex items-start gap-2">
                  <ChevronRight size={10} className="text-sky-500 mt-1 flex-shrink-0" />
                  <span className="text-[11px] text-neutral-400 leading-relaxed">{sub}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Dependencies */}
          {deps.length > 0 && (
            <div>
              <p className="text-[10px] font-medium text-neutral-600 uppercase tracking-wider mb-2">
                Dependencias
              </p>
              <div className="flex flex-wrap gap-1.5">
                {deps.map(dep => (
                  <div key={dep.id} className={`flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-lg border
                    ${STATUS_CONFIG[dep.status].color} bg-surface-700 border-surface-600`}>
                    <GitBranch size={9} />
                    <span>{dep.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alternative routes */}
          {obj.alternativeRoutes.length > 0 && (
            <div>
              <p className="text-[10px] font-medium text-neutral-600 uppercase tracking-wider mb-2">
                Rutas Alternativas
              </p>
              <div className="space-y-1">
                {obj.alternativeRoutes.map((route, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-surface-750 border border-surface-700">
                    <GitBranch size={9} className="text-neutral-600 mt-1 flex-shrink-0" />
                    <span className="text-[11px] text-neutral-500 leading-relaxed">{route}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Confidence */}
          <div className="flex items-center justify-between pt-1 border-t border-surface-700">
            <span className="text-[10px] text-neutral-700">Confianza del plan</span>
            <div className="flex items-center gap-2">
              <div className="w-20 h-1 bg-surface-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${obj.confidence >= 90 ? 'bg-success-500' : obj.confidence >= 70 ? 'bg-warning-500' : 'bg-error-500'}`}
                  style={{ width: `${obj.confidence}%` }}
                />
              </div>
              <span className="text-[10px] font-bold font-mono text-neutral-400">{obj.confidence}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface PlanningEngineProps {
  plan: MasterPlan;
}

export function PlanningEngine({ plan }: PlanningEngineProps) {
  const completed = plan.objectives.filter(o => o.status === 'complete').length;
  const inProgress = plan.objectives.filter(o => o.status === 'in-progress').length;
  const pending = plan.objectives.filter(o => o.status === 'pending').length;
  const overallProgress = Math.round((completed / plan.objectives.length) * 100);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Plan header */}
      <div className="px-4 py-3 border-b border-surface-700 flex-shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-neutral-200 leading-snug">{plan.title}</p>
            <p className="text-[11px] text-neutral-500 mt-0.5 line-clamp-2">{plan.description}</p>
          </div>
          <div className="flex-shrink-0 text-right">
            <p className="text-[10px] text-neutral-600">Confianza</p>
            <p className={`text-sm font-bold font-mono ${plan.confidence >= 90 ? 'text-success-400' : 'text-warning-400'}`}>
              {plan.confidence}%
            </p>
          </div>
        </div>

        {/* Progress summary */}
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-[10px]">
              <span className="text-success-400 flex items-center gap-1"><CheckCircle2 size={9} /> {completed} completados</span>
              <span className="text-warning-400 flex items-center gap-1"><Clock size={9} /> {inProgress} en progreso</span>
              <span className="text-neutral-600 flex items-center gap-1"><Circle size={9} /> {pending} pendientes</span>
            </div>
            <span className="text-[10px] font-mono text-neutral-400">{overallProgress}%</span>
          </div>
          <div className="h-1.5 bg-surface-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-500 to-success-500 rounded-full transition-all"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 mt-3 text-[10px] text-neutral-600">
          <span className="flex items-center gap-1"><Zap size={9} /> {plan.totalHours}h estimadas</span>
          <span className="flex items-center gap-1"><AlertCircle size={9} /> {plan.totalDays} días</span>
          <span className="flex items-center gap-1"><GitBranch size={9} /> {plan.objectives.length} objetivos</span>
        </div>
      </div>

      {/* Objectives list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {plan.objectives.map((obj, i) => (
          <ObjectiveCard key={obj.id} obj={obj} index={i} allObjectives={plan.objectives} />
        ))}
      </div>
    </div>
  );
}
