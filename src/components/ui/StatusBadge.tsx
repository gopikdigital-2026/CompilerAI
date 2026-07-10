import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';

type StatusType = 'active' | 'idle' | 'error' | 'training' | 'paused' | 'draft' | 'connected' | 'disconnected';

const dotColors: Record<StatusType, string> = {
  active:       'bg-success-400',
  idle:         'bg-neutral-400',
  error:        'bg-error-400',
  training:     'bg-warning-400',
  paused:       'bg-warning-400',
  draft:        'bg-neutral-500',
  connected:    'bg-success-400',
  disconnected: 'bg-neutral-500',
};

const textColors: Record<StatusType, string> = {
  active:       'text-success-400',
  idle:         'text-neutral-400',
  error:        'text-error-400',
  training:     'text-warning-400',
  paused:       'text-warning-400',
  draft:        'text-neutral-400',
  connected:    'text-success-400',
  disconnected: 'text-neutral-400',
};

interface StatusBadgeProps {
  status: StatusType;
  pulse?: boolean;
}

export function StatusBadge({ status, pulse = false }: StatusBadgeProps) {
  const { t } = useTranslation();
  const label = t.status[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${textColors[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColors[status]} ${pulse && status === 'active' ? 'animate-pulse' : ''}`} />
      {label}
    </span>
  );
}
