import { BarChart } from '../ui/BarChart';
import { useTranslation } from '../../hooks/useTranslation';

interface RunsChartProps {
  data: { label: string; value: number }[];
}

export function RunsChart({ data }: RunsChartProps) {
  const { t } = useTranslation();
  const d = t.dashboard;

  const hasData = data.some((d) => d.value > 0);

  return (
    <div data-testid="runs-chart" className="card p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold text-neutral-100">{d.runsChartTitle}</h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            {d.runsChartSubtitle} · <span className="font-mono">execution_runs</span>
          </p>
        </div>
      </div>

      {hasData ? (
        <BarChart data={data} color="#0072e6" height={130} />
      ) : (
        <div className="h-[130px] flex items-center justify-center">
          <p className="text-sm text-neutral-500">{d.runsChartEmpty}</p>
        </div>
      )}
    </div>
  );
}
