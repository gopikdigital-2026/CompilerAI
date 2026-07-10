import React, { useState } from 'react';
import { Zap, MousePointerClick, AlertCircle, GitBranch, Clock, Activity } from 'lucide-react';
import type { ShortTermEntry, ShortTermEventType } from '../../types/memory';

const EVENT_CONFIG: Record<ShortTermEventType, { label: string; color: string; border: string; icon: React.ReactNode }> = {
  event:    { label: 'Evento',    color: 'text-sky-400',     border: 'border-sky-500/30',     icon: <Activity size={12} /> },
  action:   { label: 'Acción',    color: 'text-brand-400',   border: 'border-brand-500/30',   icon: <Zap size={12} /> },
  error:    { label: 'Error',     color: 'text-error-400',   border: 'border-error-500/40',   icon: <AlertCircle size={12} /> },
  decision: { label: 'Decisión',  color: 'text-success-400', border: 'border-success-500/30', icon: <GitBranch size={12} /> },
};

const SEVERITY_DOT: Record<string, string> = {
  low:    'bg-neutral-600',
  medium: 'bg-warning-400',
  high:   'bg-error-400',
};

type FilterType = 'all' | ShortTermEventType;

function formatRelTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return `hace ${Math.round(diff / 1000)}s`;
  if (diff < 3_600_000) return `hace ${Math.round(diff / 60_000)}m`;
  return `hace ${Math.round(diff / 3_600_000)}h`;
}

interface ShortTermPanelProps {
  entries: ShortTermEntry[];
}

export function ShortTermPanel({ entries }: ShortTermPanelProps) {
  const [filter, setFilter] = useState<FilterType>('all');

  const counts: Record<FilterType, number> = {
    all:      entries.length,
    event:    entries.filter(e => e.category === 'event').length,
    action:   entries.filter(e => e.category === 'action').length,
    error:    entries.filter(e => e.category === 'error').length,
    decision: entries.filter(e => e.category === 'decision').length,
  };

  const filtered = filter === 'all' ? entries : entries.filter(e => e.category === filter);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Filter bar */}
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-surface-700 flex-wrap flex-shrink-0">
        {(['all', 'event', 'action', 'error', 'decision'] as FilterType[]).map((f) => {
          const cfg = f !== 'all' ? EVENT_CONFIG[f] : null;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border transition-all duration-200
                ${filter === f
                  ? f === 'all' ? 'border-brand-500/50 bg-brand-500/15 text-brand-300' : `${cfg!.border} ${cfg!.color} bg-surface-700`
                  : 'border-surface-600 text-neutral-500 hover:text-neutral-300 hover:border-surface-500'
                }`}
            >
              {cfg?.icon}
              <span className="capitalize">{f === 'all' ? 'Todos' : cfg!.label}</span>
              <span className={`text-[10px] opacity-70 ${filter === f ? '' : 'text-neutral-600'}`}>{counts[f]}</span>
            </button>
          );
        })}
        <span className="ml-auto text-[10px] text-neutral-600 flex items-center gap-1">
          <Clock size={10} /> Sesión activa · TTL 24h
        </span>
      </div>

      {/* Entries list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {filtered.map((entry) => {
          const cfg = EVENT_CONFIG[entry.category as ShortTermEventType];
          return (
            <div
              key={entry.id}
              className={`rounded-xl border ${cfg.border} bg-surface-800 p-3 hover:bg-surface-750 transition-colors group`}
            >
              <div className="flex items-start gap-2.5">
                {/* Left indicator */}
                <div className={`mt-0.5 flex flex-col items-center gap-1 flex-shrink-0`}>
                  <span className={cfg.color}>{cfg.icon}</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${SEVERITY_DOT[entry.severity]}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-semibold text-neutral-100">{entry.title}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${cfg.border} ${cfg.color}`}>
                      {cfg.label}
                    </span>
                    {entry.agentName && (
                      <span className="text-[10px] text-neutral-600 bg-surface-700 border border-surface-600 px-1.5 py-0.5 rounded-full">
                        {entry.agentName}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-0.5 leading-relaxed">{entry.content}</p>
                </div>
                <span className="text-[10px] text-neutral-700 flex-shrink-0 mt-0.5">
                  {formatRelTime(entry.learnedAt)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
