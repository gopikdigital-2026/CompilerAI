import { CheckCircle, AlertTriangle, AlertCircle, Clock, Activity, Cpu } from 'lucide-react';
import { AI_MODULES } from '../../lib/enterpriseMocks';
import type { ModuleHealth } from '../../types/enterprise';

const HEALTH_CONFIG: Record<ModuleHealth, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  healthy: { label: 'Saludable', color: '#34d399', bg: 'rgba(52,211,153,0.1)',  icon: <CheckCircle size={13} /> },
  warning: { label: 'Alerta',    color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  icon: <AlertTriangle size={13} /> },
  error:   { label: 'Error',     color: '#f87171', bg: 'rgba(248,113,113,0.1)', icon: <AlertCircle size={13} /> },
  idle:    { label: 'Inactivo',  color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', icon: <Clock size={13} /> },
};

function formatNum(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

export function AIHealthMonitor() {
  const avgLatency = Math.round(AI_MODULES.reduce((s, m) => s + m.latencyMs, 0) / AI_MODULES.length);
  const totalReqs  = AI_MODULES.reduce((s, m) => s + m.requestsToday, 0);
  const warnings   = AI_MODULES.filter(m => m.health === 'warning' || m.health === 'error').length;

  return (
    <div className="p-6 space-y-5">
      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard label="Módulos activos" value={`${AI_MODULES.length - warnings} / ${AI_MODULES.length}`} color="#34d399" />
        <SummaryCard label="Peticiones hoy"  value={formatNum(totalReqs)} color="#60a5fa" />
        <SummaryCard label="Latencia media"  value={`${avgLatency}ms`}    color="#a78bfa" />
      </div>

      {/* Module cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
        {AI_MODULES.map(m => {
          const hc = HEALTH_CONFIG[m.health];
          return (
            <div key={m.id}
              className="bg-surface-800 border border-surface-700 rounded-2xl p-4 hover:border-surface-600 transition-all hover:shadow-lg"
              style={{ borderTopColor: hc.color, borderTopWidth: 2 }}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-neutral-200 leading-none">{m.name}</p>
                  <p className="text-[10px] text-neutral-600 mt-0.5 leading-relaxed">{m.description}</p>
                </div>
                <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg ml-2 flex-shrink-0"
                  style={{ background: hc.bg, color: hc.color }}>
                  {hc.icon} {hc.label}
                </span>
              </div>

              {/* Metrics grid */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <Metric label="Latencia" value={`${m.latencyMs}ms`} warn={m.latencyMs > 500} />
                <Metric label="Peticiones hoy" value={formatNum(m.requestsToday)} />
                <Metric label="Error rate" value={`${m.errorRate}%`} warn={m.errorRate > 1} />
                <Metric label="Uptime" value={`${m.uptimePct}%`} />
              </div>

              {/* Error rate bar */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] text-neutral-600">Tasa de error</span>
                  <span className="text-[9px] font-semibold" style={{ color: m.errorRate > 1 ? '#f59e0b' : '#34d399' }}>{m.errorRate}%</span>
                </div>
                <div className="h-1 bg-surface-700 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(m.errorRate * 10, 100)}%`,
                      background: m.errorRate > 1 ? '#f59e0b' : '#34d399',
                    }} />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-surface-700">
                <span className="text-[9px] font-mono text-neutral-600">v{m.version}</span>
                <span className="text-[9px] text-neutral-700">
                  Verificado: {new Date(m.lastChecked).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-surface-800 border border-surface-700 rounded-xl px-4 py-3 text-center">
      <p className="text-lg font-bold" style={{ color }}>{value}</p>
      <p className="text-[10px] text-neutral-500 mt-0.5">{label}</p>
    </div>
  );
}

function Metric({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="bg-surface-900 rounded-lg px-2.5 py-2">
      <p className="text-[9px] text-neutral-600 mb-0.5">{label}</p>
      <p className={`text-xs font-semibold ${warn ? 'text-amber-400' : 'text-neutral-200'}`}>{value}</p>
    </div>
  );
}
