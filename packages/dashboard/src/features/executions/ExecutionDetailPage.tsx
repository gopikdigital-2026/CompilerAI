import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, XCircle, Clock, AlertTriangle, GitBranch } from 'lucide-react';
import { useApiAdapter } from '../../api/ApiAdapterContext';
import { sanitizeError } from '../../api/sanitizers';
import { Card, LoadingSpinner, ErrorState } from '../../components/ui';
import { ExecutionStatusBadge, RiskBadge } from '../../components/StatusBadges';
import type { StageDetail } from '../../types/dashboard';

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60_000).toFixed(1)}m`;
}

const stageStatusConfig: Record<StageDetail['status'], { icon: typeof CheckCircle2; color: string }> = {
  completed: { icon: CheckCircle2, color: 'text-success-500' },
  running: { icon: Clock, color: 'text-brand-500' },
  failed: { icon: XCircle, color: 'text-error-500' },
  skipped: { icon: AlertTriangle, color: 'text-neutral-400' },
  pending: { icon: Clock, color: 'text-neutral-400' },
};

export function ExecutionDetailPage() {
  const { executionId } = useParams<{ executionId: string }>();
  const adapter = useApiAdapter();

  const { data: detail, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['execution-detail', executionId],
    queryFn: () => adapter.getExecutionDetail(executionId!),
    enabled: !!executionId,
    retry: 1,
    staleTime: 8_000,
  });

  if (isLoading) return <LoadingSpinner label="Loading execution detail..." />;
  if (isError) {
    return <ErrorState message={sanitizeError(error).message} onRetry={() => refetch()} retryAvailable />;
  }
  if (!detail) return <ErrorState message="Execution not found" />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link to="/executions" className="btn-ghost p-1.5">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">{detail.executionId}</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{detail.workflowName} · {detail.organizationId}</p>
        </div>
        <ExecutionStatusBadge status={detail.status} />
        <Link to={`/executions/${detail.executionId}/trace`} className="btn-secondary text-xs">
          <GitBranch className="h-4 w-4" /> View Trace
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wider text-neutral-500">Started</p>
          <p className="mt-1 text-sm font-medium text-neutral-900 dark:text-neutral-50">{new Date(detail.startedAt).toLocaleString()}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wider text-neutral-500">Completed</p>
          <p className="mt-1 text-sm font-medium text-neutral-900 dark:text-neutral-50">{detail.completedAt ? new Date(detail.completedAt).toLocaleString() : '—'}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wider text-neutral-500">Duration</p>
          <p className="mt-1 text-sm font-medium text-neutral-900 dark:text-neutral-50">{detail.durationMs ? formatDuration(detail.durationMs) : '—'}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wider text-neutral-500">Warnings</p>
          <p className="mt-1 text-sm font-medium text-neutral-900 dark:text-neutral-50">{detail.warnings.length}</p>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="mb-4 text-sm font-semibold text-neutral-700 dark:text-neutral-300">Pipeline Stages</h3>
        <div className="space-y-1">
          {detail.stages.map((stage, idx) => {
            const cfg = stageStatusConfig[stage.status];
            const StageIcon = cfg.icon;
            return (
              <div key={stage.stage} className="flex items-center gap-4 rounded-lg px-3 py-2.5 transition-colors hover:bg-neutral-50 dark:hover:bg-surface-800/50">
                <div className="flex w-6 flex-shrink-0 items-center justify-center">
                  <span className="text-xs text-neutral-400">{idx + 1}</span>
                </div>
                <StageIcon className={`h-5 w-5 flex-shrink-0 ${cfg.color}`} />
                <div className="flex w-40 flex-shrink-0">
                  <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{stage.stage}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-surface-700">
                      <div
                        className={`h-full rounded-full ${stage.status === 'completed' ? 'bg-success-500' : stage.status === 'failed' ? 'bg-error-500' : stage.status === 'running' ? 'bg-brand-500' : 'bg-neutral-300'}`}
                        style={{ width: stage.status === 'completed' ? '100%' : stage.status === 'running' ? '60%' : '0%' }}
                      />
                    </div>
                    <span className="w-16 flex-shrink-0 text-right text-xs text-neutral-500 dark:text-neutral-400">{formatDuration(stage.durationMs)}</span>
                  </div>
                </div>
                <div className="flex w-24 flex-shrink-0 justify-end gap-2">
                  {stage.riskLevel && <RiskBadge level={stage.riskLevel} />}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {(detail.errors.length > 0 || detail.warnings.length > 0) && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {detail.errors.length > 0 && (
            <Card className="p-5">
              <h3 className="mb-3 text-sm font-semibold text-error-600 dark:text-error-400">Errors</h3>
              <ul className="space-y-2">
                {detail.errors.map((err, i) => (
                  <li key={i} className="rounded-lg bg-error-500/5 px-3 py-2 text-sm text-error-600 dark:text-error-400">{err}</li>
                ))}
              </ul>
            </Card>
          )}
          {detail.warnings.length > 0 && (
            <Card className="p-5">
              <h3 className="mb-3 text-sm font-semibold text-warning-600 dark:text-warning-400">Warnings</h3>
              <ul className="space-y-2">
                {detail.warnings.map((w, i) => (
                  <li key={i} className="rounded-lg bg-warning-500/5 px-3 py-2 text-sm text-warning-600 dark:text-warning-400">{w}</li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
