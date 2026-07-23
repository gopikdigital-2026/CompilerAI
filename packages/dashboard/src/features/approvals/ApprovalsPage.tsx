import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckSquare, ThumbsUp, ThumbsDown, X, MessageSquare } from 'lucide-react';
import { useApiAdapter } from '../../api/ApiAdapterContext';
import { sanitizeError } from '../../api/sanitizers';
import { useUrlFilters } from '../../hooks/useUrlFilters';
import { Card, LoadingSpinner, EmptyState, ErrorState } from '../../components/ui';
import { ApprovalStatusBadge, RiskBadge } from '../../components/StatusBadges';
import type { ApprovalData, ApprovalFilters } from '../../types/dashboard';

const STATUS_OPTIONS = ['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED', 'EXPIRED'];

interface ApprovalUrlFilters {
  status: string;
  [key: string]: string;
}

export function ApprovalsPage() {
  const queryClient = useQueryClient();
  const adapter = useApiAdapter();
  const { filters, setFilter } = useUrlFilters<ApprovalUrlFilters>({
    status: 'ALL',
  });

  const [selectedApproval, setSelectedApproval] = useState<ApprovalData | null>(null);
  const [comment, setComment] = useState('');
  const [showModal, setShowModal] = useState(false);

  const apiFilters: ApprovalFilters = {
    status: filters.status,
  };

  const { data: approvals, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['approvals', apiFilters],
    queryFn: () => adapter.getApprovals(apiFilters),
    retry: 1,
    staleTime: 8_000,
  });

  const mutation = useMutation({
    mutationFn: ({ approvalId, decision, commentText }: { approvalId: string; decision: 'approve' | 'reject'; commentText: string }) =>
      adapter.decideApproval(approvalId, decision, commentText),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      setShowModal(false);
      setSelectedApproval(null);
      setComment('');
    },
  });

  function openModal(approval: ApprovalData) {
    setSelectedApproval(approval);
    setComment('');
    setShowModal(true);
  }

  function confirmDecision(decision: 'approve' | 'reject') {
    if (selectedApproval) {
      mutation.mutate({ approvalId: selectedApproval.approvalId, decision, commentText: comment });
    }
  }

  const pendingCount = approvals?.filter((a) => a.status === 'PENDING').length ?? 0;
  const mutationError = mutation.isError ? sanitizeError(mutation.error).message : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">Human Review</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{pendingCount} pending approval{pendingCount !== 1 ? 's' : ''}</p>
        </div>
        <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)} className="input w-44">
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s === 'ALL' ? 'All Statuses' : s}</option>)}
        </select>
      </div>

      {mutationError && (
        <div className="rounded-lg border border-error-500/20 bg-error-500/5 px-4 py-2 text-sm text-error-600 dark:text-error-400">
          {mutationError}
        </div>
      )}

      {isLoading ? (
        <LoadingSpinner label="Loading approvals..." />
      ) : isError ? (
        <ErrorState message={sanitizeError(error).message} onRetry={() => refetch()} retryAvailable />
      ) : !approvals || approvals.length === 0 ? (
        <EmptyState message="No approvals found" icon={<CheckSquare className="h-10 w-10" />} />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {approvals.map((approval) => (
            <Card key={approval.approvalId} className="card-hover p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-brand-600 dark:text-brand-400">{approval.approvalId}</span>
                  <ApprovalStatusBadge status={approval.status} />
                </div>
                <RiskBadge level={approval.riskLevel} />
              </div>
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{approval.nodeLabel}</p>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{approval.description}</p>
              <div className="mt-3 flex items-center gap-4 text-xs text-neutral-400">
                <span>Exec: <span className="font-mono text-neutral-500 dark:text-neutral-300">{approval.executionId}</span></span>
                <span>Confidence: {approval.confidenceScore.toFixed(1)}%</span>
                <span>{new Date(approval.createdAt).toLocaleString()}</span>
              </div>
              {approval.comment && (
                <div className="mt-2 flex items-start gap-2 rounded-lg bg-neutral-50 px-3 py-2 dark:bg-surface-800/50">
                  <MessageSquare className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-neutral-400" />
                  <div>
                    <p className="text-xs text-neutral-600 dark:text-neutral-300">{approval.comment}</p>
                    {approval.reviewedBy && <p className="mt-0.5 text-xs text-neutral-400">by {approval.reviewedBy}</p>}
                  </div>
                </div>
              )}
              {approval.status === 'PENDING' && (
                <div className="mt-3 flex gap-2">
                  <button onClick={() => openModal(approval)} className="btn-primary px-3 py-1.5 text-xs">
                    <ThumbsUp className="h-3.5 w-3.5" /> Review
                  </button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {showModal && selectedApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowModal(false)}>
          <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-surface-600 dark:bg-surface-850" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">Confirm Decision</h3>
              <button onClick={() => setShowModal(false)} className="btn-ghost p-1"><X className="h-5 w-5" /></button>
            </div>
            <p className="mb-2 text-sm text-neutral-600 dark:text-neutral-400">Approval: <span className="font-mono text-brand-600 dark:text-brand-400">{selectedApproval.approvalId}</span></p>
            <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">{selectedApproval.description}</p>
            <label className="mb-1 block text-xs font-medium text-neutral-500">Comment</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment for this decision..."
              className="input mb-4 min-h-[80px] resize-y"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={() => confirmDecision('reject')} disabled={mutation.isPending} className="btn-danger">
                <ThumbsDown className="h-4 w-4" /> Reject
              </button>
              <button onClick={() => confirmDecision('approve')} disabled={mutation.isPending} className="btn-primary">
                <ThumbsUp className="h-4 w-4" /> Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
