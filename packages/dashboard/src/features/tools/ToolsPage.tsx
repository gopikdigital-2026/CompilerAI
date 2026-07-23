import { useQuery } from '@tanstack/react-query';
import { Wrench, Clock, TrendingUp, AlertCircle } from 'lucide-react';
import { useApiAdapter } from '../../api/ApiAdapterContext';
import { sanitizeError } from '../../api/sanitizers';
import { Card, LoadingSpinner, EmptyState, ErrorState } from '../../components/ui';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useTheme } from '../../hooks/useTheme';

export function ToolsPage() {
  const { theme } = useTheme();
  const adapter = useApiAdapter();
  const axisColor = theme === 'dark' ? '#94a3b8' : '#64748b';
  const gridColor = theme === 'dark' ? '#1e2538' : '#e2e8f0';
  const tooltipStyle = { background: theme === 'dark' ? '#111720' : '#fff', border: `1px solid ${gridColor}`, borderRadius: 8, fontSize: 12 };

  const { data: tools, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['tool-stats'],
    queryFn: () => adapter.getToolStats(),
    retry: 1,
    staleTime: 8_000,
  });

  if (isLoading) return <LoadingSpinner label="Loading tool stats..." />;
  if (isError) {
    return <ErrorState message={sanitizeError(error).message} onRetry={() => refetch()} retryAvailable />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">Tool Explorer</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Registered tools, usage frequency, and performance metrics</p>
      </div>

      <Card className="p-5">
        <h3 className="mb-4 text-sm font-semibold text-neutral-700 dark:text-neutral-300">Tool Invocations</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={tools ?? []} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis type="number" tick={{ fill: axisColor, fontSize: 10 }} />
            <YAxis type="category" dataKey="name" tick={{ fill: axisColor, fontSize: 10 }} width={120} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="invocations" fill="#0072e6" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {!tools || tools.length === 0 ? (
        <EmptyState message="No tools registered" icon={<Wrench className="h-10 w-10" />} />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wider text-neutral-500 dark:border-surface-700 dark:text-neutral-400">
                  <th className="px-4 py-3 font-medium">Tool</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Invocations</th>
                  <th className="px-4 py-3 font-medium">Avg Duration</th>
                  <th className="px-4 py-3 font-medium">Success Rate</th>
                  <th className="px-4 py-3 font-medium">Last Error</th>
                  <th className="px-4 py-3 font-medium">Last Used</th>
                </tr>
              </thead>
              <tbody>
                {tools.map((tool) => (
                  <tr key={tool.toolId} className="table-row">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Wrench className="h-4 w-4 text-neutral-400" />
                        <div>
                          <p className="font-medium text-neutral-900 dark:text-neutral-100">{tool.name}</p>
                          <p className="font-mono text-xs text-neutral-400">{tool.toolId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="badge bg-neutral-100 text-neutral-600 dark:bg-surface-700 dark:text-neutral-300">{tool.category}</span>
                    </td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{tool.invocations}</td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-neutral-400" />{tool.avgDurationMs}ms</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-neutral-200 dark:bg-surface-700">
                          <div className={`h-full rounded-full ${tool.successRate > 95 ? 'bg-success-500' : tool.successRate > 85 ? 'bg-warning-500' : 'bg-error-500'}`} style={{ width: `${tool.successRate}%` }} />
                        </div>
                        <span className="flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-300"><TrendingUp className="h-3 w-3" />{tool.successRate.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {tool.lastError ? (
                        <span className="flex items-center gap-1 text-error-600 dark:text-error-400"><AlertCircle className="h-3 w-3" />{tool.lastError}</span>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-500 dark:text-neutral-400">{new Date(tool.lastUsedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
