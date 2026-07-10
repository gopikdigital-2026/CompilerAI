import React from 'react';
import {
  X, HelpCircle, CheckCircle2, XCircle, AlertTriangle,
  Bot, Wrench, Tag, ChevronRight,
} from 'lucide-react';
import type { BrainDecision, RiskLevel, DecisionStatus } from '../../types/brain';

const RISK_CONFIG: Record<RiskLevel, { label: string; color: string }> = {
  low:      { label: 'Bajo',    color: 'text-success-400 bg-success-400/10 border-success-400/20' },
  medium:   { label: 'Medio',   color: 'text-warning-400 bg-warning-400/10 border-warning-400/20' },
  high:     { label: 'Alto',    color: 'text-orange-400 bg-orange-400/10 border-orange-400/20' },
  critical: { label: 'Crítico', color: 'text-error-400 bg-error-400/10 border-error-400/20' },
};

const STATUS_CONFIG: Record<DecisionStatus, { label: string; color: string }> = {
  executed: { label: 'Ejecutada', color: 'text-success-400' },
  pending:  { label: 'Pendiente', color: 'text-warning-400' },
  rejected: { label: 'Rechazada', color: 'text-error-400' },
};

interface WhyModalProps {
  decision: BrainDecision | null;
  onClose: () => void;
}

export function WhyModal({ decision, onClose }: WhyModalProps) {
  if (!decision) return null;

  const riskCfg = RISK_CONFIG[decision.riskLevel];
  const statusCfg = STATUS_CONFIG[decision.status];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-end p-4 pointer-events-none"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-lg h-[85vh] bg-surface-900 border border-surface-600 rounded-2xl shadow-2xl flex flex-col overflow-hidden pointer-events-auto animate-slide-up">
        {/* Header */}
        <div className="flex items-start gap-3 p-5 border-b border-surface-700 flex-shrink-0">
          <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 flex-shrink-0">
            <HelpCircle size={16} className="text-sky-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-medium text-sky-400 uppercase tracking-wider mb-1">¿Por qué tomé esta decisión?</p>
            <p className="text-sm font-semibold text-neutral-100 leading-snug">{decision.title}</p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${riskCfg.color}`}>
                Riesgo: {riskCfg.label}
              </span>
              <span className={`text-[10px] font-medium ${statusCfg.color}`}>{statusCfg.label}</span>
              <span className={`text-[10px] font-mono font-bold ${decision.confidence >= 90 ? 'text-success-400' : 'text-warning-400'}`}>
                {decision.confidence}% confianza
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-700 text-neutral-600 hover:text-neutral-300 transition-colors flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Explanation */}
          <section>
            <p className="text-[10px] font-medium text-neutral-600 uppercase tracking-wider mb-2">Explicación</p>
            <p className="text-sm text-neutral-300 leading-relaxed">{decision.explanation}</p>
          </section>

          {/* Reason */}
          <section>
            <p className="text-[10px] font-medium text-neutral-600 uppercase tracking-wider mb-2">Razón Principal</p>
            <div className="p-3 rounded-xl bg-sky-500/5 border border-sky-500/20">
              <p className="text-[11px] text-sky-300 leading-relaxed">{decision.reason}</p>
            </div>
          </section>

          {/* Alternatives considered */}
          {decision.alternatives.length > 0 && (
            <section>
              <p className="text-[10px] font-medium text-neutral-600 uppercase tracking-wider mb-2">
                Alternativas Consideradas y Rechazadas
              </p>
              <div className="space-y-2">
                {decision.alternatives.map((alt, i) => (
                  <div key={i} className="p-3 rounded-xl border border-surface-600 bg-surface-800">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-semibold text-neutral-300">{alt.label}</p>
                      <span className="text-[10px] font-mono text-neutral-600">{alt.confidence}%</span>
                    </div>
                    <p className="text-[11px] text-neutral-500 mb-1.5">{alt.description}</p>
                    <div className="flex items-start gap-1.5">
                      <XCircle size={10} className="text-error-400 mt-0.5 flex-shrink-0" />
                      <p className="text-[10px] text-error-400 leading-relaxed">{alt.rejectedBecause}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* What-if */}
          <section>
            <p className="text-[10px] font-medium text-neutral-600 uppercase tracking-wider mb-2">
              ¿Qué hubiera pasado?
            </p>
            <div className="p-3 rounded-xl bg-warning-400/5 border border-warning-400/20">
              <div className="flex items-start gap-2">
                <AlertTriangle size={12} className="text-warning-400 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-warning-300 leading-relaxed">{decision.whatIf}</p>
              </div>
            </div>
          </section>

          {/* Risks avoided */}
          {decision.risksAvoided.length > 0 && (
            <section>
              <p className="text-[10px] font-medium text-neutral-600 uppercase tracking-wider mb-2">
                Riesgos Evitados
              </p>
              <ul className="space-y-1.5">
                {decision.risksAvoided.map((risk, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 size={10} className="text-success-400 mt-0.5 flex-shrink-0" />
                    <span className="text-[11px] text-neutral-400 leading-relaxed">{risk}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Agents & Tools */}
          <section>
            <p className="text-[10px] font-medium text-neutral-600 uppercase tracking-wider mb-2">
              Agentes & Herramientas Involucrados
            </p>
            <div className="space-y-2">
              {decision.agents.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Bot size={11} className="text-neutral-600" />
                  {decision.agents.map(a => (
                    <span key={a} className="text-[10px] bg-surface-700 border border-surface-600 text-neutral-400 px-2 py-0.5 rounded-full">{a}</span>
                  ))}
                </div>
              )}
              {decision.tools.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Wrench size={11} className="text-neutral-600" />
                  {decision.tools.map(t => (
                    <span key={t} className="text-[10px] bg-surface-700 border border-surface-600 text-neutral-400 px-2 py-0.5 rounded-full">{t}</span>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Tags */}
          {decision.tags.length > 0 && (
            <section>
              <div className="flex items-center gap-2 flex-wrap">
                <Tag size={10} className="text-neutral-700" />
                {decision.tags.map(tag => (
                  <span key={tag} className="text-[10px] text-neutral-700 bg-surface-750 border border-surface-700 px-1.5 py-0.5 rounded-full">
                    #{tag}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
