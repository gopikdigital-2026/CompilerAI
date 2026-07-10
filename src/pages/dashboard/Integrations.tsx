import React, { useState } from 'react';
import { Plug, Search, CheckCircle, XCircle, Brain, MessageSquare, GitBranch, CreditCard, Database, Zap, FileText, Sparkles } from 'lucide-react';
import { MOCK_INTEGRATIONS } from '../../lib/mockData';
import { useTranslation } from '../../hooks/useTranslation';

const ICON_MAP: Record<string, React.ReactNode> = {
  brain: <Brain size={20} />,
  sparkles: <Sparkles size={20} />,
  'message-square': <MessageSquare size={20} />,
  'git-branch': <GitBranch size={20} />,
  'credit-card': <CreditCard size={20} />,
  database: <Database size={20} />,
  zap: <Zap size={20} />,
  'file-text': <FileText size={20} />,
};

const CATEGORY_COLORS: Record<string, string> = {
  AI: 'text-brand-400',
  Communication: 'text-accent-400',
  DevOps: 'text-warning-400',
  Finance: 'text-success-400',
  Database: 'text-error-400',
  Automation: 'text-brand-300',
  Productivity: 'text-neutral-400',
};

export function Integrations() {
  const { t } = useTranslation();
  const it = t.integrations;
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todos');

  const allCategories = Array.from(new Set(MOCK_INTEGRATIONS.map((i) => i.category)));
  // Use translated first option
  const categoryLabel = t.marketplace.categories[0];
  const categories = [categoryLabel, ...allCategories];

  const connectedCount = MOCK_INTEGRATIONS.filter((i) => i.connected).length;

  const filtered = MOCK_INTEGRATIONS.filter((integ) => {
    const matchSearch = integ.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === categoryLabel || integ.category === category;
    return matchSearch && matchCat;
  });

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-neutral-100">{it.title}</h2>
          <p className="text-sm text-neutral-500 mt-0.5">
            {it.subtitle.replace('{connected}', String(connectedCount)).replace('{total}', String(MOCK_INTEGRATIONS.length))}
          </p>
        </div>
        <button className="btn-primary text-sm">
          <Plug size={16} /> {it.explore}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder={it.searchPlaceholder}
            className="input-field text-sm pl-9 py-2"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${cat === category ? 'bg-brand-500/15 text-brand-400 border-brand-500/20' : 'text-neutral-400 border-surface-600 hover:border-surface-500 hover:text-neutral-300'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((integ) => (
          <div key={integ.id} className={`card-hover p-5 ${integ.connected ? 'border-success-500/20' : ''}`}>
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl bg-surface-700 border border-surface-600 flex items-center justify-center ${CATEGORY_COLORS[integ.category] ?? 'text-neutral-400'}`}>
                {ICON_MAP[integ.icon] ?? <Plug size={20} />}
              </div>
              <div className={`flex items-center gap-1 text-xs font-medium ${integ.connected ? 'text-success-400' : 'text-neutral-500'}`}>
                {integ.connected ? <CheckCircle size={13} /> : <XCircle size={13} />}
                {integ.connected ? it.connected : it.disconnected}
              </div>
            </div>
            <h3 className="text-sm font-semibold text-neutral-100 mb-1">{integ.name}</h3>
            <p className="text-xs text-neutral-500 leading-relaxed mb-4">{integ.description}</p>
            <button className={`w-full text-xs py-2 rounded-lg border transition-all font-medium ${integ.connected ? 'bg-error-500/10 text-error-400 border-error-500/20 hover:bg-error-500/15' : 'bg-brand-500/10 text-brand-400 border-brand-500/20 hover:bg-brand-500/15'}`}>
              {integ.connected ? t.common.disconnect : t.common.connect}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
