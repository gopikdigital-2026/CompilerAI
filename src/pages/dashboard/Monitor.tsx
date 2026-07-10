import React from 'react';
import { Activity, AlertCircle, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { BarChart } from '../../components/ui/BarChart';
import { Sparkline } from '../../components/ui/Sparkline';
import { useTranslation } from '../../hooks/useTranslation';

const LOGS_EN = [
  { id: '1', time: '14:32:01', level: 'error',   source: 'SupportBot',              message: 'Unhandled exception: Connection timeout after 30s' },
  { id: '2', time: '14:30:45', level: 'success',  source: 'Lead Nurture Pipeline',   message: 'Completed successfully. Processed 142 contacts.' },
  { id: '3', time: '14:28:12', level: 'info',     source: 'DataSync Agent',          message: 'Sync started: 3 sources connected, 12,450 records queued.' },
  { id: '4', time: '14:25:33', level: 'warning',  source: 'API Gateway',             message: 'Rate limit approaching: 850/1000 requests used (85%).' },
  { id: '5', time: '14:22:17', level: 'success',  source: 'EmailCraft AI',           message: 'Campaign "Q4 Promo" sent to 5,200 recipients. Open rate 34%.' },
  { id: '6', time: '14:19:05', level: 'info',     source: 'PriceMonitor',            message: 'Price drop detected: Competitor A reduced by 12% on SKU-4821.' },
  { id: '7', time: '14:15:00', level: 'success',  source: 'ReportGen',               message: 'Weekly analytics report generated and sent to 8 stakeholders.' },
];

const LOGS_ES = [
  { id: '1', time: '14:32:01', level: 'error',   source: 'SupportBot',              message: 'Excepción no manejada: Timeout de conexión tras 30s' },
  { id: '2', time: '14:30:45', level: 'success',  source: 'Lead Nurture Pipeline',   message: 'Completado con éxito. Procesados 142 contactos.' },
  { id: '3', time: '14:28:12', level: 'info',     source: 'DataSync Agent',          message: 'Sincronización iniciada: 3 fuentes conectadas, 12.450 registros en cola.' },
  { id: '4', time: '14:25:33', level: 'warning',  source: 'API Gateway',             message: 'Límite de velocidad próximo: 850/1000 solicitudes usadas (85%).' },
  { id: '5', time: '14:22:17', level: 'success',  source: 'EmailCraft AI',           message: 'Campaña "Q4 Promo" enviada a 5.200 destinatarios. Tasa apertura 34%.' },
  { id: '6', time: '14:19:05', level: 'info',     source: 'PriceMonitor',            message: 'Bajada de precio detectada: Competidor A redujo un 12% en SKU-4821.' },
  { id: '7', time: '14:15:00', level: 'success',  source: 'ReportGen',               message: 'Reporte de analíticas semanal generado y enviado a 8 partes interesadas.' },
];

const LOG_STYLES = {
  error:   { color: 'text-error-400',   icon: <AlertCircle size={13} /> },
  success: { color: 'text-success-400', icon: <CheckCircle size={13} /> },
  warning: { color: 'text-warning-400', icon: <AlertCircle size={13} /> },
  info:    { color: 'text-brand-400',   icon: <Activity size={13} /> },
};

export function Monitor() {
  const { t, lang } = useTranslation();
  const mo = t.monitor;
  const LOGS = lang === 'es' ? LOGS_ES : LOGS_EN;

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
    { label: mo.latency, value: '142ms', sub: `-12ms ${mo.vsYesterday}`, trend: 'up', color: 'text-success-400', sparkData: [200, 180, 160, 155, 170, 145, 142], sparkColor: '#22c55e' },
    { label: mo.errorRate, value: '0.8%', sub: `+0.2% ${mo.vsYesterday}`, trend: 'down', color: 'text-warning-400', sparkData: [0.5, 0.6, 0.7, 0.9, 0.8, 0.7, 0.8], sparkColor: '#eab308' },
    { label: mo.throughput, value: '847 rpm', sub: `+18% ${mo.vsYesterday}`, trend: 'up', color: 'text-brand-400', sparkData: [500, 600, 650, 720, 780, 820, 847], sparkColor: '#0072e6' },
    { label: mo.uptime, value: '99.97%', sub: mo.thisMonth, trend: 'up', color: 'text-success-400', sparkData: [100, 100, 99.9, 100, 100, 100, 99.97], sparkColor: '#22c55e' },
  ];

  const SERVICES = mo.serviceNames.map((name, i) => ({
    name,
    status: i === 3 ? 'degraded' : 'operational',
    latency: ['23ms', '45ms', '12ms', '234ms', '8ms', '890ms'][i],
  }));

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div>
        <h2 className="text-xl font-semibold text-neutral-100">{mo.title}</h2>
        <p className="text-sm text-neutral-500 mt-0.5">{mo.subtitle}</p>
      </div>

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

      <div className="grid lg:grid-cols-2 gap-4">
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

        <div className="card p-5">
          <h3 className="text-sm font-semibold text-neutral-100 mb-4">{mo.servicesTitle}</h3>
          <div className="space-y-3">
            {SERVICES.map((svc) => (
              <div key={svc.name} className="flex items-center justify-between py-2 border-b border-surface-700 last:border-0">
                <div className="flex items-center gap-2.5">
                  <span className={`w-2 h-2 rounded-full ${svc.status === 'operational' ? 'bg-success-400' : 'bg-warning-400 animate-pulse'}`} />
                  <span className="text-sm text-neutral-300">{svc.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-neutral-500 font-mono">{svc.latency}</span>
                  <span className={`text-xs font-medium ${svc.status === 'operational' ? 'text-success-400' : 'text-warning-400'}`}>
                    {svc.status === 'operational' ? mo.operational : mo.degraded}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-700">
          <h3 className="text-sm font-semibold text-neutral-100">{mo.logsTitle}</h3>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-success-400 animate-pulse" />
            <span className="text-xs text-neutral-500">{mo.live}</span>
          </div>
        </div>
        <div className="divide-y divide-surface-700">
          {LOGS.map((log) => {
            const style = LOG_STYLES[log.level as keyof typeof LOG_STYLES];
            return (
              <div key={log.id} className="flex items-start gap-4 px-5 py-3 hover:bg-surface-750 transition-colors">
                <span className="text-[10px] font-mono text-neutral-600 flex-shrink-0 mt-0.5">{log.time}</span>
                <div className={`flex items-center gap-1 text-xs font-medium flex-shrink-0 ${style.color}`}>
                  {style.icon}
                  <span className="capitalize">{log.level}</span>
                </div>
                <span className="text-xs text-neutral-400 flex-shrink-0 hidden sm:block">{log.source}</span>
                <span className="text-xs text-neutral-500 min-w-0 truncate">{log.message}</span>
              </div>
            );
          })}
        </div>
        <div className="px-5 py-3 border-t border-surface-700">
          <button className="text-xs text-brand-400 hover:text-brand-300 transition-colors">{mo.viewAllLogs}</button>
        </div>
      </div>
    </div>
  );
}
