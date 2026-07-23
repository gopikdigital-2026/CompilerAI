import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Workflow, ChevronDown, ChevronRight } from 'lucide-react';
import { useApiAdapter } from '../../api/ApiAdapterContext';
import { sanitizeError } from '../../api/sanitizers';
import { Card, LoadingSpinner, ErrorState } from '../../components/ui';

export function WorkflowsPage() {
  const adapter = useApiAdapter();
  const [expandedNode, setExpandedNode] = useState<string | null>(null);

  const { data: dag, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['workflow-dag'],
    queryFn: () => adapter.getWorkflowDag('wf_demo_001'),
    retry: 1,
    staleTime: 8_000,
  });

  if (isLoading) return <LoadingSpinner label="Loading workflow..." />;
  if (isError) {
    return <ErrorState message={sanitizeError(error).message} onRetry={() => refetch()} retryAvailable />;
  }

  const nodeStatusColors: Record<string, string> = {
    completed: 'border-success-500 bg-success-500/10',
    running: 'border-brand-500 bg-brand-500/10',
    failed: 'border-error-500 bg-error-500/10',
    pending: 'border-neutral-300 bg-neutral-100 dark:border-surface-600 dark:bg-surface-800',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">Workflow Explorer</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Visualize workflow DAG and node details</p>
      </div>

      {dag && (
        <>
          <Card className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Workflow className="h-5 w-5 text-brand-500" />
                <span className="font-semibold text-neutral-900 dark:text-neutral-50">{dag.name}</span>
              </div>
              <span className="badge bg-brand-500/10 text-brand-600 dark:text-brand-400">{dag.mode}</span>
              <span className="text-sm text-neutral-500 dark:text-neutral-400">v{dag.version}</span>
              <span className="text-sm text-neutral-500 dark:text-neutral-400">{dag.nodes.length} nodes</span>
            </div>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{dag.description}</p>
          </Card>

          <Card className="p-5">
            <h3 className="mb-4 text-sm font-semibold text-neutral-700 dark:text-neutral-300">DAG Visualization</h3>
            <div className="space-y-2">
              {dag.nodes.map((node) => (
                <div key={node.nodeId}>
                  <button
                    onClick={() => setExpandedNode(expandedNode === node.nodeId ? null : node.nodeId)}
                    className={`w-full rounded-lg border-l-4 px-4 py-3 text-left transition-all ${nodeStatusColors[node.status] ?? nodeStatusColors.pending}`}
                  >
                    <div className="flex items-center gap-3">
                      {expandedNode === node.nodeId ? <ChevronDown className="h-4 w-4 text-neutral-400" /> : <ChevronRight className="h-4 w-4 text-neutral-400" />}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{node.label}</span>
                          {node.requiresApproval && <span className="badge bg-accent-500/10 text-accent-600 dark:text-accent-400">Approval</span>}
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-xs text-neutral-400">
                          <span className="font-mono">{node.nodeId}</span>
                          <span>{node.type}</span>
                          {node.durationMs && <span>{node.durationMs}ms</span>}
                        </div>
                      </div>
                      <span className="text-xs uppercase text-neutral-500">{node.status}</span>
                    </div>
                  </button>
                  {expandedNode === node.nodeId && (
                    <div className="ml-8 mt-1 rounded-lg bg-neutral-50 p-4 dark:bg-surface-800/50">
                      <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                        <div>
                          <p className="text-xs uppercase text-neutral-400">Type</p>
                          <p className="text-neutral-700 dark:text-neutral-300">{node.type}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase text-neutral-400">Order</p>
                          <p className="text-neutral-700 dark:text-neutral-300">{node.order}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase text-neutral-400">Duration</p>
                          <p className="text-neutral-700 dark:text-neutral-300">{node.durationMs ? `${node.durationMs}ms` : '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase text-neutral-400">Approval Required</p>
                          <p className="text-neutral-700 dark:text-neutral-300">{node.requiresApproval ? 'Yes' : 'No'}</p>
                        </div>
                        <div className="col-span-2 md:col-span-4">
                          <p className="text-xs uppercase text-neutral-400">Dependencies</p>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {node.dependsOn.length > 0 ? node.dependsOn.map((dep) => (
                              <span key={dep} className="badge bg-brand-500/10 text-brand-600 dark:text-brand-400 font-mono">{dep}</span>
                            )) : <span className="text-neutral-400 text-xs">None (entry node)</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {dag.edges.length > 0 && (
              <div className="mt-6 border-t border-neutral-200 pt-4 dark:border-surface-700">
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">Edges</h4>
                <div className="space-y-1">
                  {dag.edges.map((edge, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
                      <span className="font-mono text-brand-600 dark:text-brand-400">{edge.sourceNodeId}</span>
                      <span>→</span>
                      <span className="font-mono text-accent-600 dark:text-accent-400">{edge.targetNodeId}</span>
                      {edge.condition && <span className="text-neutral-400">({edge.condition})</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
