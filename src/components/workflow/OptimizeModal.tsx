import { X, Sparkles, Loader2, Zap, DollarSign, Clock, GitMerge, RotateCcw, CheckCircle } from 'lucide-react';
import type { OptimizationSuggestion } from '../../types/workflow';

interface OptimizeModalProps {
  suggestions: OptimizationSuggestion[];
  isLoading:   boolean;
  onClose:     () => void;
}

const TYPE_CONFIG = {
  merge:  { label: 'Fusionar',     icon: <GitMerge size={13} />,   color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
  remove: { label: 'Eliminar',     icon: <RotateCcw size={13} />,  color: '#fb7185', bg: 'rgba(251,113,133,0.1)' },
  cost:   { label: 'Costo',        icon: <DollarSign size={13} />, color: '#34d399', bg: 'rgba(52,211,153,0.1)'  },
  time:   { label: 'Tiempo',       icon: <Clock size={13} />,      color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
  reuse:  { label: 'Reutilizar',   icon: <Zap size={13} />,        color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
};

const EFFORT_LABEL: Record<string, string> = {
  low: 'Fácil', medium: 'Medio', high: 'Complejo',
};

export function OptimizeModal({ suggestions, isLoading, onClose }: OptimizeModalProps) {
  return (
    <div className="absolute top-0 right-0 bottom-0 w-80 bg-surface-900 border-l border-surface-800 shadow-2xl z-20 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-800">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-violet-400" />
          <span className="text-sm font-semibold text-neutral-200">Optimizaciones</span>
        </div>
        <button onClick={onClose} className="w-6 h-6 flex items-center justify-center text-neutral-600 hover:text-neutral-300 rounded hover:bg-surface-700 transition-colors">
          <X size={13} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Loader2 size={24} className="text-violet-400 animate-spin" />
            <p className="text-xs text-neutral-400">Analizando workflow con AI Brain...</p>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-4">
            <div className="w-12 h-12 rounded-full bg-green-900/30 flex items-center justify-center">
              <CheckCircle size={22} className="text-green-500" />
            </div>
            <p className="text-xs text-neutral-400 text-center">El workflow está bien optimizado. No hay sugerencias pendientes.</p>
          </div>
        ) : (
          <div className="py-3 space-y-2 px-3">
            <p className="text-[10px] text-neutral-600 px-1">{suggestions.length} sugerencias encontradas</p>
            {suggestions.map(s => {
              const tc = TYPE_CONFIG[s.type];
              return (
                <div key={s.id} className="bg-surface-800 rounded-xl border border-surface-700 overflow-hidden hover:border-surface-600 transition-colors">
                  {/* Top bar */}
                  <div className="flex items-center justify-between px-3 py-2.5 border-b border-surface-700/50">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: tc.bg, color: tc.color }}>
                        {tc.icon}
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-neutral-200 leading-none">{s.title}</p>
                        <p className="text-[9px] mt-0.5" style={{ color: tc.color }}>{tc.label}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-green-400">-{s.savingPercent}%</p>
                      <p className="text-[9px] text-neutral-600">ahorro</p>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="px-3 py-2.5">
                    <p className="text-[10px] text-neutral-400 leading-relaxed">{s.description}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        s.effort === 'low'    ? 'bg-green-900/30 text-green-400' :
                        s.effort === 'medium' ? 'bg-amber-900/30 text-amber-400' :
                        'bg-red-900/30 text-red-400'
                      }`}>{EFFORT_LABEL[s.effort]}</span>
                      <span className="text-[9px] text-neutral-600">{s.affectedNodes.length} nodo{s.affectedNodes.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
