import { useState } from 'react';
import { GitBranch, Plus, Search, Play, Pause, MoreHorizontal, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { MOCK_WORKFLOWS } from '../../lib/mockData';
import { useTranslation } from '../../hooks/useTranslation';

export function Workflows() {
  const { t } = useTranslation();
  const wt = t.workflows;
  const [search, setSearch] = useState('');

  const filtered = MOCK_WORKFLOWS.filter((w) =>
    w.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-neutral-100">{wt.title}</h2>
          <p className="text-sm text-neutral-500 mt-0.5">{wt.subtitle.replace('{count}', String(MOCK_WORKFLOWS.length))}</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary text-sm">{wt.import}</button>
          <button className="btn-primary text-sm"><Plus size={16} /> {wt.newWorkflow}</button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
        <input
          type="text"
          placeholder={wt.searchPlaceholder}
          className="input-field text-sm pl-9 py-2"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<GitBranch size={24} />}
          title={wt.emptyTitle}
          description={wt.emptyDesc}
          action={<button className="btn-primary text-sm"><Plus size={15} /> {wt.createWorkflow}</button>}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((wf) => (
            <div key={wf.id} className="card-hover p-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-surface-700 border border-surface-600 flex items-center justify-center flex-shrink-0">
                  <GitBranch size={18} className="text-neutral-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <h3 className="text-sm font-semibold text-neutral-100">{wf.name}</h3>
                    <StatusBadge status={wf.status} pulse />
                  </div>
                  <p className="text-xs text-neutral-500 leading-relaxed">{wf.description}</p>
                  <div className="flex items-center gap-5 mt-3">
                    <span className="flex items-center gap-1 text-xs text-neutral-500">
                      <GitBranch size={11} /> {wf.steps} {wt.steps}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-neutral-500">
                      <Clock size={11} /> {wf.lastRun}
                    </span>
                    {wf.successRate > 0 && (
                      <span className={`flex items-center gap-1 text-xs font-medium ${wf.successRate >= 90 ? 'text-success-400' : wf.successRate >= 70 ? 'text-warning-400' : 'text-error-400'}`}>
                        {wf.successRate >= 90 ? <CheckCircle size={11} /> : <AlertCircle size={11} />}
                        {wf.successRate}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button className="w-8 h-8 rounded-lg bg-surface-700 border border-surface-600 flex items-center justify-center text-neutral-400 hover:text-neutral-100 hover:bg-surface-600 transition-all" title={t.common.run}>
                    <Play size={13} />
                  </button>
                  <button className="w-8 h-8 rounded-lg bg-surface-700 border border-surface-600 flex items-center justify-center text-neutral-400 hover:text-neutral-100 hover:bg-surface-600 transition-all" title={t.common.pause}>
                    <Pause size={13} />
                  </button>
                  <button className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-500 hover:text-neutral-300 hover:bg-surface-700 transition-all">
                    <MoreHorizontal size={15} />
                  </button>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1.5 flex-wrap">
                {Array.from({ length: Math.min(wf.steps, 8) }, (_, i) => (
                  <div key={i} className={`h-1.5 w-8 rounded-full ${i < Math.ceil(wf.steps * (wf.successRate / 100)) ? (wf.status === 'error' ? 'bg-error-500' : 'bg-brand-500') : 'bg-surface-600'}`} />
                ))}
                {wf.steps > 8 && <span className="text-[10px] text-neutral-600">+{wf.steps - 8} {wt.more}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
