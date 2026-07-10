import React from 'react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-surface-700 border border-surface-600 flex items-center justify-center mb-4 text-neutral-500">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-neutral-200 mb-1">{title}</h3>
      <p className="text-sm text-neutral-500 max-w-xs mb-5">{description}</p>
      {action}
    </div>
  );
}
