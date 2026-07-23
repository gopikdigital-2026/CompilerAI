import type { ExecutionStatus, ApprovalStatus, ServiceHealth, RiskLevel } from '../types/dashboard';

const executionStatusConfig: Record<ExecutionStatus, { label: string; className: string; dot: string }> = {
  PENDING: { label: 'Pending', className: 'bg-neutral-100 text-neutral-600 dark:bg-surface-700 dark:text-neutral-300', dot: 'bg-neutral-400' },
  RUNNING: { label: 'Running', className: 'bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300', dot: 'bg-brand-500 animate-pulse' },
  PAUSED: { label: 'Paused', className: 'bg-warning-500/10 text-warning-600 dark:text-warning-400', dot: 'bg-warning-500' },
  AWAITING_APPROVAL: { label: 'Awaiting Approval', className: 'bg-accent-100 text-accent-700 dark:bg-accent-500/20 dark:text-accent-300', dot: 'bg-accent-500' },
  COMPLETED: { label: 'Completed', className: 'bg-success-500/10 text-success-600 dark:text-success-400', dot: 'bg-success-500' },
  FAILED: { label: 'Failed', className: 'bg-error-500/10 text-error-600 dark:text-error-400', dot: 'bg-error-500' },
  CANCELLED: { label: 'Cancelled', className: 'bg-neutral-100 text-neutral-500 dark:bg-surface-700 dark:text-neutral-400', dot: 'bg-neutral-500' },
  TIMED_OUT: { label: 'Timed Out', className: 'bg-error-500/10 text-error-600 dark:text-error-400', dot: 'bg-error-400' },
};

const approvalStatusConfig: Record<ApprovalStatus, { label: string; className: string }> = {
  PENDING: { label: 'Pending', className: 'bg-accent-100 text-accent-700 dark:bg-accent-500/20 dark:text-accent-300' },
  APPROVED: { label: 'Approved', className: 'bg-success-500/10 text-success-600 dark:text-success-400' },
  REJECTED: { label: 'Rejected', className: 'bg-error-500/10 text-error-600 dark:text-error-400' },
  CHANGES_REQUESTED: { label: 'Changes Requested', className: 'bg-warning-500/10 text-warning-600 dark:text-warning-400' },
  EXPIRED: { label: 'Expired', className: 'bg-neutral-100 text-neutral-500 dark:bg-surface-700 dark:text-neutral-400' },
};

const healthConfig: Record<ServiceHealth, { label: string; className: string; dot: string }> = {
  up: { label: 'Up', className: 'bg-success-500/10 text-success-600 dark:text-success-400', dot: 'bg-success-500' },
  degraded: { label: 'Degraded', className: 'bg-warning-500/10 text-warning-600 dark:text-warning-400', dot: 'bg-warning-500' },
  down: { label: 'Down', className: 'bg-error-500/10 text-error-600 dark:text-error-400', dot: 'bg-error-500' },
};

const riskConfig: Record<RiskLevel, { label: string; className: string }> = {
  LOW: { label: 'Low', className: 'bg-success-500/10 text-success-600 dark:text-success-400' },
  MEDIUM: { label: 'Medium', className: 'bg-warning-500/10 text-warning-600 dark:text-warning-400' },
  HIGH: { label: 'High', className: 'bg-error-500/10 text-error-600 dark:text-error-400' },
  CRITICAL: { label: 'Critical', className: 'bg-error-500/10 text-error-600 dark:text-error-400' },
};

export function ExecutionStatusBadge({ status }: { status: ExecutionStatus }) {
  const cfg = executionStatusConfig[status] ?? executionStatusConfig.PENDING;
  return (
    <span className={`badge ${cfg.className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

export function ApprovalStatusBadge({ status }: { status: ApprovalStatus }) {
  const cfg = approvalStatusConfig[status] ?? approvalStatusConfig.PENDING;
  return <span className={`badge ${cfg.className}`}>{cfg.label}</span>;
}

export function HealthBadge({ status }: { status: ServiceHealth }) {
  const cfg = healthConfig[status] ?? healthConfig.up;
  return (
    <span className={`badge ${cfg.className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

export function RiskBadge({ level }: { level: RiskLevel }) {
  const cfg = riskConfig[level] ?? riskConfig.LOW;
  return <span className={`badge ${cfg.className}`}>{cfg.label}</span>;
}
