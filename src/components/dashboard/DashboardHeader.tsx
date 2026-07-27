import { RefreshCw, Settings, TrendingUp } from 'lucide-react';
import type { DashboardPeriod } from '../../hooks/useDashboard';
import { useTranslation } from '../../hooks/useTranslation';
import { useLanguage } from '../../hooks/useLanguage';

interface DashboardHeaderProps {
  userName: string;
  orgName: string | null;
  lastUpdated: string | null;
  period: DashboardPeriod;
  onPeriodChange: (p: DashboardPeriod) => void;
  onRefresh: () => void;
  refreshing: boolean;
  onDataSettings: () => void;
}

function getGreeting(hour: number, greetings: { morning: string; afternoon: string; evening: string }): string {
  if (hour < 12) return greetings.morning;
  if (hour < 19) return greetings.afternoon;
  return greetings.evening;
}

function formatRelative(iso: string | null, t: any): string {
  if (!iso) return t.dashboard.justNow;
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t.dashboard.justNow;
  if (mins < 60) return t.dashboard.minutesAgo.replace('{n}', String(mins));
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t.dashboard.hoursAgo.replace('{n}', String(hours));
  const days = Math.floor(hours / 24);
  return t.dashboard.daysAgo.replace('{n}', String(days));
}

export function DashboardHeader({
  userName,
  orgName,
  lastUpdated,
  period,
  onPeriodChange,
  onRefresh,
  refreshing,
  onDataSettings,
}: DashboardHeaderProps) {
  const { t } = useTranslation();
  const d = t.dashboard;
  const hour = new Date().getHours();
  const greeting = getGreeting(hour, {
    morning: d.greetingMorning,
    afternoon: d.greetingAfternoon,
    evening: d.greetingEvening,
  });

  return (
    <div data-testid="dashboard-header" className="card p-5 bg-gradient-to-r from-brand-600/15 to-accent-600/10 border-brand-500/20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-neutral-100">
            {greeting}, {userName}
          </h2>
          <p className="text-sm text-neutral-400 mt-0.5">
            {d.overviewFor}{' '}
            {orgName ? <span className="text-brand-400 font-medium">{orgName}</span> : <span className="text-neutral-500">{d.noOrg}</span>}
          </p>
          <p className="text-xs text-neutral-500 mt-1">
            {d.lastUpdate}: {formatRelative(lastUpdated, t)}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <select
            data-testid="dashboard-period"
            value={period}
            onChange={(e) => onPeriodChange(Number(e.target.value) as DashboardPeriod)}
            className="input text-sm py-1.5"
            aria-label={d.period}
          >
            <option value={7}>{d.last7days}</option>
            <option value={30}>{d.last30days}</option>
            <option value={90}>{d.last90days}</option>
          </select>

          <button
            data-testid="dashboard-refresh"
            onClick={onRefresh}
            disabled={refreshing}
            className="btn-ghost text-sm px-3 py-1.5 flex items-center gap-1.5"
            aria-label={d.refresh}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{refreshing ? d.refreshing : d.refresh}</span>
          </button>

          <button
            onClick={onDataSettings}
            className="btn-ghost text-sm px-3 py-1.5 flex items-center gap-1.5"
            aria-label={d.dataSettings}
          >
            <Settings size={14} />
            <span className="hidden lg:inline">{d.dataSettings}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
