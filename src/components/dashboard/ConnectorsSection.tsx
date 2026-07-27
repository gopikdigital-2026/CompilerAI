import { Database, Plug, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import type { DashboardConnector } from '../../hooks/useDashboard';

interface ConnectorsSectionProps {
  connectors: DashboardConnector[];
  onConnect: () => void;
}

const statusConfig: Record<string, { icon: typeof CheckCircle; color: string; labelKey: string }> = {
  connected: { icon: CheckCircle, color: 'text-success-400', labelKey: 'connected' },
  disconnected: { icon: AlertCircle, color: 'text-neutral-400', labelKey: 'disconnected' },
  syncing: { icon: RefreshCw, color: 'text-brand-400', labelKey: 'syncing' },
  error: { icon: AlertCircle, color: 'text-error-400', labelKey: 'error' },
  config_needed: { icon: AlertCircle, color: 'text-warning-400', labelKey: 'configNeeded' },
  demo: { icon: AlertCircle, color: 'text-neutral-400', labelKey: 'demo' },
};

export function ConnectorsSection({ connectors, onConnect }: ConnectorsSectionProps) {
  const { t } = useTranslation();
  const d = t.dashboard;

  const allUnconfigured = connectors.every((c) => c.status === 'config_needed');

  return (
    <div data-testid="connectors-status" className="card">
      <div className="flex items-center justify-between px-5 py-4 border-b border-surface-700">
        <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
          <Database size={16} className="text-brand-400" />
          {d.connectorsStatus}
        </h3>
      </div>

      <div className="divide-y divide-surface-700">
        {connectors.map((conn) => {
          const config = statusConfig[conn.status] ?? statusConfig.disconnected;
          const Icon = config.icon;
          return (
            <div key={conn.id} className="px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-surface-700 border border-surface-600 flex items-center justify-center flex-shrink-0">
                  <Plug size={14} className="text-neutral-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-neutral-200 truncate">{conn.name}</p>
                  <p className="text-xs text-neutral-500">{conn.note}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Icon size={14} className={config.color} />
                <span className={`text-xs ${config.color}`}>
                  {(d as any)[config.labelKey] ?? conn.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {allUnconfigured && (
        <div className="p-4 border-t border-surface-700">
          <button
            onClick={onConnect}
            data-testid="connect-first-source"
            className="btn-primary text-sm w-full flex items-center justify-center gap-2"
          >
            <Plug size={14} />
            {d.connectFirst}
          </button>
        </div>
      )}
    </div>
  );
}
