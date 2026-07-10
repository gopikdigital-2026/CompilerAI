import React from 'react';
import {
  Zap, BarChart2, Search, FileText, Plug, TrendingUp, Loader2, Radar,
} from 'lucide-react';
import type { IntentResult, IntentType } from '../../types/prompt';

const INTENT_ICONS: Record<IntentType, React.ReactNode> = {
  automation:  <Zap size={16} />,
  analysis:    <BarChart2 size={16} />,
  research:    <Search size={16} />,
  creation:    <FileText size={16} />,
  integration: <Plug size={16} />,
  reporting:   <TrendingUp size={16} />,
};

const INTENT_COLORS: Record<IntentType, string> = {
  automation:  'text-amber-400 bg-amber-400/10 border-amber-400/20',
  analysis:    'text-sky-400 bg-sky-400/10 border-sky-400/20',
  research:    'text-blue-400 bg-blue-400/10 border-blue-400/20',
  creation:    'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
  integration: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  reporting:   'text-success-400 bg-success-400/10 border-success-400/20',
};

const INTENT_BAR: Record<IntentType, string> = {
  automation:  'bg-amber-500',
  analysis:    'bg-sky-500',
  research:    'bg-blue-500',
  creation:    'bg-cyan-500',
  integration: 'bg-purple-500',
  reporting:   'bg-success-500',
};

interface IntentDetectionProps {
  intents:  IntentResult[];
  loading?: boolean;
}

export function IntentDetection({ intents, loading }: IntentDetectionProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-neutral-600">
        <div className="p-4 rounded-2xl bg-surface-800 border border-surface-700">
          <Loader2 size={24} className="animate-spin text-sky-400" />
        </div>
        <p className="text-sm font-medium text-neutral-400">Detectando intenciones...</p>
      </div>
    );
  }

  if (!intents.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-neutral-600">
        <div className="p-4 rounded-2xl bg-surface-800 border border-surface-700">
          <Radar size={24} />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-neutral-500">Sin análisis</p>
          <p className="text-[11px] text-neutral-700 mt-1">Pulsa "Optimize Prompt" para detectar intenciones</p>
        </div>
      </div>
    );
  }

  const primary = intents[0];

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 space-y-4">
      {/* Primary intent highlight */}
      <div className={`rounded-xl border p-4 ${INTENT_COLORS[primary.type]}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl border ${INTENT_COLORS[primary.type]}`}>
            {INTENT_ICONS[primary.type]}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-sm font-bold">{primary.label}</p>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full border bg-black/20">
                Intención primaria
              </span>
            </div>
            <p className="text-[11px] opacity-80 leading-relaxed">{primary.description}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xl font-bold font-mono">{primary.confidence}%</p>
            <p className="text-[9px] opacity-60">confianza</p>
          </div>
        </div>
      </div>

      {/* All intents */}
      <div>
        <p className="text-[10px] font-medium text-neutral-600 uppercase tracking-wider mb-3">
          Todas las intenciones detectadas
        </p>
        <div className="space-y-3">
          {intents.map(intent => {
            const barColor = INTENT_BAR[intent.type];
            const textColor = INTENT_COLORS[intent.type].split(' ')[0];
            return (
              <div key={intent.type}
                className={`rounded-xl border p-3 transition-all
                  ${intent.detected ? 'border-surface-600 bg-surface-800' : 'border-surface-700 bg-surface-850 opacity-50'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`${textColor} flex-shrink-0`}>{INTENT_ICONS[intent.type]}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className={`text-xs font-semibold ${textColor}`}>{intent.label}</p>
                      <span className={`text-[10px] font-bold font-mono ${textColor}`}>{intent.confidence}%</span>
                    </div>
                    <div className="h-1.5 bg-surface-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${barColor} rounded-full transition-all duration-700`}
                        style={{ width: `${intent.confidence}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-neutral-600 mt-1 leading-tight">{intent.description}</p>
                  </div>
                  {intent.detected && (
                    <div className="w-2 h-2 rounded-full bg-success-400 flex-shrink-0" title="Detectado" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
