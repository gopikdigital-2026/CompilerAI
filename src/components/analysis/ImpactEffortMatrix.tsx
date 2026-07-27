import { useRef, useMemo } from 'react';
import { TrendingUp, Target, Zap, Clock } from 'lucide-react';
import type { AnalysisOpportunity, OpportunityFilters } from '../../types/analysis';
import {
  calculateMatrixPosition,
  QUADRANT_INFO,
  AREA_FILTERS,
  OPPORTUNITY_STATUS_INFO,
  filterOpportunities,
} from '../../lib/prioritizationEngine';

interface ImpactEffortMatrixProps {
  opportunities: AnalysisOpportunity[];
  filters: OpportunityFilters;
  onSelectOpportunity?: (opp: AnalysisOpportunity) => void;
}

const quadrantIcons = {
  quick_wins: Zap,
  strategic: Target,
  fill_ins: Clock,
  time_sinks: TrendingUp,
};

export function ImpactEffortMatrix({ opportunities, filters, onSelectOpportunity }: ImpactEffortMatrixProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const filtered = useMemo(
    () => filterOpportunities(opportunities, filters),
    [opportunities, filters],
  );

  const positioned = useMemo(
    () => filtered.map((opp) => ({ opp, pos: calculateMatrixPosition(opp) })),
    [filtered],
  );

  const quadrantCounts = useMemo(() => {
    const counts = { quick_wins: 0, strategic: 0, fill_ins: 0, time_sinks: 0 };
    for (const { pos } of positioned) {
      counts[pos.quadrant]++;
    }
    return counts;
  }, [positioned]);

  // SVG dimensions
  const size = 400;
  const padding = 40;
  const plotSize = size - padding * 2;

  function handleDotClick(opp: AnalysisOpportunity) {
    onSelectOpportunity?.(opp);
  }

  return (
    <div data-testid="impact-effort-matrix" className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Target size={16} className="text-brand-400" />
        <h3 className="text-sm font-semibold text-neutral-100">Matriz Impacto / Esfuerzo</h3>
        <span className="text-xs text-neutral-500 ml-auto">{filtered.length} oportunidades</span>
      </div>

      {/* Quadrant legend */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        {(Object.keys(QUADRANT_INFO) as Array<keyof typeof QUADRANT_INFO>).map((key) => {
          const info = QUADRANT_INFO[key];
          const Icon = quadrantIcons[key];
          return (
            <div key={key} className={`p-2 rounded-lg border ${info.color}`}>
              <div className="flex items-center gap-1.5">
                <Icon size={12} />
                <span className="text-xs font-medium">{info.label}</span>
              </div>
              <p className="text-[10px] text-neutral-500 mt-0.5">{info.description}</p>
              <p className="text-xs text-neutral-300 mt-1 font-bold">{quadrantCounts[key]}</p>
            </div>
          );
        })}
      </div>

      {/* Matrix plot */}
      <div className="flex justify-center">
        <svg ref={svgRef} width={size} height={size} className="max-w-full" data-testid="matrix-svg">
          {/* Background quadrants */}
          {/* Quick wins (top-left) */}
          <rect
            x={padding} y={padding}
            width={plotSize / 2} height={plotSize / 2}
            fill="rgba(34, 197, 94, 0.05)" stroke="rgba(34, 197, 94, 0.15)" strokeWidth="1"
          />
          {/* Strategic (top-right) */}
          <rect
            x={padding + plotSize / 2} y={padding}
            width={plotSize / 2} height={plotSize / 2}
            fill="rgba(99, 102, 241, 0.05)" stroke="rgba(99, 102, 241, 0.15)" strokeWidth="1"
          />
          {/* Fill ins (bottom-left) */}
          <rect
            x={padding} y={padding + plotSize / 2}
            width={plotSize / 2} height={plotSize / 2}
            fill="rgba(115, 115, 115, 0.05)" stroke="rgba(115, 115, 115, 0.15)" strokeWidth="1"
          />
          {/* Time sinks (bottom-right) */}
          <rect
            x={padding + plotSize / 2} y={padding + plotSize / 2}
            width={plotSize / 2} height={plotSize / 2}
            fill="rgba(245, 158, 11, 0.05)" stroke="rgba(245, 158, 11, 0.15)" strokeWidth="1"
          />

          {/* Axes */}
          <line x1={padding} y1={size / 2} x2={size - padding} y2={size / 2} stroke="rgb(64, 64, 64)" strokeWidth="1" strokeDasharray="4,4" />
          <line x1={size / 2} y1={padding} x2={size / 2} y2={size - padding} stroke="rgb(64, 64, 64)" strokeWidth="1" strokeDasharray="4,4" />

          {/* Axis labels */}
          <text x={size / 2} y={size - 8} textAnchor="middle" className="fill-neutral-500" fontSize="11">Esfuerzo →</text>
          <text x={12} y={size / 2} textAnchor="middle" className="fill-neutral-500" fontSize="11" transform={`rotate(-90, 12, ${size / 2})`}>Impacto →</text>

          {/* Quadrant labels */}
          <text x={padding + plotSize / 4} y={padding + 16} textAnchor="middle" className="fill-success-400" fontSize="9" fontWeight="600">Ganancias rápidas</text>
          <text x={padding + (plotSize * 3) / 4} y={padding + 16} textAnchor="middle" className="fill-brand-400" fontSize="9" fontWeight="600">Estratégicas</text>
          <text x={padding + plotSize / 4} y={size - padding - 4} textAnchor="middle" className="fill-neutral-500" fontSize="9" fontWeight="600">Rellenos</text>
          <text x={padding + (plotSize * 3) / 4} y={size - padding - 4} textAnchor="middle" className="fill-warning-400" fontSize="9" fontWeight="600">Sumideros</text>

          {/* Opportunity dots */}
          {positioned.map(({ opp, pos }) => {
            const cx = padding + pos.x * plotSize;
            const cy = padding + (1 - pos.y) * plotSize;
            const color =
              opp.priority === 'critical' ? 'rgb(239, 68, 68)' :
              opp.priority === 'high' ? 'rgb(245, 158, 11)' :
              opp.priority === 'medium' ? 'rgb(99, 102, 241)' :
              'rgb(115, 115, 115)';
            const statusInfo = OPPORTUNITY_STATUS_INFO[opp.status];
            const isDone = opp.status === 'completed' || opp.status === 'discarded';
            return (
              <g key={opp.id} className="cursor-pointer" onClick={() => handleDotClick(opp)}>
                <circle
                  cx={cx} cy={cy} r={isDone ? 4 : 7}
                  fill={isDone ? 'none' : color}
                  fillOpacity={isDone ? 0 : 0.7}
                  stroke={color}
                  strokeWidth={isDone ? 1 : 1.5}
                  strokeOpacity={isDone ? 0.4 : 1}
                  className="transition-all hover:r-9"
                />
                <title>{opp.title} — {statusInfo?.label ?? opp.status}</title>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Filter dropdowns */}
      <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-surface-700">
        <div>
          <label className="text-[10px] text-neutral-600 uppercase tracking-wider">Área</label>
          <select
            data-testid="matrix-filter-area"
            value={filters.area}
            onChange={() => {}}
            className="w-full mt-1 text-xs bg-surface-800 border border-surface-700 rounded px-2 py-1 text-neutral-300"
          >
            <option value="all">Todas</option>
            {AREA_FILTERS.map((a) => (
              <option key={a.id} value={a.id}>{a.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-neutral-600 uppercase tracking-wider">Prioridad</label>
          <select
            data-testid="matrix-filter-priority"
            value={filters.priority}
            onChange={() => {}}
            className="w-full mt-1 text-xs bg-surface-800 border border-surface-700 rounded px-2 py-1 text-neutral-300"
          >
            <option value="all">Todas</option>
            <option value="critical">Crítica</option>
            <option value="high">Alta</option>
            <option value="medium">Media</option>
            <option value="low">Baja</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] text-neutral-600 uppercase tracking-wider">Estado</label>
          <select
            data-testid="matrix-filter-status"
            value={filters.status}
            onChange={() => {}}
            className="w-full mt-1 text-xs bg-surface-800 border border-surface-700 rounded px-2 py-1 text-neutral-300"
          >
            <option value="all">Todos</option>
            <option value="new">Nueva</option>
            <option value="reviewed">Revisada</option>
            <option value="approved">Aprobada</option>
            <option value="in_progress">En ejecución</option>
            <option value="completed">Completada</option>
            <option value="discarded">Descartada</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8">
          <Target size={24} className="text-neutral-600 mx-auto mb-2" />
          <p className="text-xs text-neutral-500">Sin oportunidades para los filtros seleccionados</p>
        </div>
      )}
    </div>
  );
}
