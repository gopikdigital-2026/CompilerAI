import { Activity, Bot, GitBranch, Zap, FileText, Sparkles } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { EmptyState } from '../ui/EmptyState';
import { StatusBadge } from '../ui/StatusBadge';
import type { DashboardActivity } from '../../hooks/useDashboard';

interface ActivitySectionProps {
  activity: DashboardActivity[];
}

const typeIcons: Record<string, typeof Activity> = {
  compile: Zap,
  execution: GitBranch,
  prompt: Sparkles,
  workflow: Bot,
};

export function ActivitySection({ activity }: ActivitySectionProps) {
  const { t } = useTranslation();
  const d = t.dashboard;

  return (
    <div data-testid="activity-section" className="card">
      <div className="flex items-center justify-between px-5 py-4 border-b border-surface-700">
        <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
          <Activity size={16} className="text-accent-400" />
          {d.activity}
        </h3>
      </div>

      {activity.length === 0 ? (
        <div className="p-8">
          <EmptyState
            icon={<Activity size={32} />}
            title={d.noActivity}
            description={d.noActivityDesc}
          />
        </div>
      ) : (
        <div className="divide-y divide-surface-700">
          {activity.map((item) => {
            const Icon = typeIcons[item.type] ?? Activity;
            return (
              <div key={item.id} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-750 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-surface-700 border border-surface-600 flex items-center justify-center flex-shrink-0">
                  <Icon size={14} className="text-neutral-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-neutral-200 truncate">{item.title}</p>
                  <p className="text-xs text-neutral-500 truncate">{item.description}</p>
                </div>
                <StatusBadge status={item.status === 'complete' ? 'active' : item.status === 'error' ? 'error' : 'training'} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
