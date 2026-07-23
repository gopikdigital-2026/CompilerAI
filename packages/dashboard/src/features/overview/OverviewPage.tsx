import { useQuery } from '@tanstack/react-query';
import {
  Activity, CheckCircle2, XCircle, Clock, TrendingUp, Zap,
  Database, Gauge,
} from 'lucide-react';
import { useApiAdapter } from '../../api/ApiAdapterContext';
import { sanitizeError } from '../../api/sanitizers';
import { Card, StatCard, LoadingSpinner, ErrorState } from '../../components/ui';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';
import { useTheme } from '../../hooks/useTheme';

const PIE_COLORS = ['#0072e6', '#00e6b4', '#facc15', '#ef4444', '#94a3b8', '#1a8cff'];

export function OverviewPage() {
  const { theme } = useTheme();
  const adapter = useApiAdapter();
  const axisColor = theme === 'dark' ? '#94a3b8' : '#64748b';
  const gridColor = theme === 'dark' ? '#1e2538' : '#e2e8f0';

  const { data: stats, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => adapter.getDashboardStats(),
    retry: 1,
    staleTime: 8_000,
  });

  const { data: telemetry } = useQuery({
    queryKey: ['telemetry-series-dashboard'],
    queryFn: () => adapter.getTelemetrySeries(20),
    retry: 1,
    staleTime: 8_000,
  });

  if (isLoading) return <LoadingSpinner label="Loading dashboard..." />;
  if (isError) {
    const err = sanitizeError(error);
    return <ErrorState message={err.message} onRetry={() => refetch()} retryAvailable />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">Dashboard</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Platform overview and real-time metrics</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active Executions" value={stats?.activeExecutions ?? 0} icon={<Activity className="h-6 w-6" />} accent="brand" />
        <StatCard label="Completed" value={stats?.completedExecutions ?? 0} icon={<CheckCircle2 className="h-6 w-6" />} accent="success" />
        <StatCard label="Failed (24h)" value={stats?.errorsLast24h ?? 0} icon={<XCircle className="h-6 w-6" />} accent="error" />
        <StatCard label="Avg Duration" value={`${((stats?.avgDurationMs ?? 0) / 1000).toFixed(1)}s`} icon={<Clock className="h-6 w-6" />} accent="neutral" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Success Rate" value={`${stats?.successRate ?? 100}%`} icon={<TrendingUp className="h-6 w-6" />} accent="success" />
        <StatCard label="Tool Usage" value={stats?.toolUsage.length ?? 0} sublabel="tools active" icon={<Zap className="h-6 w-6" />} accent="accent" />
        <StatCard label="Memory Usage" value={`${(stats?.memoryConsumptionMb ?? 0).toFixed(0)} MB`} icon={<Database className="h-6 w-6" />} accent="brand" />
        <StatCard label="Avg Confidence" value={`${(stats?.avgConfidence ?? 0).toFixed(1)}%`} icon={<Gauge className="h-6 w-6" />} accent="accent" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-neutral-700 dark:text-neutral-300">Latency & Throughput</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={telemetry ?? []}>
              <defs>
                <linearGradient id="latGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0072e6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0072e6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="timestamp" tick={{ fill: axisColor, fontSize: 10 }} tickFormatter={(v: string) => new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} />
              <YAxis tick={{ fill: axisColor, fontSize: 10 }} />
              <Tooltip
                contentStyle={{ background: theme === 'dark' ? '#111720' : '#fff', border: `1px solid ${gridColor}`, borderRadius: 8, fontSize: 12 }}
                labelFormatter={(v: string) => new Date(v).toLocaleTimeString()}
              />
              <Area type="monotone" dataKey="latencyMs" stroke="#0072e6" fill="url(#latGrad)" strokeWidth={2} name="Latency (ms)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-neutral-700 dark:text-neutral-300">Tool Usage Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats?.toolUsage ?? []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis type="number" tick={{ fill: axisColor, fontSize: 10 }} />
              <YAxis type="category" dataKey="tool" tick={{ fill: axisColor, fontSize: 10 }} width={100} />
              <Tooltip contentStyle={{ background: theme === 'dark' ? '#111720' : '#fff', border: `1px solid ${gridColor}`, borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" fill="#00e6b4" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="mb-4 text-sm font-semibold text-neutral-700 dark:text-neutral-300">Memory Consumption (MB)</h3>
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={[
                { name: 'Working', value: 45 },
                { name: 'Session', value: 30 },
                { name: 'Organization', value: 15 },
                { name: 'Semantic', value: 7 },
                { name: 'Execution', value: 3 },
              ]}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={75}
              paddingAngle={2}
            >
              {PIE_COLORS.map((color, i) => (
                <Cell key={i} fill={color} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ background: theme === 'dark' ? '#111720' : '#fff', border: `1px solid ${gridColor}`, borderRadius: 8, fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
