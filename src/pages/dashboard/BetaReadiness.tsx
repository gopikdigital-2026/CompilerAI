import { useState, useEffect, useCallback } from 'react';
import {
  Activity, AlertCircle, CheckCircle, Server, Cpu, Mail, CreditCard,
  Plug, Clock, Users, BarChart3, ListChecks, RefreshCw, ShieldCheck,
} from 'lucide-react';
import { BarChart } from '../../components/ui/BarChart';
import { DemoBadge } from '../../components/ui/DemoBadge';
import { FeatureFlagsPanel } from '../../components/ui/FeatureFlagsPanel';
import { useAuth } from '../../hooks/useAuth';
import { useOrganization } from '../../hooks/useOrganization';
import { useToast } from '../../components/ui/Toast';
import { checkBetaHealth, type BetaMetrics, type ServiceCheck } from '../../lib/betaHealthService';
import { logger } from '../../lib/logger';

const SERVICE_ICONS: Record<string, typeof Server> = {
  Supabase: Server,
  OpenAI: Cpu,
  Resend: Mail,
  Stripe: CreditCard,
  Connectors: Plug,
};

const STATUS_STYLES: Record<ServiceCheck['status'], { label: string; color: string; dot: string }> = {
  operational: { label: 'Operativo', color: 'text-success-400', dot: 'bg-success-400' },
  degraded: { label: 'Degradado', color: 'text-warning-400', dot: 'bg-warning-400' },
  outage: { label: 'Caído', color: 'text-error-400', dot: 'bg-error-400' },
  unknown: { label: 'Desconocido', color: 'text-neutral-500', dot: 'bg-neutral-500' },
};

function ServiceCard({ svc }: { svc: ServiceCheck }) {
  const info = STATUS_STYLES[svc.status];
  const Icon = SERVICE_ICONS[svc.name] ?? Activity;
  return (
    <div data-testid={`beta-service-${svc.name}`} className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon size={16} className="text-neutral-400" />
          <span className="text-sm font-medium text-neutral-200">{svc.name}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${info.dot} ${svc.status === 'degraded' ? 'animate-pulse' : ''}`} />
          <span className={`text-xs font-medium ${info.color}`}>{info.label}</span>
        </div>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-neutral-600">{svc.details}</span>
        <span className="text-neutral-500 font-mono">{svc.latencyMs}ms</span>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, color }: { icon: typeof Users; label: string; value: string | number; color: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} className={color} />
        <span className="text-xs text-neutral-500 font-medium">{label}</span>
      </div>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

export function BetaReadinessDashboard() {
  const { user } = useAuth();
  const { activeOrg } = useOrganization();
  const toast = useToast();
  const [metrics, setMetrics] = useState<BetaMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await checkBetaHealth();
      setMetrics(result);
    } catch (e) {
      setError((e as Error).message);
      logger.error('beta_dashboard_load_failed', { error: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, [refresh]);

  const hasOutage = metrics?.services.some((s) => s.status === 'outage');
  const hasDegraded = metrics?.services.some((s) => s.status === 'degraded');
  const overall = hasOutage ? 'outage' : hasDegraded ? 'degraded' : 'operational';
  const overallInfo = STATUS_STYLES[overall as ServiceCheck['status']];

  return (
    <div data-testid="beta-readiness-dashboard" className="p-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-neutral-100 flex items-center gap-2">
            <ShieldCheck size={20} className="text-brand-400" />
            Beta Readiness Dashboard
          </h2>
          <p className="text-sm text-neutral-500 mt-0.5">
            Panel interno para administradores — {activeOrg?.name ?? '—'}
          </p>
        </div>
        <button onClick={refresh} disabled={loading} className="btn-ghost text-xs flex items-center gap-1.5 disabled:opacity-50">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* Overall status banner */}
      <div data-testid="beta-overall-status" className={`card p-4 flex items-center gap-3 ${
        overall === 'operational' ? 'border-success-500/20 bg-success-500/5' :
        overall === 'degraded' ? 'border-warning-500/20 bg-warning-500/5' :
        'border-error-500/20 bg-error-500/5'
      }`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-surface-800 ${overallInfo.color}`}>
          {overall === 'operational' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-neutral-100">
            Estado general: <span className={overallInfo.color}>{overallInfo.label}</span>
          </p>
          <p className="text-xs text-neutral-500">
            {metrics ? `Última verificación: ${new Date().toLocaleTimeString('es-ES')}` : 'Verificando...'}
          </p>
        </div>
        {user && (
          <div className="text-right">
            <p className="text-xs text-neutral-600">Admin</p>
            <p className="text-xs text-neutral-400 font-mono">{user.email}</p>
          </div>
        )}
      </div>

      {/* Service cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        {loading && !metrics ? (
          [1,2,3,4,5].map((i) => <div key={i} className="card p-4 h-20 animate-pulse" />)
        ) : metrics ? (
          metrics.services.map((svc) => <ServiceCard key={svc.name} svc={svc} />)
        ) : null}
      </div>

      {/* Metrics grid */}
      {metrics && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <MetricCard icon={Clock} label="Respuesta media" value={`${metrics.avgResponseMs}ms`} color="text-brand-400" />
          <MetricCard icon={Users} label="Usuarios activos" value={metrics.activeUsers} color="text-accent-400" />
          <MetricCard icon={BarChart3} label="Análisis ejecutados" value={metrics.analysesExecuted} color="text-success-400" />
          <MetricCard icon={ListChecks} label="Acciones totales" value={metrics.totalActions} color="text-warning-400" />
          <MetricCard icon={AlertCircle} label="Feedback abierto" value={metrics.openFeedback} color="text-error-400" />
        </div>
      )}

      {/* Two-column: errors + feature flags */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Recent errors */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-neutral-100">Errores críticos recientes</h3>
              <p className="text-xs text-neutral-500 mt-0.5">Últimos errores JavaScript capturados</p>
            </div>
            <DemoBadge />
          </div>
          {error ? (
            <div className="text-xs text-error-400 py-2">{error}</div>
          ) : metrics && metrics.recentErrors.length > 0 ? (
            <div data-testid="beta-recent-errors" className="space-y-2 max-h-64 overflow-y-auto">
              {metrics.recentErrors.map((err, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-surface-750">
                  <AlertCircle size={12} className="text-error-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-neutral-300 font-mono truncate">{err.message}</p>
                    <p className="text-[10px] text-neutral-600 mt-0.5">
                      {err.type} · {new Date(err.timestamp).toLocaleTimeString('es-ES')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle size={24} className="text-success-400 mb-2" />
              <p className="text-xs text-neutral-500">Sin errores recientes</p>
            </div>
          )}
        </div>

        {/* Feature Flags */}
        <FeatureFlagsPanel />
      </div>

      {/* Activity chart (demo data) */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-sm font-semibold text-neutral-100">Actividad de análisis</h3>
            <p className="text-xs text-neutral-500 mt-0.5">Últimos 7 días</p>
          </div>
          <DemoBadge label="Demo" />
        </div>
        <BarChart
          data={[
            { label: 'L', value: 3 }, { label: 'M', value: 7 }, { label: 'X', value: 5 },
            { label: 'J', value: 12 }, { label: 'V', value: 9 }, { label: 'S', value: 2 }, { label: 'D', value: 1 },
          ]}
          color="#0072e6"
          height={120}
        />
      </div>
    </div>
  );
}
