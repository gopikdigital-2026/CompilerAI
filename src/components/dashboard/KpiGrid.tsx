import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { DashboardKpi } from '../../hooks/useDashboard';

interface KpiGridProps {
  kpis: DashboardKpi[];
}

export function KpiGrid({ kpis }: KpiGridProps) {
  return (
    <div data-testid="kpi-grid" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => {
        const TrendIcon = kpi.trend === 'up' ? TrendingUp : kpi.trend === 'down' ? TrendingDown : Minus;
        const trendColor = kpi.trend === 'up' ? 'text-success-400' : kpi.trend === 'down' ? 'text-error-400' : 'text-neutral-500';
        return (
          <div key={kpi.id} className="card-hover p-5" data-testid={`kpi-${kpi.id}`}>
            <div className="flex items-start justify-between mb-3">
              <p className="text-2xl font-bold text-neutral-100">{kpi.value}</p>
              {kpi.change && (
                <div className={`flex items-center gap-1 text-xs font-medium ${trendColor}`}>
                  <TrendIcon size={12} />
                  {kpi.change}
                </div>
              )}
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">{kpi.label}</p>
            <div className="flex items-center gap-1.5 mt-2">
              {kpi.isEstimate && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning-500/10 text-warning-400 border border-warning-500/20">
                  Estimate
                </span>
              )}
              <span className="text-[10px] text-neutral-600 font-mono">{kpi.source}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
