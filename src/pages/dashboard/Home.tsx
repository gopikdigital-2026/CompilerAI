import { TrendingUp, TrendingDown, Bot, GitBranch, Activity, Zap, ArrowRight } from 'lucide-react';
import { Sparkline } from '../../components/ui/Sparkline';
import { BarChart } from '../../components/ui/BarChart';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { MOCK_AGENTS, MOCK_WORKFLOWS } from '../../lib/mockData';
import { useTranslation } from '../../hooks/useTranslation';
import { useLanguage } from '../../contexts/LanguageContext';
import { useProfile } from '../../hooks/useProfile';
import { useOrganization } from '../../hooks/useOrganization';
import { useAuth } from '../../hooks/useAuth';

export function HomeDashboard() {
  const { t } = useTranslation();
  const { lang } = useLanguage();
  const h = t.home;
  const { user } = useAuth();
  const { profile } = useProfile();
  const { activeOrg } = useOrganization();

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'there';

  const STAT_CARDS = [
    { label: h.statAgents,    value: '12',    change: '+2',    trend: 'up' as const, icon: <Bot size={18} />,      sparkData: [4,6,5,8,7,9,11,10,12,12], color: '#0072e6' },
    { label: h.statRuns,      value: '3,847', change: '+18%', trend: 'up' as const, icon: <Zap size={18} />,      sparkData: [120,200,180,300,250,400,350,420,380,450], color: '#00e6b4' },
    { label: h.statWorkflows, value: '5',     change: '+1',   trend: 'up' as const, icon: <GitBranch size={18} />, sparkData: [2,3,3,4,4,5,5,5,5,5], color: '#0072e6' },
    { label: h.statSuccess,   value: '99.2%', change: '-0.1%', trend: 'down' as const, icon: <Activity size={18} />, sparkData: [98,99,99,100,99,98,99,100,99,99], color: '#22c55e' },
  ];

  const BAR_DATA = h.chartDays.map((label, i) => ({
    label,
    value: [340, 480, 390, 620, 510, 280, 195][i],
  }));

  const welcomeTitle = lang === 'es'
    ? `Buenos días, ${displayName}`
    : `Good morning, ${displayName}`;

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Welcome banner */}
      <div className="card p-5 bg-gradient-to-r from-brand-600/15 to-accent-600/10 border-brand-500/20">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-neutral-100">{welcomeTitle}</h2>
            <p className="text-sm text-neutral-400 mt-0.5">
              {activeOrg ? (
                <span className="text-brand-400 font-medium">{activeOrg.name}</span>
              ) : null}
              {activeOrg ? ' · ' : ''}
              {h.welcomeSubtitle}
            </p>
          </div>
          <button className="btn-primary text-sm hidden sm:flex">
            {h.viewAlerts} <ArrowRight size={15} />
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map((card) => (
          <div key={card.label} className="card-hover p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-surface-700 border border-surface-600 flex items-center justify-center text-neutral-400">
                {card.icon}
              </div>
              <Sparkline data={card.sparkData} color={card.color} height={32} />
            </div>
            <p className="text-2xl font-bold text-neutral-100">{card.value}</p>
            <p className="text-xs text-neutral-500 mt-0.5">{card.label}</p>
            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${card.trend === 'up' ? 'text-success-400' : 'text-error-400'}`}>
              {card.trend === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {card.change} {h.vsYesterday}
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Executions chart */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-neutral-100">{h.chartTitle}</h3>
              <p className="text-xs text-neutral-500 mt-0.5">{h.chartSubtitle}</p>
            </div>
            <span className="badge-accent text-xs">+12% WoW</span>
          </div>
          <BarChart data={BAR_DATA} color="#0072e6" height={130} />
        </div>

        {/* Quick stats */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-neutral-100 mb-4">{h.systemTitle}</h3>
          <div className="space-y-4">
            {h.systemLabels.map((label, i) => {
              const values = [42, 68, 85, 31];
              const colors = ['bg-brand-500', 'bg-accent-500', 'bg-warning-500', 'bg-success-500'];
              return (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-neutral-400">{label}</span>
                    <span className="text-xs font-medium text-neutral-200">{values[i]}%</span>
                  </div>
                  <div className="h-1.5 bg-surface-700 rounded-full overflow-hidden">
                    <div className={`h-full ${colors[i]} rounded-full transition-all duration-500`} style={{ width: `${values[i]}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Recent agents */}
        <div className="card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-700">
            <h3 className="text-sm font-semibold text-neutral-100">{h.recentAgents}</h3>
            <button className="text-xs text-brand-400 hover:text-brand-300 transition-colors">{t.common.viewAll}</button>
          </div>
          <div className="divide-y divide-surface-700">
            {MOCK_AGENTS.slice(0, 4).map((agent) => (
              <div key={agent.id} className="flex items-center justify-between px-5 py-3 hover:bg-surface-750 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-surface-700 border border-surface-600 flex items-center justify-center flex-shrink-0">
                    <Bot size={14} className="text-neutral-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-200 truncate">{agent.name}</p>
                    <p className="text-xs text-neutral-500">{agent.lastRun}</p>
                  </div>
                </div>
                <StatusBadge status={agent.status} pulse />
              </div>
            ))}
          </div>
        </div>

        {/* Recent workflows */}
        <div className="card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-700">
            <h3 className="text-sm font-semibold text-neutral-100">{h.activeWorkflows}</h3>
            <button className="text-xs text-brand-400 hover:text-brand-300 transition-colors">{t.common.viewAll}</button>
          </div>
          <div className="divide-y divide-surface-700">
            {MOCK_WORKFLOWS.slice(0, 4).map((wf) => (
              <div key={wf.id} className="flex items-center justify-between px-5 py-3 hover:bg-surface-750 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-surface-700 border border-surface-600 flex items-center justify-center flex-shrink-0">
                    <GitBranch size={14} className="text-neutral-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-200 truncate">{wf.name}</p>
                    <p className="text-xs text-neutral-500">{wf.steps} {h.steps} · {wf.lastRun}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-success-400">{wf.successRate}%</span>
                  <StatusBadge status={wf.status} pulse />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
