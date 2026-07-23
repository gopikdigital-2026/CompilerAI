import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useApiAdapter } from '../../api/ApiAdapterContext';
import { sanitizeError } from '../../api/sanitizers';
import { Card, LoadingSpinner, ErrorState } from '../../components/ui';
import { useTheme } from '../../hooks/useTheme';

function formatTime(v: string): string {
  return new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function TelemetryPage() {
  const { theme } = useTheme();
  const adapter = useApiAdapter();
  const axisColor = theme === 'dark' ? '#94a3b8' : '#64748b';
  const gridColor = theme === 'dark' ? '#1e2538' : '#e2e8f0';
  const tooltipStyle = { background: theme === 'dark' ? '#111720' : '#fff', border: `1px solid ${gridColor}`, borderRadius: 8, fontSize: 12 };

  const { data: series, isLoading: seriesLoading, isError: seriesError, error: seriesErr, refetch: refetchSeries } = useQuery({
    queryKey: ['telemetry-series-full'],
    queryFn: () => adapter.getTelemetrySeries(30),
    retry: 1,
    staleTime: 8_000,
  });

  const { data: engines, isLoading: enginesLoading } = useQuery({
    queryKey: ['engine-metrics'],
    queryFn: () => adapter.getEngineMetrics(),
    retry: 1,
    staleTime: 8_000,
  });

  if (seriesLoading || enginesLoading) return <LoadingSpinner label="Loading telemetry..." />;
  if (seriesError) {
    return <ErrorState message={sanitizeError(seriesErr).message} onRetry={() => refetchSeries()} retryAvailable />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">Telemetry</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Performance metrics and engine analytics</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-neutral-700 dark:text-neutral-300">Latency (ms)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={series ?? []}>
              <defs>
                <linearGradient id="latArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0072e6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0072e6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="timestamp" tick={{ fill: axisColor, fontSize: 10 }} tickFormatter={formatTime} />
              <YAxis tick={{ fill: axisColor, fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} labelFormatter={formatTime} />
              <Area type="monotone" dataKey="latencyMs" stroke="#0072e6" fill="url(#latArea)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-neutral-700 dark:text-neutral-300">Throughput (req/s)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={series ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="timestamp" tick={{ fill: axisColor, fontSize: 10 }} tickFormatter={formatTime} />
              <YAxis tick={{ fill: axisColor, fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} labelFormatter={formatTime} />
              <Line type="monotone" dataKey="throughput" stroke="#00e6b4" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-neutral-700 dark:text-neutral-300">Error Rate (%)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={series ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="timestamp" tick={{ fill: axisColor, fontSize: 10 }} tickFormatter={formatTime} />
              <YAxis tick={{ fill: axisColor, fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} labelFormatter={formatTime} />
              <Line type="monotone" dataKey="errorRate" stroke="#ef4444" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-neutral-700 dark:text-neutral-300">CPU & Memory</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={series ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="timestamp" tick={{ fill: axisColor, fontSize: 10 }} tickFormatter={formatTime} />
              <YAxis yAxisId="left" tick={{ fill: axisColor, fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: axisColor, fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} labelFormatter={formatTime} />
              <Line yAxisId="left" type="monotone" dataKey="cpuUsage" stroke="#facc15" strokeWidth={2} dot={false} name="CPU %" />
              <Line yAxisId="right" type="monotone" dataKey="memoryMb" stroke="#0072e6" strokeWidth={2} dot={false} name="Memory (MB)" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="mb-4 text-sm font-semibold text-neutral-700 dark:text-neutral-300">Engine Performance</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={engines ?? []}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="engine" tick={{ fill: axisColor, fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
            <YAxis tick={{ fill: axisColor, fontSize: 10 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="avgDurationMs" fill="#0072e6" radius={[4, 4, 0, 0]} name="Avg Duration (ms)" />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
