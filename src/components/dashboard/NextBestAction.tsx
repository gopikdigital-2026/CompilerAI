import { Target, ArrowRight } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import type { DashboardNextBestAction } from '../../hooks/useDashboard';

interface NextBestActionProps {
  action: DashboardNextBestAction | null;
  onReview: () => void;
  onExecute: () => void;
}

export function NextBestAction({ action, onReview, onExecute }: NextBestActionProps) {
  const { t } = useTranslation();
  const d = t.dashboard;

  if (!action) {
    return (
      <div data-testid="next-best-action" className="card p-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-accent-500/10 border border-accent-500/20 flex items-center justify-center flex-shrink-0">
            <Target size={18} className="text-accent-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-neutral-100 mb-1">{d.nextBestAction}</h3>
            <p className="text-sm text-neutral-400">{d.noDataAction}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="next-best-action" className="card p-5 border-accent-500/20 bg-gradient-to-r from-accent-600/10 to-brand-600/5">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg bg-accent-500/15 border border-accent-500/20 flex items-center justify-center flex-shrink-0">
          <Target size={18} className="text-accent-400" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-neutral-100 mb-1">{d.nextBestAction}</h3>
          <p className="text-base font-medium text-neutral-100">{action.title}</p>
        </div>
      </div>

      <div className="space-y-2 ml-12">
        <div>
          <p className="text-xs text-neutral-500 font-medium">{d.why}</p>
          <p className="text-sm text-neutral-300 mt-0.5">{action.reason}</p>
        </div>
        <div>
          <p className="text-xs text-neutral-500 font-medium">{d.expectedImpact}</p>
          <p className="text-sm text-neutral-300 mt-0.5">{action.expectedImpact}</p>
        </div>
        <div className="flex items-center gap-4">
          <div>
            <p className="text-xs text-neutral-500 font-medium">{d.risk}</p>
            <p className="text-sm text-neutral-300 mt-0.5">{action.risk}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500 font-medium">{d.confidence}</p>
            <p className="text-sm text-neutral-300 mt-0.5">{action.confidence}%</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 ml-12 mt-4">
        <button onClick={onReview} className="btn-ghost text-sm">
          {d.viewDetail}
        </button>
        <button onClick={onExecute} className="btn-primary text-sm flex items-center gap-1.5">
          {d.createAutomation} <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
