import { TrendingUp, TrendingDown, Minus, CheckCircle, AlertTriangle, AlertCircle, Wrench } from 'lucide-react';
import { GLOBAL_KPIS, SYSTEM_STATUS } from '../../lib/enterpriseMocks';
import type { SystemStatus } from '../../types/enterprise';

const STATUS_CONFIG: Record<SystemStatus, { label: string; color: string; bg: string; dot: string }> = {
  operational:  { label: 'Operacional',  color: '#34d399', bg: 'rgba(52,211,153,0.1)',  dot: '#34d399' },
  degraded:     { label: 'Degradado',    color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  dot: '#f59e0b' },
  incident:     { label: 'Incidente',    color: '#f87171', bg: 'rgba(248,113,113,0.1)', dot: '#f87171' },
  maintenance:  { label: 'Mantenimiento',color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',  dot: '#60a5fa' },
};

export function ExecutiveDashboard() {
  const allOk = SYSTEM_STATUS.every(s => s.status === 'operational');
  const degraded = SYSTEM_STATUS.filter(s => s.status === 'degraded').length;

  return (
    <div className="p-6 space-y-6">
      {/* KPI Grid */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-600 mb-3">Indicadores Globales</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {GLOBAL_KPIS.map(kpi => (
            <KPICard key={kpi.id} kpi={kpi} />
          ))}
        </div>
      </div>

      {/* System Status */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-600">Estado del Sistema</h2>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
            allOk
              ? 'bg-green-900/30 text-green-400 border-green-900/50'
              : 'bg-amber-900/30 text-amber-400 border-amber-900/50'
          }`}>
            {allOk
              ? <><CheckCircle size={11} /> Todos los sistemas operacionales</>
              : <><AlertTriangle size={11} /> {degraded} servicio{degraded > 1 ? 's' : ''} degradado{degraded > 1 ? 's' : ''}</>
            }
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {SYSTEM_STATUS.map(s => {
            const cfg = STATUS_CONFIG[s.status];
            return (
              <div key={s.name} className="bg-surface-800 border border-surface-700 rounded-xl px-4 py-3 flex items-center gap-3 hover:border-surface-600 transition-colors">
                <div className="flex-shrink-0">
                  <div className="w-2 h-2 rounded-full" style={{ background: cfg.dot, boxShadow: s.status === 'operational' ? `0 0 6px ${cfg.dot}` : undefined }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-neutral-200 truncate">{s.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
                    <span className="text-[9px] text-neutral-600">{s.latencyMs}ms</span>
                    <span className="text-[9px] text-neutral-600">{s.uptimePct}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Uptime bar */}
      <div className="bg-surface-800 border border-surface-700 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-neutral-200">Disponibilidad global (30 días)</h3>
          <span className="text-xs font-mono text-green-400 bg-green-900/30 px-2 py-0.5 rounded-full border border-green-900/50">99.87%</span>
        </div>
        <div className="flex gap-0.5">
          {Array.from({ length: 30 }).map((_, i) => {
            const isToday = i === 29;
            const hasDeg  = i === 22 || i === 27;
            return (
              <div
                key={i}
                className="flex-1 rounded-sm h-6 transition-all hover:opacity-80"
                style={{
                  background: hasDeg ? '#f59e0b' : '#34d399',
                  opacity: isToday ? 1 : 0.6 + (i / 30) * 0.4,
                }}
                title={`Día ${i + 1}: ${hasDeg ? 'Degradado' : 'Operacional'}`}
              />
            );
          })}
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[9px] text-neutral-600">Hace 30 días</span>
          <span className="text-[9px] text-neutral-600">Hoy</span>
        </div>
      </div>
    </div>
  );
}

function KPICard({ kpi }: { kpi: typeof GLOBAL_KPIS[0] }) {
  return (
    <div className="bg-surface-800 border border-surface-700 rounded-2xl px-4 py-4 hover:border-surface-600 transition-all hover:shadow-lg group">
      <div className="flex items-center justify-between mb-2">
        <span className="text-base">{kpi.icon}</span>
        <div className={`flex items-center gap-1 text-[10px] font-semibold ${
          kpi.trend === 'up' ? 'text-green-400' : kpi.trend === 'down' ? 'text-red-400' : 'text-neutral-500'
        }`}>
          {kpi.trend === 'up' && <TrendingUp size={10} />}
          {kpi.trend === 'down' && <TrendingDown size={10} />}
          {kpi.trend === 'flat' && <Minus size={10} />}
          {kpi.change > 0 ? '+' : ''}{kpi.change}%
        </div>
      </div>
      <p className="text-xl font-bold text-neutral-100 leading-none mb-1">
        {kpi.value}{kpi.unit && <span className="text-xs font-normal text-neutral-500 ml-0.5">{kpi.unit}</span>}
      </p>
      <p className="text-[10px] text-neutral-500 group-hover:text-neutral-400 transition-colors">{kpi.label}</p>
    </div>
  );
}
