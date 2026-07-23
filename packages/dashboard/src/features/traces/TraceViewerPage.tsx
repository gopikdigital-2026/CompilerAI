import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Circle, RotateCcw, AlertTriangle, Bookmark, CheckSquare, GitBranch,
} from 'lucide-react';
import { useApiAdapter } from '../../api/ApiAdapterContext';
import { sanitizeError, sanitizeTraceSummary } from '../../api/sanitizers';
import { Card, LoadingSpinner, EmptyState, ErrorState } from '../../components/ui';
import type { TraceEvent } from '../../types/dashboard';

const categoryConfig: Record<TraceEvent['category'], { icon: typeof Circle; color: string; label: string }> = {
  event: { icon: Circle, color: 'text-brand-500', label: 'Event' },
  retry: { icon: RotateCcw, color: 'text-warning-500', label: 'Retry' },
  error: { icon: AlertTriangle, color: 'text-error-500', label: 'Error' },
  checkpoint: { icon: Bookmark, color: 'text-accent-500', label: 'Checkpoint' },
  approval: { icon: CheckSquare, color: 'text-accent-500', label: 'Approval' },
};

export function TraceViewerPage() {
  const { executionId } = useParams<{ executionId: string }>();
  const adapter = useApiAdapter();

  const { data: events, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['trace-events', executionId],
    queryFn: () => adapter.getTraceEvents(executionId!),
    enabled: !!executionId,
    retry: 1,
    staleTime: 8_000,
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link to={`/executions/${executionId}`} className="btn-ghost p-1.5">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">Trace Viewer</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Execution: {executionId}</p>
        </div>
      </div>

      <Card className="p-5">
        {isLoading ? (
          <LoadingSpinner label="Loading trace events..." />
        ) : isError ? (
          <ErrorState message={sanitizeError(error).message} onRetry={() => refetch()} retryAvailable />
        ) : !events || events.length === 0 ? (
          <EmptyState message="No trace events found for this execution" icon={<GitBranch className="h-10 w-10" />} />
        ) : (
          <div className="relative">
            <div className="absolute left-4 top-0 h-full w-px bg-neutral-200 dark:bg-surface-700" />
            <div className="space-y-3">
              {events.map((event) => {
                const cfg = categoryConfig[event.category];
                const EventIcon = cfg.icon;
                return (
                  <div key={event.eventId} className="relative flex gap-4 pl-0">
                    <div className={`z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white dark:bg-surface-850 ${cfg.color}`}>
                      <EventIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 rounded-lg border border-neutral-200 bg-white px-4 py-2.5 dark:border-surface-700 dark:bg-surface-850">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{event.eventType}</span>
                        <span className={`badge bg-neutral-100 text-xs dark:bg-surface-700 ${cfg.color}`}>{cfg.label}</span>
                      </div>
                      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{sanitizeTraceSummary(event.summary)}</p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-neutral-400">
                        <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
                        {event.nodeId && <span className="font-mono">{event.nodeId}</span>}
                        <span className="font-mono">{event.eventId}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

