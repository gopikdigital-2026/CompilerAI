import React, { useState } from 'react';
import {
  GitBranch, Shield, BookOpen, Plug, Scroll,
  ChevronDown, ChevronRight, User, Clock, Hash,
} from 'lucide-react';
import type { OrgEntry, OrgCategory } from '../../types/memory';

const CATEGORY_CONFIG: Record<OrgCategory, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  process:       { label: 'Procesos',       icon: <GitBranch size={13} />, color: 'text-brand-400',   bg: 'bg-brand-400/10 border-brand-400/20' },
  policy:        { label: 'Políticas',      icon: <Shield size={13} />,    color: 'text-error-400',   bg: 'bg-error-400/10 border-error-400/20' },
  documentation: { label: 'Documentación', icon: <BookOpen size={13} />,  color: 'text-sky-400',     bg: 'bg-sky-400/10 border-sky-400/20' },
  integration:   { label: 'Integraciones', icon: <Plug size={13} />,      color: 'text-success-400', bg: 'bg-success-400/10 border-success-400/20' },
  norm:          { label: 'Normas',         icon: <Scroll size={13} />,    color: 'text-warning-400', bg: 'bg-warning-400/10 border-warning-400/20' },
};

function daysAgoLabel(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 86_400_000;
  if (diff < 1) return 'hoy';
  if (diff < 2) return 'ayer';
  return `hace ${Math.round(diff)}d`;
}

function EntryItem({ entry }: { entry: OrgEntry }) {
  const [open, setOpen] = useState(false);
  const cfg = CATEGORY_CONFIG[entry.category as OrgCategory];
  return (
    <div className={`rounded-xl border ${open ? cfg.bg : 'border-surface-600 bg-surface-800'} overflow-hidden transition-all duration-200`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left hover:bg-surface-750 transition-colors"
      >
        <span className={cfg.color}>{cfg.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-neutral-100 truncate">{entry.title}</p>
          {!open && (
            <p className="text-[11px] text-neutral-600 truncate">{entry.content.slice(0, 60)}…</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] text-neutral-600">{daysAgoLabel(entry.learnedAt)}</span>
          {open ? <ChevronDown size={13} className="text-neutral-500" /> : <ChevronRight size={13} className="text-neutral-600" />}
        </div>
      </button>
      {open && (
        <div className="px-3.5 pb-3.5 border-t border-surface-700/60">
          <p className="text-[11px] text-neutral-400 leading-relaxed mt-2.5">{entry.content}</p>
          <div className="flex items-center gap-3 mt-3 text-[10px] text-neutral-600">
            <span className="flex items-center gap-1"><User size={9} /> {entry.author}</span>
            <span className="flex items-center gap-1"><Clock size={9} /> Aprendido {daysAgoLabel(entry.learnedAt)}</span>
            <span>Usado {entry.usedCount}×</span>
          </div>
          {entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {entry.tags.map(tag => (
                <span key={tag} className="text-[9px] bg-surface-700 border border-surface-600 text-neutral-600 px-1.5 py-0.5 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface OrgMemoryPanelProps {
  entries: OrgEntry[];
}

type Filter = 'all' | OrgCategory;

export function OrgMemoryPanel({ entries }: OrgMemoryPanelProps) {
  const [filter, setFilter] = useState<Filter>('all');
  const filtered = filter === 'all' ? entries : entries.filter(e => e.category === filter);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Category nav */}
        <div className="w-48 flex-shrink-0 border-r border-surface-700 p-3 space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-neutral-600 font-medium px-2 mb-2">Categoría</p>
          <button
            onClick={() => setFilter('all')}
            className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all
              ${filter === 'all' ? 'bg-brand-500/15 text-brand-300' : 'text-neutral-500 hover:text-neutral-300 hover:bg-surface-750'}`}
          >
            <Hash size={12} /><span>Todos</span>
            <span className="ml-auto text-[10px] text-neutral-600">{entries.length}</span>
          </button>
          {(Object.keys(CATEGORY_CONFIG) as OrgCategory[]).map((cat) => {
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

        {/* Entries accordion */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filtered.map(entry => (
            <EntryItem key={entry.id} entry={entry as OrgEntry} />
          ))}
        </div>
      </div>
    </div>
  );
}
