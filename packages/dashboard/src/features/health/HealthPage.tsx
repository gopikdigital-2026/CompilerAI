import { useQuery } from '@tanstack/react-query';
import { Heart, Server, Shield, Terminal, Package } from 'lucide-react';
import { useApiAdapter } from '../../api/ApiAdapterContext';
import { sanitizeError } from '../../api/sanitizers';
import { Card, LoadingSpinner, ErrorState } from '../../components/ui';
import { HealthBadge } from '../../components/StatusBadges';
import type { HealthData } from '../../types/dashboard';

const overallConfig: Record<HealthData['overall'], { label: string; className: string }> = {
  healthy: { label: 'All Systems Operational', className: 'bg-success-500/10 text-success-600 dark:text-success-400' },
  degraded: { label: 'Degraded Performance', className: 'bg-warning-500/10 text-warning-600 dark:text-warning-400' },
  unhealthy: { label: 'Service Outage', className: 'bg-error-500/10 text-error-600 dark:text-error-400' },
};

const serviceIcons: Record<string, typeof Server> = {
  API: Server,
  Runtime: Terminal,
  Persistence: Package,
  'Event Bus': Heart,
  Memory: Package,
  Telemetry: Shield,
};

export function HealthPage() {
  const adapter = useApiAdapter();

  const { data: health, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['health'],
    queryFn: () => adapter.getHealth(),
    retry: 1,
    staleTime: 8_000,
  });

  if (isLoading) return <LoadingSpinner label="Loading health status..." />;
  if (isError) {
    return <ErrorState message={sanitizeError(error).message} onRetry={() => refetch()} retryAvailable />;
  }

  const overall = health ? overallConfig[health.overall] : overallConfig.healthy;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">System Health</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Platform service status and version information</p>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-4">
          <div className={`flex h-14 w-14 items-center justify-center rounded-full ${overall.className}`}>
            <Heart className="h-7 w-7" />
          </div>
          <div>
            <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">{overall.label}</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{health?.services.length ?? 0} services monitored</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {health?.services.map((service) => {
          const Icon = serviceIcons[service.name] ?? Server;
          return (
            <Card key={service.name} className="card-hover p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 dark:bg-surface-800">
                    <Icon className="h-5 w-5 text-neutral-500 dark:text-neutral-400" />
                  </div>
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-neutral-100">{service.name}</p>
                    {service.version && <p className="text-xs text-neutral-400">v{service.version}</p>}
                  </div>
                </div>
                <HealthBadge status={service.status} />
              </div>
              <div className="mt-3 flex items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
                <span>Latency: {service.latencyMs}ms</span>
                {service.details && <span>{service.details}</span>}
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-5">
        <h3 className="mb-4 text-sm font-semibold text-neutral-700 dark:text-neutral-300">Version Information</h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-lg bg-neutral-50 p-3 dark:bg-surface-800/50">
            <p className="text-xs uppercase tracking-wider text-neutral-400">API Version</p>
            <p className="mt-1 text-sm font-mono font-medium text-neutral-900 dark:text-neutral-100">{health?.apiVersion ?? '—'}</p>
          </div>
          <div className="rounded-lg bg-neutral-50 p-3 dark:bg-surface-800/50">
            <p className="text-xs uppercase tracking-wider text-neutral-400">Runtime Version</p>
            <p className="mt-1 text-sm font-mono font-medium text-neutral-900 dark:text-neutral-100">{health?.runtimeVersion ?? '—'}</p>
          </div>
          <div className="rounded-lg bg-neutral-50 p-3 dark:bg-surface-800/50">
            <p className="text-xs uppercase tracking-wider text-neutral-400">SDK Version</p>
            <p className="mt-1 text-sm font-mono font-medium text-neutral-900 dark:text-neutral-100">{health?.sdkVersion ?? '—'}</p>
          </div>
          <div className="rounded-lg bg-neutral-50 p-3 dark:bg-surface-800/50">
            <p className="text-xs uppercase tracking-wider text-neutral-400">CLI Version</p>
            <p className="mt-1 text-sm font-mono font-medium text-neutral-900 dark:text-neutral-100">{health?.cliVersion ?? '—'}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
