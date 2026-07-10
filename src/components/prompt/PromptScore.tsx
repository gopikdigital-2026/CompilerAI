import React from 'react';
import { DollarSign, Clock, TrendingUp, Activity } from 'lucide-react';
import type { PromptScoreMetrics } from '../../types/prompt';

function RadialGauge({ value, label, color, size = 56 }: {
  value: number; label: string; color: string; size?: number;
}) {
  const r = (size / 2) - 6;
  const c = 2 * Math.PI * r;
  const dash = (value / 100) * c;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size / 2} cy={size / 2} r={r}
            fill="none" strokeWidth="5" stroke="rgba(255,255,255,0.06)" />
          <circle cx={size / 2} cy={size / 2} r={r}
            fill="none" strokeWidth="5"
            stroke={color}
            strokeDasharray={`${dash} ${c}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.8s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[11px] font-bold font-mono" style={{ color }}>{value}</span>
        </div>
      </div>
      <span className="text-[9px] text-neutral-600 text-center leading-tight">{label}</span>
    </div>
  );
}

function ScoreRow({ label, value, unit, icon, color }: {
  label: string; value: string; unit?: string; icon: React.ReactNode; color: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-surface-700 last:border-0">
      <div className={`p-1.5 rounded-lg bg-surface-700 ${color} flex-shrink-0`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-neutral-600">{label}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className={`text-sm font-bold font-mono ${color}`}>{value}</p>
        {unit && <p className="text-[9px] text-neutral-700">{unit}</p>}
      </div>
    </div>
  );
}

interface PromptScoreProps {
  score: PromptScoreMetrics | null;
}

export function PromptScore({ score }: PromptScoreProps) {
  if (!score) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="px-4 py-2.5 border-b border-surface-700 flex-shrink-0">
          <p className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Prompt Score</p>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-4 text-center">
          <Activity size={24} className="text-neutral-700" />
          <p className="text-xs text-neutral-600">Score disponible después del análisis</p>
        </div>
      </div>
    );
  }

  const qualityColor  = score.quality >= 80 ? '#22c55e' : score.quality >= 60 ? '#f59e0b' : '#ef4444';
  const precisionColor = score.precision >= 80 ? '#22c55e' : score.precision >= 60 ? '#f59e0b' : '#ef4444';
  const riskColor = score.risk <= 25 ? '#22c55e' : score.risk <= 50 ? '#f59e0b' : '#ef4444';
  const successColor = score.successProbability >= 85 ? '#22c55e' : '#f59e0b';

  const overallLabel = score.quality >= 80 ? 'Excelente' : score.quality >= 60 ? 'Bueno' : 'Mejorable';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-2.5 border-b border-surface-700 flex-shrink-0">
        <p className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Prompt Score</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Gauge grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 flex justify-center">
            <RadialGauge value={score.quality} label="Calidad" color={qualityColor} size={72} />
          </div>
          <RadialGauge value={score.precision}          label="Precisión"   color={precisionColor} />
          <RadialGauge value={100 - score.risk}         label="Seguridad"   color={riskColor} />
          <RadialGauge value={score.successProbability} label="Éxito"       color={successColor} />
          <RadialGauge value={Math.min(100, Math.round((1 - score.estimatedCostUsd / 0.2) * 100))}
            label="Eficiencia" color="#38bdf8" />
        </div>

        {/* Overall label */}
        <div className="text-center py-2 rounded-xl border border-surface-600 bg-surface-800">
          <p className="text-[11px] text-neutral-600 mb-0.5">Evaluación global</p>
          <p className="text-sm font-bold" style={{ color: qualityColor }}>{overallLabel}</p>
        </div>

        {/* Metrics */}
        <div className="rounded-xl border border-surface-600 bg-surface-800 px-4 divide-y divide-surface-700">
          <ScoreRow
            label="Coste estimado"
            value={`$${score.estimatedCostUsd.toFixed(3)}`}
            unit="por ejecución"
            icon={<DollarSign size={11} />}
            color={score.estimatedCostUsd < 0.05 ? 'text-success-400' : 'text-warning-400'}
          />
          <ScoreRow
            label="Tiempo estimado"
            value={`${score.estimatedTimeS.toFixed(1)}s`}
            unit="promedio"
            icon={<Clock size={11} />}
            color={score.estimatedTimeS < 10 ? 'text-success-400' : 'text-warning-400'}
          />
          <ScoreRow
            label="Prob. de éxito"
            value={`${score.successProbability}%`}
            icon={<TrendingUp size={11} />}
            color={score.successProbability >= 85 ? 'text-success-400' : 'text-warning-400'}
          />
          <ScoreRow
            label="Nivel de riesgo"
            value={score.risk <= 25 ? 'Bajo' : score.risk <= 50 ? 'Medio' : 'Alto'}
            icon={<Activity size={11} />}
            color={score.risk <= 25 ? 'text-success-400' : score.risk <= 50 ? 'text-warning-400' : 'text-error-400'}
          />
        </div>
      </div>
    </div>
  );
}
