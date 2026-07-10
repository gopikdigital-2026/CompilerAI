import React, { useState } from 'react';
import {
  ArrowDownCircle, Search, Lightbulb, CheckCircle2, Flag,
  Activity, ChevronDown,
} from 'lucide-react';
import type { ReasoningChain, ReasoningStep, ReasoningStepType } from '../../types/brain';

const STEP_CONFIG: Record<ReasoningStepType, { icon: React.ReactNode; label: string; color: string; dot: string }> = {
  input:      { icon: <ArrowDownCircle size={13} />, label: 'Input',       color: 'text-sky-400',     dot: 'bg-sky-400' },
  analysis:   { icon: <Search size={13} />,          label: 'Análisis',    color: 'text-blue-400',    dot: 'bg-blue-400' },
  hypothesis: { icon: <Lightbulb size={13} />,       label: 'Hipótesis',   color: 'text-amber-400',   dot: 'bg-amber-400' },
  decision:   { icon: <CheckCircle2 size={13} />,    label: 'Decisión',    color: 'text-success-400', dot: 'bg-success-400' },
  conclusion: { icon: <Flag size={13} />,            label: 'Conclusión',  color: 'text-error-400',   dot: 'bg-error-400' },
};

function StepRow({ step, index, total, isLast }: {
  step: ReasoningStep;
  index: number;
  total: number;
  isLast: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STEP_CONFIG[step.type];

  return (
    <div className="flex gap-3">
      {/* Timeline spine */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0
          ${cfg.color} bg-surface-800 border-2 ${cfg.dot.replace('bg-', 'border-')}/40`}>
          {cfg.icon}
        </div>
        {!isLast && <div className="w-px flex-1 bg-surface-700 mt-1 min-h-4" />}
      </div>

      {/* Content */}
      <div className="flex-1 pb-4">
        <button
          onClick={() => step.detail && setExpanded(v => !v)}
          className={`w-full text-left rounded-xl border bg-surface-800 p-3 transition-all
            ${step.detail ? 'hover:border-surface-500 hover:bg-surface-750 cursor-pointer' : 'cursor-default'}
            ${step.type === 'decision' ? 'border-success-500/30' : step.type === 'conclusion' ? 'border-error-500/20' : 'border-surface-600'}`}
        >
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border
                ${cfg.color} ${cfg.dot.replace('bg-', 'bg-')}/10 ${cfg.dot.replace('bg-', 'border-')}/20`}>
                {cfg.label}
              </span>
              <span className="text-[10px] text-neutral-700 font-mono">{step.durationMs}ms</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex items-center gap-1">
                <div className="w-10 h-1 bg-surface-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${step.confidence >= 90 ? 'bg-success-500' : step.confidence >= 70 ? 'bg-warning-500' : 'bg-error-500'}`}
                    style={{ width: `${step.confidence}%` }}
                  />
                </div>
                <span className={`text-[10px] font-mono ${step.confidence >= 90 ? 'text-success-400' : step.confidence >= 70 ? 'text-warning-400' : 'text-error-400'}`}>
                  {step.confidence}%
                </span>
              </div>
              {step.detail && (
                <ChevronDown size={12} className={`text-neutral-600 transition-transform ${expanded ? 'rotate-180' : ''}`} />
              )}
            </div>
          </div>
          <p className="text-[11px] text-neutral-300 leading-relaxed">{step.content}</p>

          {expanded && step.detail && (
            <div className="mt-2 pt-2 border-t border-surface-700">
              <p className="text-[10px] text-neutral-500 leading-relaxed">{step.detail}</p>
            </div>
          )}
        </button>
      </div>
    </div>
  );
}

interface ReasoningEngineProps {
  chain: ReasoningChain;
}

export function ReasoningEngine({ chain }: ReasoningEngineProps) {
  const totalMs = chain.steps.reduce((sum, s) => sum + s.durationMs, 0);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Chain header */}
      <div className="px-4 py-3 border-b border-surface-700 flex-shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-neutral-200 leading-snug">{chain.title}</p>
            <p className="text-[11px] text-neutral-500 mt-0.5 line-clamp-2">
              <span className="text-success-400 font-medium">Conclusión: </span>{chain.conclusion}
            </p>
          </div>
          <div className="flex-shrink-0 text-right">
            <p className="text-[10px] text-neutral-600">Confianza</p>
            <p className={`text-sm font-bold font-mono ${chain.confidence >= 90 ? 'text-success-400' : 'text-warning-400'}`}>
              {chain.confidence}%
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mt-2 text-[10px] text-neutral-600">
          <span className="flex items-center gap-1"><Activity size={9} /> {chain.totalMs}ms total</span>
          <span className="flex items-center gap-1">{chain.steps.length} pasos</span>
          {/* Step type legend */}
          <div className="flex items-center gap-2 ml-auto">
            {(Object.entries(STEP_CONFIG) as [ReasoningStepType, typeof STEP_CONFIG[ReasoningStepType]][]).map(([type, cfg]) => (
              <span key={type} className={`flex items-center gap-1 text-[9px] ${cfg.color}`}>
                {cfg.icon} {cfg.label}
              </span>
            ))}
          </div>
        </div>

        {/* Timeline progress bar */}
        <div className="mt-2 h-1.5 bg-surface-700 rounded-full overflow-hidden flex">
          {chain.steps.map(step => {
            const pct = (step.durationMs / totalMs) * 100;
            const cfg = STEP_CONFIG[step.type];
            return (
              <div
                key={step.id}
                className={`h-full ${cfg.dot} opacity-70`}
                style={{ width: `${pct}%` }}
                title={`${cfg.label}: ${step.durationMs}ms`}
              />
            );
          })}
        </div>
      </div>

      {/* Steps list */}
      <div className="flex-1 overflow-y-auto p-4">
        {chain.steps.map((step, i) => (
          <StepRow
            key={step.id}
            step={step}
            index={i}
            total={chain.steps.length}
            isLast={i === chain.steps.length - 1}
          />
        ))}
      </div>
    </div>
  );
}
