import { GitBranch, Pause, Play, ExternalLink } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { EmptyState } from '../ui/EmptyState';
import { StatusBadge } from '../ui/StatusBadge';
import type { DashboardAutomation } from '../../hooks/useDashboard';

interface AutomationsSectionProps {
  automations: DashboardAutomation[];
  onOpen: (id: string) => void;
  onToggle: (id: string) => void;
  onOpenStudio: () => void;
}

export function AutomationsSection({ automations, onOpen, onToggle, onOpenStudio }: AutomationsSectionProps) {
  const { t } = useTranslation();
  const d = t.dashboard;

  const active = automations.filter((a) => a.status === 'active').length;
  const paused = automations.filter((a) => a.status === 'paused').length;
  const failed = automations.filter((a) => a.status === 'failed').length;

  return (
    <div data-testid="automations-section" className="card">
      <div className="flex items-center justify-between px-5 py-4 border-b border-surface-700">
        <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
          <GitBranch size={16} className="text-brand-400" />
          {d.automations}
        </h3>
        <button onClick={onOpenStudio} className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
          {d.openStudio} <ExternalLink size={11} />
        </button>
      </div>

      {automations.length > 0 && (
        <div className="flex items-center gap-4 px-5 py-3 border-b border-surface-700 text-xs">
          <span className="text-success-400">{d.active}: {active}</span>
          <span className="text-neutral-400">{d.paused}: {paused}</span>
          {failed > 0 && <span className="text-error-400">{d.failed}: {failed}</span>}
        </div>
      )}

      {automations.length === 0 ? (
        <div className="p-8">
          <EmptyState
            icon={<GitBranch size={32} />}
            title={d.noAutomations}
            description={d.noAutomationsDesc}
          />
        </div>
      ) : (
        <div className="divide-y divide-surface-700">
          {automations.map((auto) => (
            <div key={auto.id} className="px-5 py-3 hover:bg-surface-750 transition-colors">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-surface-700 border border-surface-600 flex items-center justify-center flex-shrink-0">
                    <GitBranch size={14} className="text-neutral-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-200 truncate">{auto.name}</p>
                    <p className="text-xs text-neutral-500">
                      {auto.runs > 0 ? `${auto.runs} ${d.recentRuns}` : d.noAutomationsDesc}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => onToggle(auto.id)}
                    className="text-neutral-500 hover:text-neutral-300 transition-colors"
                    aria-label={auto.status === 'active' ? 'Pause' : 'Resume'}
                  >
                    {auto.status === 'active' ? <Pause size={14} /> : <Play size={14} />}
                  </button>
                  <StatusBadge status={auto.status === 'active' ? 'active' : auto.status === 'failed' ? 'error' : 'paused'} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
