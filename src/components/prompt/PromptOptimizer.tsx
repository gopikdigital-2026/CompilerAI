import React from 'react';
import {
  Zap, DollarSign, Shield, Building2, Scissors, CheckCircle2,
  Loader2, Layers, Copy, ArrowRight,
} from 'lucide-react';
import type { PromptVariant, VariantType, OptimizationStatus } from '../../types/prompt';

const VARIANT_CONFIG: Record<VariantType, { icon: React.ReactNode; color: string; border: string }> = {
  original:   { icon: <Layers size={13} />,      color: 'text-neutral-400',   border: 'border-surface-600' },
  optimized:  { icon: <Zap size={13} />,          color: 'text-sky-400',       border: 'border-sky-500/30' },
  enterprise: { icon: <Building2 size={13} />,    color: 'text-purple-400',    border: 'border-purple-500/30' },
  technical:  { icon: <Shield size={13} />,       color: 'text-amber-400',     border: 'border-amber-500/30' },
  concise:    { icon: <Scissors size={13} />,     color: 'text-success-400',   border: 'border-success-500/30' },
};

interface PromptOptimizerProps {
  status:          OptimizationStatus;
  variants:        PromptVariant[];
  selectedVariant: VariantType;
  onSelectVariant: (v: VariantType) => void;
  onApplyVariant:  (v: VariantType) => void;
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

export function PromptOptimizer({
  status, variants, selectedVariant, onSelectVariant, onApplyVariant,
}: PromptOptimizerProps) {
  if (status === 'optimizing') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-neutral-600">
        <div className="p-4 rounded-2xl bg-surface-800 border border-surface-700">
          <Loader2 size={24} className="animate-spin text-sky-400" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-neutral-400">Generando variantes...</p>
          <p className="text-[11px] text-neutral-600 mt-1">Optimizado · Enterprise · Técnico · Resumido</p>
        </div>
      </div>
    );
  }

  if (!variants.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-neutral-600">
        <div className="p-4 rounded-2xl bg-surface-800 border border-surface-700">
          <Layers size={24} />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-neutral-500">Sin variantes</p>
          <p className="text-[11px] text-neutral-700 mt-1">Pulsa "Optimize Prompt" para generar versiones</p>
        </div>
      </div>
    );
  }

  const current = variants.find(v => v.type === selectedVariant) ?? variants[0];
  const cfg = VARIANT_CONFIG[current.type];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Variant tabs */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-surface-700 overflow-x-auto flex-shrink-0">
        {variants.map(v => {
          const vcfg = VARIANT_CONFIG[v.type];
          const isSelected = v.type === selectedVariant;
          return (
            <button
              key={v.type}
              onClick={() => onSelectVariant(v.type)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all border flex-shrink-0
                ${isSelected
                  ? `${vcfg.color} ${vcfg.border} bg-surface-750`
                  : 'text-neutral-600 border-transparent hover:text-neutral-400'}`}
            >
              <span className={vcfg.color}>{vcfg.icon}</span>
              {v.label}
              <span className={`text-[9px] font-mono ${isSelected ? '' : 'text-neutral-700'}`}>{v.tokens}t</span>
            </button>
          );
        })}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-xs font-semibold ${cfg.color}`}>{current.label}</p>
            <p className="text-[10px] text-neutral-600">{current.tagline}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 text-[10px] font-mono font-bold px-2 py-1 rounded-lg border ${
              current.qualityScore >= 90 ? 'text-success-400 bg-success-400/10 border-success-400/20' :
              current.qualityScore >= 75 ? 'text-warning-400 bg-warning-400/10 border-warning-400/20' :
              'text-neutral-400 bg-surface-700 border-surface-600'
            }`}>
              <CheckCircle2 size={9} /> {current.qualityScore}%
            </div>
            <button
              onClick={() => copyToClipboard(current.content)}
              className="flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded-lg border border-surface-600 text-neutral-500 hover:text-neutral-300 hover:border-surface-500 transition-all"
            >
              <Copy size={10} /> Copiar
            </button>
            {current.type !== 'original' && (
              <button
                onClick={() => onApplyVariant(current.type)}
                className={`flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded-lg border transition-all ${cfg.border} ${cfg.color} hover:opacity-80`}
              >
                <ArrowRight size={10} /> Aplicar
              </button>
            )}
          </div>
        </div>

        {/* Prompt content */}
        <div className={`rounded-xl border ${cfg.border} bg-surface-800 p-4`}>
          <p className="text-[11px] text-neutral-300 leading-relaxed whitespace-pre-wrap font-mono">
            {current.content}
          </p>
        </div>

        {/* Improvements */}
        {current.improvements.length > 0 && (
          <div>
            <p className="text-[10px] font-medium text-neutral-600 uppercase tracking-wider mb-2">Mejoras aplicadas</p>
            <div className="space-y-1">
              {current.improvements.map((imp, i) => (
                <div key={i} className="flex items-center gap-2">
                  <CheckCircle2 size={10} className="text-success-400 flex-shrink-0" />
                  <span className="text-[11px] text-neutral-500">{imp}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
