import { Target, Eye, Check, X, Zap } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { EmptyState } from '../ui/EmptyState';
import type { DashboardOpportunity } from '../../hooks/useDashboard';

interface OpportunitiesSectionProps {
  opportunities: DashboardOpportunity[];
  onView: (id: string) => void;
  onApprove: (id: string) => void;
  onDiscard: (id: string) => void;
}

const priorityColors: Record<string, string> = {
  critical: 'bg-error-500/15 text-error-400 border-error-500/20',
  high: 'bg-warning-500/15 text-warning-400 border-warning-500/20',
  medium: 'bg-brand-500/15 text-brand-400 border-brand-500/20',
  low: 'bg-neutral-500/15 text-neutral-400 border-neutral-500/20',
};

export function OpportunitiesSection({ opportunities, onView, onApprove, onDiscard }: OpportunitiesSectionProps) {
  const { t } = useTranslation();
  const d = t.dashboard;

  return (
    <div data-testid="opportunities-section" className="card">
      <div className="flex items-center justify-between px-5 py-4 border-b border-surface-700">
        <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
          <Target size={16} className="text-accent-400" />
          {d.opportunities}
        </h3>
        {opportunities.length > 0 && (
          <span className="text-xs text-neutral-500">{opportunities.length}</span>
        )}
      </div>

      {opportunities.length === 0 ? (
        <div className="p-8">
          <EmptyState
            icon={<Target size={32} />}
            title={d.noOpportunities}
            description={d.noOpportunitiesDesc}
          />
        </div>
      ) : (
        <div className="divide-y divide-surface-700">
          {opportunities.map((opp) => (
            <div key={opp.id} className="px-5 py-4 hover:bg-surface-750 transition-colors">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-neutral-200 truncate">{opp.title}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">{opp.description}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded border flex-shrink-0 ${priorityColors[opp.priority] ?? priorityColors.medium}`}>
                  {(d as any)[`priority${opp.priority.charAt(0).toUpperCase()}${opp.priority.slice(1)}`] ?? opp.priority}
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs text-neutral-500 mb-2">
                <span>{d.confidence}: {opp.confidence}%</span>
                <span>{d.source}: {opp.source}</span>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={() => onView(opp.id)} className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
                  <Eye size={12} /> {d.viewDetail}
                </button>
                <button onClick={() => onApprove(opp.id)} className="text-xs text-success-400 hover:text-success-300 flex items-center gap-1">
                  <Check size={12} /> {d.approve}
                </button>
                <button onClick={() => onDiscard(opp.id)} className="text-xs text-neutral-500 hover:text-neutral-400 flex items-center gap-1">
                  <X size={12} /> {d.discard}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
