import { AlertTriangle, AlertCircle, Info, ShieldAlert } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { EmptyState } from '../ui/EmptyState';
import type { DashboardAlert } from '../../hooks/useDashboard';

interface AlertsSectionProps {
  alerts: DashboardAlert[];
  onOpen: (id: string) => void;
}

const severityConfig: Record<string, { icon: typeof AlertTriangle; color: string; bg: string }> = {
  critical: { icon: ShieldAlert, color: 'text-error-400', bg: 'bg-error-500/10 border-error-500/20' },
  high: { icon: AlertTriangle, color: 'text-warning-400', bg: 'bg-warning-500/10 border-warning-500/20' },
  medium: { icon: AlertCircle, color: 'text-brand-400', bg: 'bg-brand-500/10 border-brand-500/20' },
  info: { icon: Info, color: 'text-neutral-400', bg: 'bg-neutral-500/10 border-neutral-500/20' },
};

export function AlertsSection({ alerts, onOpen }: AlertsSectionProps) {
  const { t } = useTranslation();
  const d = t.dashboard;

  const sorted = [...alerts].sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, info: 3 };
    return order[a.severity] - order[b.severity];
  });

  return (
    <div data-testid="alerts-section" className="card">
      <div className="flex items-center justify-between px-5 py-4 border-b border-surface-700">
        <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
          <AlertTriangle size={16} className="text-warning-400" />
          {d.alerts}
        </h3>
        {alerts.length > 0 && (
          <span className="text-xs text-neutral-500">{alerts.length}</span>
        )}
      </div>

      {alerts.length === 0 ? (
        <div className="p-8">
          <EmptyState
            icon={<Info size={32} />}
            title={d.noAlerts}
            description={d.noAlertsDesc}
          />
        </div>
      ) : (
        <div className="divide-y divide-surface-700">
          {sorted.map((alert) => {
            const config = severityConfig[alert.severity] ?? severityConfig.info;
            const Icon = config.icon;
            return (
              <div
                key={alert.id}
                onClick={() => onOpen(alert.id)}
                className="px-5 py-4 hover:bg-surface-750 transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 ${config.bg}`}>
                    <Icon size={16} className={config.color} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-neutral-200">{alert.title}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${config.bg} ${config.color} flex-shrink-0`}>
                        {(d as any)[`severity${alert.severity.charAt(0).toUpperCase()}${alert.severity.slice(1)}`] ?? alert.severity}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500">{alert.explanation}</p>
                    <p className="text-xs text-brand-400 mt-1">{alert.action}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
