import React from 'react';
import {
  Bot, DollarSign, TrendingUp, AlertTriangle, Lightbulb, Clock,
  ArrowUp, ArrowDown, Minus,
} from 'lucide-react';
import { MOCK_INSIGHTS } from '../../lib/memoryMocks';
import type { InsightType } from '../../types/memory';

const ICON_MAP: Record<string, React.ReactNode> = {
  Bot:           <Bot size={14} />,
  DollarSign:    <DollarSign size={14} />,
  TrendingUp:    <TrendingUp size={14} />,
  AlertTriangle: <AlertTriangle size={14} />,
  Lightbulb:     <Lightbulb size={14} />,
  Clock:         <Clock size={14} />,
};

const TYPE_CONFIG: Record<InsightType, { border: string; bg: string; iconColor: string; metricColor: string }> = {
  performance: { border: 'border-brand-500/25',   bg: 'bg-brand-500/5',   iconColor: 'text-brand-400',   metricColor: 'text-brand-300' },
  cost:        { border: 'border-success-500/25', bg: 'bg-success-500/5', iconColor: 'text-success-400', metricColor: 'text-success-300' },
  pattern:     { border: 'border-warning-500/25', bg: 'bg-warning-500/5', iconColor: 'text-warning-400', metricColor: 'text-warning-300' },
  warning:     { border: 'border-error-500/25',   bg: 'bg-error-500/5',   iconColor: 'text-error-400',   metricColor: 'text-error-300' },
  discovery:   { border: 'border-sky-500/25',     bg: 'bg-sky-500/5',     iconColor: 'text-sky-400',     metricColor: 'text-sky-300' },
};

const TREND_ICONS: Record<string, React.ReactNode> = {
  up:      <ArrowUp size={10} />,
  down:    <ArrowDown size={10} />,
  neutral: <Minus size={10} />,
};

export function MemoryInsights() {
  return (
    <div className="flex gap-3 overflow-x-auto px-4 py-3 flex-shrink-0">
      {MOCK_INSIGHTS.map((insight, i) => {
        const cfg = TYPE_CONFIG[insight.type];
        return (
          <div
            key={insight.id}
            title={insight.detail}
            className={`flex-shrink-0 rounded-xl border ${cfg.border} ${cfg.bg} px-3.5 py-2.5 min-w-[180px] max-w-[220px] cursor-default hover:brightness-110 transition-all group`}
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className={cfg.iconColor}>{ICON_MAP[insight.icon]}</span>
              <p className="text-xs text-neutral-400 flex-1 leading-tight">{insight.title}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <p className={`text-base font-bold ${cfg.metricColor}`}>{insight.metric}</p>
              <span className={`${cfg.iconColor} opacity-70`}>{TREND_ICONS[insight.trend]}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
