import type { ReactNode } from 'react';
import { Loader2, AlertCircle, RotateCcw } from 'lucide-react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>;
}

export function StatCard({
  label, value, sublabel, icon, accent = 'brand', loading,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  icon?: ReactNode;
  accent?: 'brand' | 'accent' | 'success' | 'warning' | 'error' | 'neutral';
  loading?: boolean;
}) {
  const accentColors: Record<string, string> = {
    brand: 'text-brand-500',
    accent: 'text-accent-500',
    success: 'text-success-500',
    warning: 'text-warning-500',
    error: 'text-error-500',
    neutral: 'text-neutral-400',
  };
  return (
    <div className="stat-card card-hover">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{label}</p>
          {loading ? (
            <div className="mt-2 h-7 w-20 animate-pulse rounded bg-neutral-200 dark:bg-surface-700" />
          ) : (
            <p className="mt-1 text-2xl font-bold text-neutral-900 dark:text-neutral-50">{value}</p>
          )}
          {sublabel && <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{sublabel}</p>}
        </div>
        {icon && <div className={`${accentColors[accent]} flex-shrink-0`}>{icon}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ message, icon }: { message: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="mb-4 text-neutral-300 dark:text-neutral-600">{icon}</div>}
      <p className="text-sm text-neutral-500 dark:text-neutral-400">{message}</p>
    </div>
  );
}

export function LoadingSpinner({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-12">
      <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
      <span className="text-sm text-neutral-500 dark:text-neutral-400">{label}</span>
    </div>
  );
}

export function RetryButton({ onRetry }: { onRetry: () => void }) {
  return (
    <button onClick={onRetry} className="btn-secondary mt-3">
      <RotateCcw className="h-4 w-4" />
      Retry
    </button>
  );
}

export function ErrorState({
  message,
  onRetry,
  retryAvailable = false,
}: {
  message: string;
  onRetry?: () => void;
  retryAvailable?: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-3 rounded-full bg-error-500/10 p-3">
        <AlertCircle className="h-6 w-6 text-error-500" />
      </div>
      <p className="max-w-md text-sm text-error-600 dark:text-error-400">{message}</p>
      {retryAvailable && onRetry && <RetryButton onRetry={onRetry} />}
    </div>
  );
}
