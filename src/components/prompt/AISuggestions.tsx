import React from 'react';
import {
  AlertTriangle, AlertCircle, Info, Lightbulb, Check, X,
  MessageSquarePlus,
} from 'lucide-react';
import type { AISuggestion, SuggestionSeverity } from '../../types/prompt';

const SEVERITY_CONFIG: Record<SuggestionSeverity, {
  icon: React.ReactNode; color: string; border: string; bg: string; label: string;
}> = {
  critical: { icon: <AlertCircle size={13} />,   color: 'text-error-400',   border: 'border-error-400/25',   bg: 'bg-error-400/5',   label: 'Crítico' },
  warning:  { icon: <AlertTriangle size={13} />, color: 'text-warning-400', border: 'border-warning-400/25', bg: 'bg-warning-400/5', label: 'Aviso' },
  info:     { icon: <Info size={13} />,          color: 'text-sky-400',     border: 'border-sky-400/25',     bg: 'bg-sky-400/5',     label: 'Info' },
  tip:      { icon: <Lightbulb size={13} />,     color: 'text-amber-400',   border: 'border-amber-400/25',   bg: 'bg-amber-400/5',   label: 'Consejo' },
};

const CATEGORY_LABELS: Record<AISuggestion['category'], string> = {
  missing:       'Faltante',
  structure:     'Estructura',
  optimization:  'Optimización',
  risk:          'Riesgo',
  'best-practice': 'Buenas prácticas',
};

interface AISuggestionsProps {
  suggestions:    AISuggestion[];
  onDismiss:      (id: string) => void;
}

export function AISuggestions({ suggestions, onDismiss }: AISuggestionsProps) {
  if (!suggestions.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-neutral-600">
        <div className="p-4 rounded-2xl bg-surface-800 border border-surface-700">
          <MessageSquarePlus size={24} />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-neutral-500">Sin sugerencias</p>
          <p className="text-[11px] text-neutral-700 mt-1">Pulsa "Optimize Prompt" para recibir recomendaciones</p>
        </div>
      </div>
    );
  }

  const active   = suggestions.filter(s => !s.implemented);
  const resolved = suggestions.filter(s => s.implemented);
  const criticalCount = active.filter(s => s.severity === 'critical').length;

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 space-y-4">
      {/* Summary */}
      <div className="flex items-center gap-3">
        <div className={`flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-xl border
          ${criticalCount > 0 ? 'text-error-400 bg-error-400/10 border-error-400/20' : 'text-success-400 bg-success-400/10 border-success-400/20'}`}>
          {criticalCount > 0 ? <AlertCircle size={11} /> : <Check size={11} />}
          {criticalCount > 0 ? `${criticalCount} crítico${criticalCount > 1 ? 's' : ''}` : 'Sin críticos'}
        </div>
        <span className="text-[10px] text-neutral-600">{active.length} pendientes · {resolved.length} resueltas</span>
      </div>

      {/* Active suggestions */}
      <div className="space-y-2.5">
        {active.map(sug => {
          const cfg = SEVERITY_CONFIG[sug.severity];
          return (
            <div key={sug.id}
              className={`rounded-xl border ${cfg.border} ${cfg.bg} p-4 transition-all`}
            >
              <div className="flex items-start gap-3">
                <div className={`${cfg.color} mt-0.5 flex-shrink-0`}>{cfg.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className={`text-xs font-semibold ${cfg.color}`}>{sug.title}</p>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${cfg.border} ${cfg.color} opacity-70`}>
                      {cfg.label}
                    </span>
                    <span className="text-[9px] text-neutral-700">{CATEGORY_LABELS[sug.category]}</span>
                  </div>
                  <p className="text-[11px] text-neutral-500 leading-relaxed mb-2">{sug.description}</p>
                  {/* Action */}
                  <div className="p-2 rounded-lg bg-surface-800 border border-surface-700">
                    <p className="text-[10px] text-neutral-700 font-medium mb-0.5">Acción sugerida:</p>
                    <p className="text-[10px] text-neutral-400 leading-relaxed">{sug.action}</p>
                  </div>
                </div>
                <button
                  onClick={() => onDismiss(sug.id)}
                  className="p-1 rounded-lg hover:bg-surface-700 text-neutral-700 hover:text-neutral-400 transition-colors flex-shrink-0"
                  title="Marcar como aplicada"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Resolved */}
      {resolved.length > 0 && (
        <div>
          <p className="text-[10px] font-medium text-neutral-700 uppercase tracking-wider mb-2">
            Aplicadas ({resolved.length})
          </p>
          <div className="space-y-1.5">
            {resolved.map(sug => (
              <div key={sug.id} className="flex items-center gap-2 p-2 rounded-lg bg-surface-850 border border-surface-700 opacity-50">
                <Check size={10} className="text-success-400 flex-shrink-0" />
                <span className="text-[10px] text-neutral-600 line-through">{sug.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
