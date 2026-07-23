import { useQuery } from '@tanstack/react-query';
import { Search, Database, Clock, Tag } from 'lucide-react';
import { useApiAdapter } from '../../api/ApiAdapterContext';
import { sanitizeError } from '../../api/sanitizers';
import { useUrlFilters } from '../../hooks/useUrlFilters';
import { Card, LoadingSpinner, EmptyState, ErrorState } from '../../components/ui';
import type { MemoryType, MemorySensitivity, MemoryFilters } from '../../types/dashboard';

const TYPE_OPTIONS: ('ALL' | MemoryType)[] = ['ALL', 'WORKING', 'SESSION', 'ORGANIZATION', 'SEMANTIC', 'EXECUTION'];

interface MemoryUrlFilters {
  search: string;
  type: string;
  [key: string]: string;
}

const sensitivityColors: Record<MemorySensitivity, string> = {
  PUBLIC: 'bg-success-500/10 text-success-600 dark:text-success-400',
  INTERNAL: 'bg-brand-500/10 text-brand-600 dark:text-brand-400',
  CONFIDENTIAL: 'bg-warning-500/10 text-warning-600 dark:text-warning-400',
  RESTRICTED: 'bg-error-500/10 text-error-600 dark:text-error-400',
};

const typeColors: Record<MemoryType, string> = {
  WORKING: 'bg-brand-500/10 text-brand-600 dark:text-brand-400',
  SESSION: 'bg-accent-500/10 text-accent-600 dark:text-accent-400',
  ORGANIZATION: 'bg-neutral-200 text-neutral-700 dark:bg-surface-700 dark:text-neutral-300',
  SEMANTIC: 'bg-warning-500/10 text-warning-600 dark:text-warning-400',
  EXECUTION: 'bg-success-500/10 text-success-600 dark:text-success-400',
};

export function MemoryPage() {
  const adapter = useApiAdapter();
  const { filters, setFilter, clearFilters } = useUrlFilters<MemoryUrlFilters>({
    search: '',
    type: 'ALL',
  });

  const apiFilters: MemoryFilters = {
    search: filters.search || undefined,
    type: filters.type,
  };

  const { data: entries, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['memory-entries', apiFilters],
    queryFn: () => adapter.getMemoryEntries(apiFilters),
    retry: 1,
    staleTime: 8_000,
  });

  const hasActiveFilters = filters.search !== '' || filters.type !== 'ALL';

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">Memory Explorer</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Browse working, session, organization, semantic, and execution memory</p>
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input value={filters.search} onChange={(e) => setFilter('search', e.target.value)} placeholder="Search memory entries..." className="input pl-10" />
          </div>
          <select value={filters.type} onChange={(e) => setFilter('type', e.target.value)} className="input md:w-48">
            {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t === 'ALL' ? 'All Types' : t}</option>)}
          </select>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="btn-ghost text-xs">Clear Filters</button>
          )}
        </div>
      </Card>

      {isLoading ? (
        <LoadingSpinner label="Loading memory entries..." />
      ) : isError ? (
        <ErrorState message={sanitizeError(error).message} onRetry={() => refetch()} retryAvailable />
      ) : !entries || entries.length === 0 ? (
        <EmptyState message="No memory entries found" icon={<Database className="h-10 w-10" />} />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {entries.map((entry) => (
            <Card key={entry.memoryId} className="card-hover p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className={`badge ${typeColors[entry.type]}`}>{entry.type}</span>
                <span className={`badge ${sensitivityColors[entry.sensitivity]}`}>{entry.sensitivity}</span>
              </div>
              <p className="text-sm text-neutral-700 dark:text-neutral-300">{entry.content}</p>
              <div className="mt-3 flex items-center gap-3 text-xs text-neutral-400">
                <span className="font-mono">{entry.memoryId}</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(entry.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1">
                  <p className="text-xs text-neutral-400">Confidence</p>
                  <div className="h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-surface-700">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${entry.confidence}%` }} />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-neutral-400">Relevance</p>
                  <div className="h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-surface-700">
                    <div className="h-full rounded-full bg-accent-500" style={{ width: `${entry.relevance}%` }} />
                  </div>
                </div>
              </div>
              {entry.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {entry.tags.map((tag) => (
                    <span key={tag} className="badge bg-neutral-100 text-neutral-500 dark:bg-surface-700 dark:text-neutral-400">
                      <Tag className="h-2.5 w-2.5" />{tag}
                    </span>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
