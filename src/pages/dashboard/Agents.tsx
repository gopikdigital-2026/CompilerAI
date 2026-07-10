import React, { useState } from 'react';
import { Bot, Plus, Search, MoreHorizontal, Play, Pause, Trash2, TrendingUp } from 'lucide-react';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { MOCK_AGENTS } from '../../lib/mockData';
import { useTranslation } from '../../hooks/useTranslation';
import type { Agent } from '../../types';

const TYPE_COLORS: Record<string, string> = {
  Data: 'badge-brand',
  Marketing: 'badge-accent',
  Analytics: 'badge-warning',
  Support: 'badge-success',
  Sales: 'badge-brand',
  DevOps: 'badge-warning',
};

export function Agents() {
  const { t } = useTranslation();
  const ag = t.agents;
  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const filtered = MOCK_AGENTS.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.type.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-neutral-100">{ag.title}</h2>
          <p className="text-sm text-neutral-500 mt-0.5">{ag.subtitle.replace('{count}', String(MOCK_AGENTS.length))}</p>
        </div>
        <button className="btn-primary text-sm">
          <Plus size={16} /> {ag.newAgent}
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder={ag.searchPlaceholder}
            className="input-field text-sm pl-9 py-2"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {ag.filters.map((f, i) => (
            <button key={f} className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${i === 0 ? 'bg-brand-500/15 text-brand-400 border-brand-500/20' : 'text-neutral-400 border-surface-600 hover:border-surface-500 hover:text-neutral-300'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Bot size={24} />}
          title={ag.emptyTitle}
          description={ag.emptyDesc}
          action={<button className="btn-primary text-sm"><Plus size={15} /> {ag.createAgent}</button>}
        />
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((agent: Agent) => (
            <div key={agent.id} className="card-hover p-5 group relative">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-surface-700 border border-surface-600 flex items-center justify-center">
                    <Bot size={18} className="text-neutral-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-100">{agent.name}</p>
                    <span className={`${TYPE_COLORS[agent.type] ?? 'badge-brand'} text-[10px] mt-0.5`}>{agent.type}</span>
                  </div>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setMenuOpen(menuOpen === agent.id ? null : agent.id)}
                    className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-md flex items-center justify-center text-neutral-500 hover:text-neutral-300 hover:bg-surface-700 transition-all"
                  >
                    <MoreHorizontal size={15} />
                  </button>
                  {menuOpen === agent.id && (
                    <div className="absolute right-0 top-8 w-40 card border-surface-600 shadow-card-hover z-10 animate-fade-in overflow-hidden">
                      {[
                        { icon: <Play size={13} />, label: ag.menuRun, color: '' },
                        { icon: <Pause size={13} />, label: ag.menuPause, color: '' },
                        { icon: <Trash2 size={13} />, label: ag.menuDelete, color: 'text-error-400' },
                      ].map((item) => (
                        <button key={item.label} className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs hover:bg-surface-750 transition-colors ${item.color || 'text-neutral-300'}`}>
                          {item.icon} {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <p className="text-xs text-neutral-500 leading-relaxed mb-4">{agent.description}</p>
              <div className="flex items-center justify-between pt-3 border-t border-surface-700">
                <StatusBadge status={agent.status} pulse />
                <div className="flex items-center gap-1 text-xs text-neutral-500">
                  <TrendingUp size={11} />
                  {agent.runs.toLocaleString()} {ag.runs}
                </div>
              </div>
              <p className="text-[10px] text-neutral-600 mt-1.5">{ag.lastRun} {agent.lastRun}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
