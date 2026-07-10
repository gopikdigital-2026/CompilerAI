import React from 'react';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import type { BrainDecision, DecisionStatus, RiskLevel } from '../../types/brain';

const STATUS_DOT: Record<DecisionStatus, string> = {
  executed: 'bg-success-500 ring-success-500/30',
  pending:  'bg-warning-500 ring-warning-500/30',
  rejected: 'bg-error-500 ring-error-500/30',
};

const STATUS_ICON: Record<DecisionStatus, React.ReactNode> = {
  executed: <CheckCircle2 size={9} />,
  pending:  <Clock size={9} />,
  rejected: <XCircle size={9} />,
};

const RISK_COLORS: Record<RiskLevel, string> = {
  low:      'text-success-400',
  medium:   'text-warning-400',
  high:     'text-orange-400',
  critical: 'text-error-400',
};

function minsAgoShort(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 60_000;
  if (diff < 1) return 'ahora';
  if (diff < 60) return `${Math.round(diff)}m`;
  return `${Math.round(diff / 60)}h`;
}

interface DecisionTimelineProps {
  decisions: BrainDecision[];
  onSelect: (d: BrainDecision) => void;
  selectedId?: string;
}

export function DecisionTimeline({ decisions, onSelect, selectedId }: DecisionTimelineProps) {
  const sorted = [...decisions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-3 py-2 border-b border-surface-700 flex-shrink-0">
        <p className="text-[10px] font-medium text-neutral-600 uppercase tracking-wider">Timeline de Decisiones</p>
      </div>
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {sorted.map((dec, i) => {
          const isSelected = dec.id === selectedId;
          return (
            <button
              key={dec.id}
              onClick={() => onSelect(dec)}
              className={`w-full text-left px-2 py-2 rounded-lg transition-all group
                ${isSelected ? 'bg-sky-500/10 border border-sky-500/30' : 'border border-transparent hover:bg-surface-750'}`}
            >
              <div className="flex items-start gap-2">
                <div className="flex flex-col items-center flex-shrink-0 pt-0.5">
                  <div className={`w-2.5 h-2.5 rounded-full ring-2 ring-offset-1 ring-offset-surface-900 flex-shrink-0 ${STATUS_DOT[dec.status]}`} />
                  {i < sorted.length - 1 && <div className="w-px h-full min-h-3 bg-surface-700 mt-1" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[11px] font-medium leading-snug line-clamp-2 ${isSelected ? 'text-sky-300' : 'text-neutral-400 group-hover:text-neutral-300'}`}>
                    {dec.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 text-[9px]">
                    <span className={RISK_COLORS[dec.riskLevel]}>{dec.riskLevel}</span>
                    <span className="text-neutral-700">{minsAgoShort(dec.createdAt)}</span>
                    <span className={`flex items-center gap-0.5 ${
                      dec.status === 'executed' ? 'text-success-400' :
                      dec.status === 'pending' ? 'text-warning-400' : 'text-error-400'
                    }`}>
                      {STATUS_ICON[dec.status]}
                    </span>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <span className={`text-[9px] font-mono font-bold ${
                    dec.confidence >= 90 ? 'text-success-400' :
                    dec.confidence >= 70 ? 'text-warning-400' : 'text-error-400'
                  }`}>{dec.confidence}%</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
