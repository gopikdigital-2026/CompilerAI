import React, { useState } from 'react';
import {
  Brain, Zap, BookMarked, Building2, Share2, Sparkles,
  Database, Cpu, GitBranch,
} from 'lucide-react';
import { ShortTermPanel }  from '../../components/memory/ShortTermPanel';
import { LongTermPanel }   from '../../components/memory/LongTermPanel';
import { OrgMemoryPanel }  from '../../components/memory/OrgMemoryPanel';
import { SemanticGraph }   from '../../components/memory/SemanticGraph';
import { MemorySearch }    from '../../components/memory/MemorySearch';
import { MemoryInsights }  from '../../components/memory/MemoryInsights';
import { MemoryTimeline }  from '../../components/memory/MemoryTimeline';
import { useMemory }       from '../../hooks/useMemory';
import { useTranslation }  from '../../hooks/useTranslation';
import type { MemoryType } from '../../types/memory';

// ─── Tab config ───────────────────────────────────────────────────────────────

type ActiveTab = MemoryType;

interface TabDef {
  id: ActiveTab;
  label: string;
  icon: React.ReactNode;
  badge: string;
  desc: string;
}

const TABS: TabDef[] = [
  {
    id: 'short_term',
    label: 'Short-Term',
    icon: <Zap size={14} />,
    badge: '10',
    desc: 'Eventos, acciones y decisiones de la sesión actual',
  },
  {
    id: 'long_term',
    label: 'Long-Term',
    icon: <BookMarked size={14} />,
    badge: '12',
    desc: 'Conocimiento persistente: clientes, prompts y patrones',
  },
  {
    id: 'organizational',
    label: 'Org Memory',
    icon: <Building2 size={14} />,
    badge: '10',
    desc: 'Procesos, políticas y documentación compartida',
  },
  {
    id: 'semantic',
    label: 'Semantic',
    icon: <Share2 size={14} />,
    badge: 'Graph',
    desc: 'Red de conocimiento y relaciones entre entidades',
  },
];

// ─── Architecture readiness pill ─────────────────────────────────────────────

function ArchPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-800 border border-surface-700 rounded-full text-[10px] text-neutral-500">
      <span className="text-neutral-600">{icon}</span>
      {label}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function MemoryCenter() {
  const { lang } = useTranslation();
  const isEs = lang === 'es';
  const [activeTab, setActiveTab] = useState<ActiveTab>('short_term');

  const {
    shortTermEntries, longTermEntries, orgEntries,
    searchQuery, searchResults, isSearching, showResults,
    search, clearSearch,
  } = useMemory();

  // All entries for timeline
  const allEntries = [...shortTermEntries, ...longTermEntries, ...orgEntries];

  return (
    <div className="flex flex-col flex-1 overflow-hidden">

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-4 px-5 py-3.5 border-b border-surface-700 flex-shrink-0">
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-brand-gradient flex items-center justify-center shadow-glow-brand">
            <Brain size={18} className="text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-neutral-100">Memory Center</h2>
            <p className="text-[11px] text-neutral-500">
              {isEs ? 'Cerebro cognitivo de todos los agentes' : 'Cognitive brain of all agents'}
            </p>
          </div>
        </div>

        {/* Search bar (center) */}
        <div className="flex-1 min-w-0 max-w-xl">
          <MemorySearch
            query={searchQuery}
            results={searchResults}
            isSearching={isSearching}
            showResults={showResults}
            onSearch={search}
            onClear={clearSearch}
          />
        </div>

        {/* Architecture readiness pills */}
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          <span className="badge-accent text-[10px]"><Sparkles size={9} /> Simulado</span>
          <ArchPill icon={<Database size={10} />} label="Vector DB" />
          <ArchPill icon={<Cpu size={10} />} label="Embeddings" />
          <ArchPill icon={<GitBranch size={10} />} label="RAG" />
        </div>
      </div>

      {/* ── Insights bar ────────────────────────────────────────────────────── */}
      <div className="border-b border-surface-700 flex-shrink-0">
        <MemoryInsights />
      </div>

      {/* ── Tab navigation ──────────────────────────────────────────────────── */}
      <div className="flex items-stretch border-b border-surface-700 flex-shrink-0 overflow-x-auto">
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-medium border-b-2 transition-all duration-200 flex-shrink-0
                ${isActive
                  ? 'border-brand-400 text-brand-300 bg-brand-500/5'
                  : 'border-transparent text-neutral-500 hover:text-neutral-300 hover:bg-surface-800'
                }`}
              title={tab.desc}
            >
              <span className={isActive ? 'text-brand-400' : 'text-neutral-600'}>{tab.icon}</span>
              {tab.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border
                ${isActive ? 'border-brand-500/40 bg-brand-500/15 text-brand-400' : 'border-surface-600 text-neutral-600'}`}>
                {tab.badge}
              </span>
            </button>
          );
        })}

        {/* Memory stats (right side) */}
        <div className="ml-auto px-4 flex items-center gap-4 flex-shrink-0">
          <div className="text-right">
            <p className="text-xs font-bold text-neutral-100">{allEntries.length}</p>
            <p className="text-[10px] text-neutral-600">entradas totales</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-neutral-100">4</p>
            <p className="text-[10px] text-neutral-600">tipos activos</p>
          </div>
        </div>
      </div>

      {/* ── Tab content ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden min-h-0">
        {activeTab === 'short_term' && (
          <ShortTermPanel entries={shortTermEntries} />
        )}
        {activeTab === 'long_term' && (
          <LongTermPanel entries={longTermEntries} />
        )}
        {activeTab === 'organizational' && (
          <OrgMemoryPanel entries={orgEntries} />
        )}
        {activeTab === 'semantic' && (
          <SemanticGraph />
        )}
      </div>

      {/* ── Timeline (always visible at bottom) ─────────────────────────────── */}
      {activeTab !== 'semantic' && (
        <MemoryTimeline entries={allEntries} />
      )}
    </div>
  );
}
