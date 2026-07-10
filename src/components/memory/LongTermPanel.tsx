import React, { useState } from 'react';
import { User, FileText, Star, Bot, TrendingUp, Hash, CheckCircle2, Clock } from 'lucide-react';
import type { LongTermEntry, LongTermCategory } from '../../types/memory';

const CATEGORY_CONFIG: Record<LongTermCategory, { label: string; icon: React.ReactNode; color: string }> = {
  client_profile:     { label: 'Clientes',      icon: <User size={13} />,        color: 'text-green-400' },
  prompt_template:    { label: 'Prompts',        icon: <FileText size={13} />,    color: 'text-brand-400' },
  workflow_favorite:  { label: 'Workflows',      icon: <Star size={13} />,        color: 'text-warning-400' },
  agent_performance:  { label: 'Agentes',        icon: <Bot size={13} />,         color: 'text-sky-400' },
  pattern:            { label: 'Patrones',       icon: <TrendingUp size={13} />,  color: 'text-success-400' },
};

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 90 ? 'bg-success-500' : pct >= 70 ? 'bg-warning-500' : 'bg-error-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-surface-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-neutral-500 font-mono">{pct}%</span>
    </div>
  );
}

function daysAgoLabel(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 86_400_000;
  if (diff < 1) return 'hoy';
  if (diff < 2) return 'ayer';
  return `hace ${Math.round(diff)}d`;
}

interface LongTermPanelProps {
  entries: LongTermEntry[];
}

type Filter = 'all' | LongTermCategory;

export function LongTermPanel({ entries }: LongTermPanelProps) {
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = filter === 'all' ? entries : entries.filter(e => e.category === filter);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Category sidebar + main */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Category nav */}
        <div className="w-48 flex-shrink-0 border-r border-surface-700 p-3 space-y-1 overflow-y-auto">
          <p className="text-[10px] uppercase tracking-wider text-neutral-600 font-medium px-2 mb-2">Categoría</p>
          <button
            onClick={() => setFilter('all')}
            className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all
              ${filter === 'all' ? 'bg-brand-500/15 text-brand-300' : 'text-neutral-500 hover:text-neutral-300 hover:bg-surface-750'}`}
          >
            <Hash size={12} />
            <span>Todos</span>
            <span className="ml-auto text-[10px] text-neutral-600">{entries.length}</span>
          </button>
          {(Object.keys(CATEGORY_CONFIG) as LongTermCategory[]).map((cat) => {
            const cfg = CATEGORY_CONFIG[cat];
            const count = entries.filter(e => e.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all
                  ${filter === cat ? `bg-surface-700 ${cfg.color}` : 'text-neutral-500 hover:text-neutral-300 hover:bg-surface-750'}`}
              >
                <span className={filter === cat ? cfg.color : ''}>{cfg.icon}</span>
                <span>{cfg.label}</span>
                <span className="ml-auto text-[10px] text-neutral-600">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Cards grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {filtered.map((entry) => {
              const cfg = CATEGORY_CONFIG[entry.category as LongTermCategory];
              return (
                <div
                  key={entry.id}
                  className="rounded-xl border border-surface-600 bg-surface-800 p-3.5 hover:border-surface-500 hover:bg-surface-750 transition-all group cursor-default"
                >
                  <div className="flex items-start gap-2 mb-2">
                    <span className={cfg.color}>{cfg.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-neutral-100 truncate">{entry.title}</p>
                      <span className={`text-[10px] ${cfg.color}`}>{cfg.label}</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-neutral-500 leading-relaxed line-clamp-2 mb-2.5">{entry.content}</p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mb-2.5">
                    {entry.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="text-[9px] bg-surface-700 border border-surface-600 text-neutral-600 px-1.5 py-0.5 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Confidence bar */}
                  <ConfidenceBar value={entry.confidence} />

                  <div className="flex items-center justify-between mt-2 text-[10px] text-neutral-700">
                    <div className="flex items-center gap-1">
                      <CheckCircle2 size={9} />
                      <span>Usado {entry.usedCount}×</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock size={9} />
                      <span>Aprendido {daysAgoLabel(entry.learnedAt)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
