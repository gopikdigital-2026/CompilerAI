import { useState, useEffect, useCallback } from 'react';
import {
  Activity, AlertCircle, CheckCircle, TrendingUp, TrendingDown,
  Database, Cpu, Plug, Bell, ListChecks, RefreshCw, Server,
} from 'lucide-react';
import { BarChart } from '../../components/ui/BarChart';
import { Sparkline } from '../../components/ui/Sparkline';
import { useTranslation } from '../../hooks/useTranslation';
import { DemoBadge } from '../../components/ui/DemoBadge';
import {
  checkPlatformHealth, HEALTH_STATUS_INFO,
  type PlatformHealth, type ServiceHealth,
} from '../../lib/healthService';
import { logger } from '../../lib/logger';

const SERVICE_ICONS: Record<string, typeof Database> = {
  API: Server,
  Database: Database,
  'AI Engine': Cpu,
  Connectors: Plug,
  Queues: ListChecks,
  Notifications: Bell,
};

function ServiceRow({ svc }: { svc: ServiceHealth }) {
  const info = HEALTH_STATUS_INFO[svc.status];
  const Icon = SERVICE_ICONS[svc.name] ?? Activity;
  return (
    <div data-testid={`health-service-${svc.name}`} className="flex items-center justify-between py-2 border-b border-surface-700 last:border-0">
      <div className="flex items-center gap-2.5">
        <span className={`w-2 h-2 rounded-full ${info.dot} ${svc.status === 'degraded' ? 'animate-pulse' : ''}`} />
        <Icon size={13} className="text-neutral-500" />
        <span className="text-sm text-neutral-300">{svc.name}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-neutral-500 font-mono">{svc.latencyMs}ms</span>
        <span className={`text-xs font-medium ${info.color}`}>{info.label}</span>
      </div>
    </div>
  );
}

export function Monitor() {
  const { t, lang } = useTranslation();
  const mo = t.monitor;
  const [health, setHealth] = useState<PlatformHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await checkPlatformHealth();
      setHealth(result);
      logger.info('platform_health_checked', { overall: result.overall });
    } catch (e) {
      setError((e as Error).message);
      logger.error('platform_health_check_failed', { error: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, [refresh]);

  const isEs = lang === 'es';

  const RESPONSE_DATA = [
    { label: '09:00', value: 120 },
    { label: '10:00', value: 145 },
    { label: '11:00', value: 98 },
    { label: '12:00', value: 200 },
    { label: '13:00', value: 178 },
    { label: '14:00', value: 250 },
    { label: '15:00', value: 220 },
  ];

  const METRICS = [
    { label: mo.latency, value: health ? `${health.api.latencyMs}ms` : '—', sub: mo.thisMonth, trend: 'up' as const, color: 'text-success-400', sparkData: [200, 180, 160, 155, 170, 145, 142], sparkColor: '#22c55e' },
    { label: mo.errorRate, value: '0.8%', sub: mo.vsYesterday, trend: 'down' as const, color: 'text-warning-400', sparkData: [0.5, 0.6, 0.7, 0.9, 0.8, 0.7, 0.8], sparkColor: '#eab308' },
    { label: mo.throughput, value: '847 rpm', sub: '+18% ' + mo.vsYesterday, trend: 'up' as const, color: 'text-brand-400', sparkData: [500, 600, 650, 720, 780, 820, 847], sparkColor: '#0072e6' },
    { label: mo.uptime, value: '99.97%', sub: mo.thisMonth, trend: 'up' as const, color: 'text-success-400', sparkData: [100, 100, 99.9, 100, 100, 100, 99.97], sparkColor: '#22c55e' },
  ];

  const overallInfo = health ? HEALTH_STATUS_INFO[health.overall] : HEALTH_STATUS_INFO.unknown;

  return (
    <div data-testid="monitor-page" className="p-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-neutral-100 flex items-center gap-2">
            {mo.title} <DemoBadge label={isEs ? 'Métricas históricas demo' : 'Demo historical'} />
          </h2>
          <p className="text-sm text-neutral-500 mt-0.5">{mo.subtitle}</p>
        </div>
        <button
          data-testid="health-refresh"
          onClick={refresh}
          disabled={loading}
          className="btn-ghost text-xs flex items-center gap-1.5 disabled:opacity-50"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          {isEs ? 'Actualizar' : 'Refresh'}
        </button>
      </div>

      {/* Overall status banner */}
      <div data-testid="platform-health-banner" className={`card p-4 flex items-center gap-3 ${
        health?.overall === 'operational' ? 'border-success-500/20 bg-success-500/5' :
        health?.overall === 'degraded' ? 'border-warning-500/20 bg-warning-500/5' :
        health?.overall === 'outage' ? 'border-error-500/20 bg-error-500/5' : ''
      }`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${overallInfo.color} bg-surface-800`}>
          {health?.overall === 'operational' ? <CheckCircle size={20} /> :
           health?.overall === 'outage' ? <AlertCircle size={20} /> :
           <Activity size={20} className={loading ? 'animate-pulse' : ''} />}
        </div>
        <div>
          <p className="text-sm font-medium text-neutral-100">
            {isEs ? 'Estado de la plataforma' : 'Platform status'}: <span className={overallInfo.color}>{overallInfo.label}</span>
          </p>
          <p className="text-xs text-neutral-500">
            {health ? `${isEs ? 'Verificado' : 'Checked'} ${new Date(health.api.lastChecked).toLocaleTimeString(isEs ? 'es-ES' : 'en-US')}` : isEs ? 'Verificando...' : 'Checking...'}
          </p>
        </div>
      </div>

      {/* Metrics grid (historical — demo) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {METRICS.map((metric) => (
          <div key={metric.label} className="card-hover p-5">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs text-neutral-500 font-medium">{metric.label}</p>
              <Sparkline data={metric.sparkData} color={metric.sparkColor} height={28} />
            </div>
            <p className={`text-xl font-bold ${metric.color}`}>{metric.value}</p>
            <div className={`flex items-center gap-1 mt-1.5 text-xs ${metric.trend === 'up' ? 'text-success-400' : 'text-error-400'}`}>
              {metric.trend === 'up' ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {metric.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Live health services */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-neutral-100">{isEs ? 'Salud de servicios' : 'Service health'}</h3>
              <p className="text-xs text-neutral-500 mt-0.5">{isEs ? 'Verificación en tiempo real' : 'Real-time check'}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${overallInfo.dot} ${loading ? 'animate-pulse' : ''}`} />
              <span className="text-xs text-neutral-500">{loading ? (isEs ? 'Verificando' : 'Checking') : (isEs ? 'En vivo' : 'Live')}</span>
            </div>
          </div>
          {error ? (
            <div className="text-xs text-error-400 py-4 text-center">{error}</div>
          ) : health ? (
            <div data-testid="health-services-list" className="space-y-3">
              <ServiceRow svc={health.api} />
              <ServiceRow svc={health.database} />
              <ServiceRow svc={health.ai} />
              <ServiceRow svc={health.connectors} />
              <ServiceRow svc={health.queues} />
              <ServiceRow svc={health.notifications} />
            </div>
          ) : (
            <div className="space-y-3">
              {[1,2,3,4,5,6].map((i) => (
                <div key={i} className="h-8 rounded bg-surface-700 animate-pulse" />
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-neutral-100">{mo.chartTitle}</h3>
              <p className="text-xs text-neutral-500 mt-0.5">{mo.chartSubtitle}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-brand-500" />
              <span className="text-xs text-neutral-500">{mo.chartLegend}</span>
            </div>
          </div>
          <BarChart data={RESPONSE_DATA} color="#0072e6" height={130} />
        </div>
      </div>
    </div>
  );
}
