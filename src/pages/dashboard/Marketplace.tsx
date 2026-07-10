import React, { useState } from 'react';
import { Star, Download, Sparkles, Bot, GitBranch, Plug } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';

export function Marketplace() {
  const { t } = useTranslation();
  const mk = t.marketplace;
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(mk.categories[0]);

  const MARKETPLACE_ITEMS = mk.items.map((item, i) => ({
    id: String(i + 1),
    ...item,
    category: ['Workflows', 'Agents', 'Integrations', 'Workflows', 'Agents', 'Workflows'][i],
    rating: [4.9, 4.7, 4.5, 4.8, 4.6, 4.4][i],
    downloads: [2841, 1205, 892, 654, 1432, 387][i],
    icon: [<GitBranch size={18} />, <Bot size={18} />, <Plug size={18} />, <GitBranch size={18} />, <Bot size={18} />, <Sparkles size={18} />][i],
    featured: i < 2,
  }));

  // keep category keys in English for data matching; display translated label
  const EN_CATEGORIES = ['All', 'Workflows', 'Agents', 'Integrations'];
  const activeEnCat = EN_CATEGORIES[mk.categories.indexOf(category)] ?? 'All';

  const filtered = MARKETPLACE_ITEMS.filter((item) => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeEnCat === 'All' || item.category === activeEnCat;
    return matchSearch && matchCat;
  });

  const featured = filtered.filter((i) => i.featured);
  const rest = filtered.filter((i) => !i.featured);

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-neutral-100">{mk.title}</h2>
          <p className="text-sm text-neutral-500 mt-0.5">{mk.subtitle}</p>
        </div>
        <button className="btn-secondary text-sm">{mk.publish}</button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Star size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder={mk.searchPlaceholder}
            className="input-field text-sm pl-9 py-2"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {mk.categories.map((cat) => (
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

      {featured.length > 0 && (
        <div>
          <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-3">{mk.featuredLabel}</p>
          <div className="grid md:grid-cols-2 gap-4">
            {featured.map((item) => (
              <div key={item.id} className="card-hover p-5 border-brand-500/20 bg-gradient-to-br from-brand-600/10 to-transparent">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-500/20 border border-brand-500/20 flex items-center justify-center text-brand-400">
                    {item.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-neutral-100">{item.name}</h3>
                      <span className="badge-accent text-[10px]">{t.common.featured}</span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-0.5">{mk.byAuthor} {item.author}</p>
                  </div>
                  <span className={`text-xs font-semibold ${item.price === t.common.free || item.price === 'Free' || item.price === 'Gratis' ? 'text-success-400' : 'text-brand-400'}`}>{item.price}</span>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed mb-4">{item.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-neutral-500">
                    <span className="flex items-center gap-1"><Star size={11} className="text-warning-400 fill-warning-400" /> {item.rating}</span>
                    <span className="flex items-center gap-1"><Download size={11} /> {item.downloads.toLocaleString()}</span>
                  </div>
                  <button className="btn-primary text-xs py-1.5 px-4">{t.common.install}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {rest.length > 0 && (
        <div>
          <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-3">{mk.allLabel}</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rest.map((item) => (
              <div key={item.id} className="card-hover p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-surface-700 border border-surface-600 flex items-center justify-center text-neutral-400">
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-neutral-100 truncate">{item.name}</h3>
                    <p className="text-xs text-neutral-600">{mk.byAuthor} {item.author}</p>
                  </div>
                  <span className={`text-xs font-semibold flex-shrink-0 ${item.price === t.common.free || item.price === 'Free' || item.price === 'Gratis' ? 'text-success-400' : 'text-brand-400'}`}>{item.price}</span>
                </div>
                <p className="text-xs text-neutral-500 leading-relaxed mb-4">{item.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-neutral-500">
                    <span className="flex items-center gap-1"><Star size={11} className="text-warning-400 fill-warning-400" /> {item.rating}</span>
                    <span className="flex items-center gap-1"><Download size={11} /> {item.downloads}</span>
                  </div>
                  <button className="btn-secondary text-xs py-1.5 px-3">{t.common.install}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
