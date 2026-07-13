import {
  Target, AlertTriangle, CheckCircle2, Info,
  Loader2,
} from 'lucide-react';
import type { PromptAnalysis, AnalysisStatus } from '../../types/prompt';

function ScoreBar({ label, score, inverted = false, description }: {
  label: string; score: number; inverted?: boolean; description: string;
}) {
  const effective = inverted ? 100 - score : score;
  const color = effective >= 80 ? 'bg-success-500' : effective >= 55 ? 'bg-warning-500' : 'bg-error-500';
  const textColor = effective >= 80 ? 'text-success-400' : effective >= 55 ? 'text-warning-400' : 'text-error-400';

  return (
    <div className="group">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-medium text-neutral-400">{label}</span>
        <span className={`text-[11px] font-bold font-mono ${textColor}`}>{score}</span>
      </div>
      <div className="h-1.5 bg-surface-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${score}%` }} />
      </div>
      <p className="text-[9px] text-neutral-700 mt-0.5 leading-tight opacity-0 group-hover:opacity-100 transition-opacity">{description}</p>
    </div>
  );
}

function QualityGauge({ value }: { value: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const dash = (value / 100) * (c * 0.75);
  const offset = c * 0.125;
  const color = value >= 80 ? '#22c55e' : value >= 60 ? '#f59e0b' : '#ef4444';
  const label = value >= 80 ? 'Excelente' : value >= 60 ? 'Bueno' : value >= 40 ? 'Regular' : 'Mejorable';

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-28 h-28">
        <svg className="w-full h-full" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={r} fill="none" strokeWidth="8"
            stroke="rgba(255,255,255,0.05)"
            strokeDasharray={`${c * 0.75} ${c * 0.25}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(135 50 50)"
          />
          <circle cx="50" cy="50" r={r} fill="none" strokeWidth="8"
            stroke={color}
            strokeDasharray={`${dash} ${c - dash}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(135 50 50)"
            style={{ transition: 'stroke-dasharray 1s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold font-mono" style={{ color }}>{value}</span>
          <span className="text-[9px] text-neutral-600">/ 100</span>
        </div>
      </div>
      <span className="text-xs font-semibold" style={{ color }}>{label}</span>
    </div>
  );
}

interface PromptAnalyzerProps {
  status:   AnalysisStatus;
  analysis: PromptAnalysis | null;
}

export function PromptAnalyzer({ status, analysis }: PromptAnalyzerProps) {
  if (status === 'analyzing') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-neutral-600">
        <div className="p-4 rounded-2xl bg-surface-800 border border-surface-700">
          <Loader2 size={24} className="animate-spin text-sky-400" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-neutral-400">Analizando prompt...</p>
          <p className="text-[11px] text-neutral-600 mt-1">Evaluando claridad, ambigüedad y completitud</p>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-neutral-600">
        <div className="p-4 rounded-2xl bg-surface-800 border border-surface-700">
          <Target size={24} />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-neutral-500">Sin análisis</p>
          <p className="text-[11px] text-neutral-700 mt-1">Pulsa "Optimize Prompt" para analizar tu prompt</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 space-y-5">
      {/* Quality gauge + dimensions */}
      <div className="flex items-start gap-6">
        <div className="flex-shrink-0">
          <QualityGauge value={analysis.qualityScore} />
          <p className="text-[10px] text-neutral-600 text-center mt-1">Calidad global</p>
        </div>
        <div className="flex-1 space-y-2.5">
          <ScoreBar label="Claridad"      score={analysis.clarity.score}      description={analysis.clarity.description} />
          <ScoreBar label="Especificidad" score={analysis.specificity.score}   description={analysis.specificity.description} />
          <ScoreBar label="Completitud"   score={analysis.completeness.score}  description={analysis.completeness.description} />
          <ScoreBar label="Ambigüedad"    score={analysis.ambiguity.score}     inverted description={analysis.ambiguity.description} />
          <ScoreBar label="Complejidad"   score={analysis.complexity.score}    description={analysis.complexity.description} />
        </div>
      </div>

      {/* Objectives */}
      {analysis.objectives.length > 0 && (
        <div>
          <p className="text-[10px] font-medium text-neutral-600 uppercase tracking-wider mb-2">Objetivos Detectados</p>
          <div className="space-y-1.5">
            {analysis.objectives.map((obj, i) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-success-500/5 border border-success-500/15">
                <CheckCircle2 size={11} className="text-success-400 mt-0.5 flex-shrink-0" />
                <span className="text-[11px] text-neutral-400 leading-relaxed">{obj}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Missing info */}
      {analysis.missingInfo.length > 0 && (
        <div>
          <p className="text-[10px] font-medium text-neutral-600 uppercase tracking-wider mb-2">Información Faltante</p>
          <div className="space-y-1.5">
            {analysis.missingInfo.map((info, i) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-warning-400/5 border border-warning-400/15">
                <Info size={11} className="text-warning-400 mt-0.5 flex-shrink-0" />
                <span className="text-[11px] text-neutral-400 leading-relaxed">{info}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risks */}
      {analysis.risks.length > 0 && (
        <div>
          <p className="text-[10px] font-medium text-neutral-600 uppercase tracking-wider mb-2">Riesgos Detectados</p>
          <div className="space-y-1.5">
            {analysis.risks.map((risk, i) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-error-500/5 border border-error-500/15">
                <AlertTriangle size={11} className="text-error-400 mt-0.5 flex-shrink-0" />
                <span className="text-[11px] text-neutral-400 leading-relaxed">{risk}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
