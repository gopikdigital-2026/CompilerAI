import {
  Database, Calendar, Gauge, TrendingUp, Target,
  ShieldCheck, AlertCircle, FileSearch, Eye,
} from 'lucide-react';
import type { EvidenceItem } from '../../types/analysis';

interface EvidencePanelProps {
  evidence: EvidenceItem[];
  source: string;
}

function qualityLabel(quality?: 'high' | 'medium' | 'low'): string {
  if (!quality) return '—';
  return quality === 'high' ? 'Alta' : quality === 'medium' ? 'Media' : 'Baja';
}

function qualityColor(quality?: 'high' | 'medium' | 'low'): string {
  if (!quality) return 'text-neutral-500';
  return quality === 'high' ? 'text-success-400' : quality === 'medium' ? 'text-warning-400' : 'text-error-400';
}

export function EvidencePanel({ evidence, source }: EvidencePanelProps) {
  if (!evidence || evidence.length === 0) {
    return (
      <div data-testid="evidence-panel" className="p-4 rounded-lg bg-error-500/5 border border-error-500/20">
        <div className="flex items-start gap-2">
          <AlertCircle size={16} className="text-error-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-error-400 font-medium">Sin evidencias</p>
            <p className="text-xs text-neutral-500 mt-1">
              Información insuficiente para emitir una recomendación fiable.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="evidence-panel" className="space-y-3">
      {evidence.map((ev, i) => (
        <div key={i} className="p-4 rounded-lg bg-surface-800 border border-surface-700 space-y-3">
          {/* Data source */}
          <div className="flex items-center gap-2">
            <Database size={12} className="text-brand-400 flex-shrink-0" />
            <span className="text-xs text-neutral-600">Fuente de datos</span>
            <span className="text-xs text-neutral-300 font-mono px-1.5 py-0.5 rounded bg-surface-700">
              {ev.connector || source}
            </span>
          </div>

          {/* Capture date */}
          <div className="flex items-center gap-2">
            <Calendar size={12} className="text-neutral-500 flex-shrink-0" />
            <span className="text-xs text-neutral-600">Fecha de captura</span>
            <span className="text-xs text-neutral-300">
              {ev.date ? new Date(ev.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
            </span>
          </div>

          {/* Metric used */}
          <div className="flex items-start gap-2">
            <Gauge size={12} className="text-neutral-500 flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="text-xs text-neutral-600">Métrica utilizada</span>
              <p className="text-xs text-neutral-300 mt-0.5">{ev.dataUsed}</p>
            </div>
          </div>

          {/* Observed vs Expected */}
          {(ev.observedValue || ev.expectedValue) && (
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-surface-700">
              <div>
                <span className="text-xs text-neutral-600 flex items-center gap-1">
                  <Eye size={10} /> Valor observado
                </span>
                <p className="text-sm text-neutral-200 mt-0.5 font-mono">{ev.observedValue ?? '—'}</p>
              </div>
              <div>
                <span className="text-xs text-neutral-600 flex items-center gap-1">
                  <Target size={10} /> Valor esperado
                </span>
                <p className="text-sm text-success-400 mt-0.5 font-mono">{ev.expectedValue ?? '—'}</p>
              </div>
            </div>
          )}

          {/* Quality + Confidence */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-surface-700">
            <div className="flex items-center gap-2">
              <ShieldCheck size={12} className="text-neutral-500 flex-shrink-0" />
              <span className="text-xs text-neutral-600">Calidad del dato</span>
              <span className={`text-xs font-medium ${qualityColor(ev.quality)}`}>
                {qualityLabel(ev.quality)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp size={12} className="text-neutral-500 flex-shrink-0" />
              <span className="text-xs text-neutral-600">Confianza</span>
              <span className={`text-xs font-medium ${ev.confidence >= 70 ? 'text-success-400' : ev.confidence >= 40 ? 'text-warning-400' : 'text-error-400'}`}>
                {ev.confidence}%
              </span>
            </div>
          </div>

          {/* Limitations */}
          {ev.limitations && (
            <div className="flex items-start gap-2 pt-2 border-t border-surface-700">
              <AlertCircle size={12} className="text-neutral-500 flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-xs text-neutral-600">Limitaciones</span>
                <p className="text-xs text-neutral-500 mt-0.5">{ev.limitations}</p>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* View original data button */}
      <button
        data-testid="view-original-data"
        onClick={() => track('evidence_viewed_original', { source })}
        className="w-full text-xs text-brand-400 hover:text-brand-300 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-surface-700 hover:border-brand-500/20 transition-colors"
      >
        <FileSearch size={12} /> Ver datos originales
      </button>
    </div>
  );
}

function track(_event: string, _data: Record<string, unknown>) {}
