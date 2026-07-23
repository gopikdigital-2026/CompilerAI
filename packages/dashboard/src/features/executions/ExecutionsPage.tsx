import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight, Activity } from 'lucide-react';
import { useApiAdapter } from '../../api/ApiAdapterContext';
import { sanitizeError } from '../../api/sanitizers';
import { useUrlFilters } from '../../hooks/useUrlFilters';
import { Card, LoadingSpinner, EmptyState, ErrorState } from '../../components/ui';
import { ExecutionStatusBadge } from '../../components/StatusBadges';
import type { ExecutionSummary, ExecutionFilters } from '../../types/dashboard';

const STATUS_OPTIONS = ['ALL', 'RUNNING', 'COMPLETED', 'FAILED', 'PAUSED', 'AWAITING_APPROVAL', 'CANCELLED'];

interface ExecutionsUrlFilters {
  search: string;
  status: string;
  organizationId: string;
  [key: string]: string;
}

function formatDuration(ms: number | null): string {
  if (ms === null) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60_000).toFixed(1)}m`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function ExecutionsPage() {
  const navigate = useNavigate();
  const adapter = useApiAdapter();
  const { filters, setFilter, clearFilters } = useUrlFilters<ExecutionsUrlFilters>({
    search: '',
    status: 'ALL',
    organizationId: '',
  });

  const apiFilters: ExecutionFilters = {
    search: filters.search || undefined,
    status: filters.status,
    organizationId: filters.organizationId || undefined,
  };

  const { data: executions, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['executions', apiFilters],
    queryFn: () => adapter.getExecutions(apiFilters),
    retry: 1,
    staleTime: 8_000,
  });

  const orgOptions = useMemo(() => {
    const set = new Set<string>();
    executions?.forEach((e: ExecutionSummary) => set.add(e.organizationId));
    return Array.from(set).sort();
  }, [executions]);

  const hasActiveFilters = filters.search !== '' || filters.status !== 'ALL' || filters.organizationId !== '';

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">Execution Explorer</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Browse and filter all pipeline executions</p>
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              value={filters.search}
              onChange={(e) => setFilter('search', e.target.value)}
              placeholder="Search by execution ID, org, or workflow..."
              className="input pl-10"
            />
          </div>
          <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)} className="input md:w-44">
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s === 'ALL' ? 'All Statuses' : s}</option>)}
          </select>
          <select value={filters.organizationId} onChange={(e) => setFilter('organizationId', e.target.value)} className="input md:w-48">
            <option value="">All Organizations</option>
            {orgOptions.map((org) => <option key={org} value={org}>{org}</option>)}
          </select>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="btn-ghost text-xs">Clear Filters</button>
          )}
        </div>
      </Card>

      <Card className="overflow-hidden">
        {isLoading ? (
          <LoadingSpinner label="Loading executions..." />
        ) : isError ? (
          <ErrorState message={sanitizeError(error).message} onRetry={() => refetch()} retryAvailable />
        ) : !executions || executions.length === 0 ? (
          <EmptyState message="No executions match your filters" icon={<Activity className="h-10 w-10" />} />
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wider text-neutral-500 dark:border-surface-700 dark:text-neutral-400">
                  <th className="px-4 py-3 font-medium">Execution ID</th>
                  <th className="px-4 py-3 font-medium">Organization</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Workflow</th>
                  <th className="px-4 py-3 font-medium">Started</th>
                  <th className="px-4 py-3 font-medium">Duration</th>
                  <th className="px-4 py-3 font-medium">Result</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {executions.map((exec) => (
                  <tr
                    key={exec.executionId}
                    onClick={() => navigate(`/executions/${exec.executionId}`)}
                    className="table-row cursor-pointer"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-brand-600 dark:text-brand-400">{exec.executionId}</td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{exec.organizationId}</td>
                    <td className="px-4 py-3"><ExecutionStatusBadge status={exec.status} /></td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{exec.workflowName}</td>
                    <td className="px-4 py-3 text-xs text-neutral-500 dark:text-neutral-400">{formatTime(exec.startedAt)}</td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{formatDuration(exec.durationMs)}</td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{exec.result ?? '—'}</td>
                    <td className="px-4 py-3"><ChevronRight className="h-4 w-4 text-neutral-400" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
