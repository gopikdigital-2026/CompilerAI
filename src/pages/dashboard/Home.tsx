import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, Plus, Building2 } from 'lucide-react';
import { useDashboard, type DashboardPeriod } from '../../hooks/useDashboard';
import { useProfile } from '../../hooks/useProfile';
import { useOrganization } from '../../hooks/useOrganization';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../hooks/useTranslation';
import { useLanguage } from '../../hooks/useLanguage';
import { track } from '../../lib/telemetry';
import { DashboardHeader } from '../../components/dashboard/DashboardHeader';
import { ExecutiveSummary } from '../../components/dashboard/ExecutiveSummary';
import { NextBestAction } from '../../components/dashboard/NextBestAction';
import { KpiGrid } from '../../components/dashboard/KpiGrid';
import { OpportunitiesSection } from '../../components/dashboard/OpportunitiesSection';
import { AlertsSection } from '../../components/dashboard/AlertsSection';
import { AutomationsSection } from '../../components/dashboard/AutomationsSection';
import { ActivitySection } from '../../components/dashboard/ActivitySection';
import { ConnectorsSection } from '../../components/dashboard/ConnectorsSection';
import { QuickActions } from '../../components/dashboard/QuickActions';
import { RunsChart } from '../../components/dashboard/RunsChart';

interface HomeDashboardProps { onNavigate?: (page: string) => void }

export function HomeDashboard({ onNavigate }: HomeDashboardProps = {}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { activeOrg } = useOrganization();
  const [period, setPeriod] = useState<DashboardPeriod>(30);

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'there';
  const orgName = activeOrg?.name ?? null;

  const dashboard = useDashboard(period);

  useEffect(() => {
    track('dashboard_viewed', { has_org: !!activeOrg, period });
  }, [activeOrg, period]);

  useEffect(() => {
    if (dashboard.isEmpty) {
      track('dashboard_empty_state_viewed', { org_id: activeOrg?.id });
    }
  }, [dashboard.isEmpty, activeOrg?.id]);

  const handleRefresh = () => dashboard.refresh();
  const handlePeriodChange = (p: DashboardPeriod) => {
    setPeriod(p);
    dashboard.changePeriod(p);
  };

  const goToAnalysis = () => {
    track('business_analysis_started', { org_id: activeOrg?.id });
    onNavigate?.('analysis');
  };
  const handleConnectData = () => {
    track('data_source_connect_started', { org_id: activeOrg?.id });
  };
  const handleQuickAction = (action: string) => {
    track('quick_action_clicked', { action });
  };
  const handleOpportunityView = (id: string) => track('opportunity_opened', { id });
  const handleOpportunityApprove = (id: string) => track('opportunity_approved', { id });
  const handleOpportunityDiscard = (id: string) => track('opportunity_discarded', { id });
  const handleAlertOpen = (id: string) => track('alert_opened', { id });
  const handleAutomationOpen = (id: string) => track('automation_opened', { id });
  const handleNextBestActionReview = () => track('next_best_action_opened', {});

  // Loading state
  if (dashboard.loading) {
    return (
      <div data-testid="dashboard" className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={24} className="animate-spin text-brand-400" />
          <p className="text-sm text-neutral-500">{t.dashboard.loadingDashboard}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (dashboard.error) {
    return (
      <div data-testid="dashboard" className="p-6">
        <div className="card p-8 flex flex-col items-center justify-center text-center min-h-[300px]">
          <AlertCircle size={32} className="text-error-400 mb-3" />
          <p className="text-sm font-medium text-neutral-200 mb-1">{t.dashboard.errorDashboard}</p>
          <p className="text-xs text-neutral-500 mb-4">{dashboard.error}</p>
          <button onClick={handleRefresh} className="btn-primary text-sm">
            {t.dashboard.retry}
          </button>
        </div>
      </div>
    );
  }

  // No organization state
  if (!activeOrg) {
    return (
      <div data-testid="dashboard" className="p-6">
        <div className="card p-8 flex flex-col items-center justify-center text-center min-h-[300px]">
          <Building2 size={32} className="text-neutral-400 mb-3" />
          <p className="text-sm font-medium text-neutral-200 mb-1">{t.dashboard.noOrg}</p>
          <p className="text-xs text-neutral-500 mb-4">{t.dashboard.noOrgDesc}</p>
          <button onClick={() => window.location.hash = '#settings/organization'} className="btn-primary text-sm flex items-center gap-1.5">
            <Plus size={14} /> {t.settings.sections.organization}
          </button>
        </div>
      </div>
    );
  }

  // First visit / empty state
  if (dashboard.isEmpty) {
    return (
      <div data-testid="dashboard" className="p-6 space-y-6 animate-fade-in">
        <DashboardHeader
          userName={displayName}
          orgName={orgName}
          lastUpdated={dashboard.lastUpdated}
          period={period}
          onPeriodChange={handlePeriodChange}
          onRefresh={handleRefresh}
          refreshing={dashboard.loading}
          onDataSettings={() => window.location.hash = '#settings/integrations'}
        />

        {/* Welcome banner for new users */}
        <div className="card p-8 flex flex-col items-center justify-center text-center min-h-[300px] border-accent-500/20 bg-gradient-to-r from-accent-600/10 to-brand-600/5">
          <h3 className="text-lg font-semibold text-neutral-100 mb-2">{t.dashboard.welcomeNew}</h3>
          <p className="text-sm text-neutral-400 mb-6">{t.dashboard.welcomeNewDesc}</p>
          <button
            data-testid="start-analysis-button"
            onClick={() => { goToAnalysis(); }}
            className="btn-primary text-sm flex items-center gap-2"
          >
            {t.dashboard.connectFirst}
          </button>
        </div>

        <QuickActions
          onAnalyze={() => { goToAnalysis(); handleQuickAction('analyze'); }}
          onConnectData={() => { handleConnectData(); handleQuickAction('connect_data'); window.location.hash = '#settings/integrations'; }}
          onAskCopilot={() => handleQuickAction('ask_copilot')}
          onCreateAutomation={() => { handleQuickAction('create_automation'); onNavigate?.('designer'); }}
          onImportFiles={() => handleQuickAction('import_files')}
          onReviewOpportunities={() => handleQuickAction('review_opportunities')}
          onInviteTeam={() => { handleQuickAction('invite_team'); window.location.hash = '#settings/team'; }}
        />
      </div>
    );
  }

  // Full dashboard with data
  return (
    <div data-testid="dashboard" className="p-6 space-y-6 animate-fade-in">
      {/* 1. Header */}
      <DashboardHeader
        userName={displayName}
        orgName={orgName}
        lastUpdated={dashboard.lastUpdated}
        period={period}
        onPeriodChange={handlePeriodChange}
        onRefresh={handleRefresh}
        refreshing={dashboard.loading}
        onDataSettings={() => window.location.hash = '#settings/integrations'}
      />

      {/* 2. Alerts (critical first, no scroll needed) */}
      {dashboard.alerts.some((a) => a.severity === 'critical') && (
        <AlertsSection alerts={dashboard.alerts.filter((a) => a.severity === 'critical')} onOpen={handleAlertOpen} />
      )}

      {/* 3. Next best action */}
      <NextBestAction
        action={dashboard.nextBestAction}
        onReview={handleNextBestActionReview}
        onExecute={() => handleQuickAction('create_automation')}
      />

      {/* 4. Executive summary */}
      <ExecutiveSummary summary={dashboard.executiveSummary} isEmpty={dashboard.isEmpty} />

      {/* 5. KPIs */}
      <KpiGrid kpis={dashboard.kpis} />

      {/* 6. Runs chart + Opportunities */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <RunsChart data={dashboard.weeklyRuns} />
        </div>
        <OpportunitiesSection
          opportunities={dashboard.opportunities}
          onView={handleOpportunityView}
          onApprove={handleOpportunityApprove}
          onDiscard={handleOpportunityDiscard}
        />
      </div>

      {/* 7. Non-critical alerts + Automations */}
      <div className="grid lg:grid-cols-2 gap-4">
        <AlertsSection
          alerts={dashboard.alerts.filter((a) => a.severity !== 'critical')}
          onOpen={handleAlertOpen}
        />
        <AutomationsSection
          automations={dashboard.automations}
          onOpen={handleAutomationOpen}
          onToggle={handleAutomationOpen}
          onOpenStudio={() => handleQuickAction('open_studio')}
        />
      </div>

      {/* 8. Quick actions */}
      <QuickActions
        onAnalyze={() => { goToAnalysis(); handleQuickAction('analyze'); }}
        onConnectData={() => { handleConnectData(); handleQuickAction('connect_data'); window.location.hash = '#settings/integrations'; }}
        onAskCopilot={() => handleQuickAction('ask_copilot')}
        onCreateAutomation={() => handleQuickAction('create_automation')}
        onImportFiles={() => handleQuickAction('import_files')}
        onReviewOpportunities={() => handleQuickAction('review_opportunities')}
        onInviteTeam={() => { handleQuickAction('invite_team'); window.location.hash = '#settings/team'; }}
      />

      {/* 9. Activity + Connectors */}
      <div className="grid lg:grid-cols-2 gap-4">
        <ActivitySection activity={dashboard.activity} />
        <ConnectorsSection
          connectors={dashboard.connectors}
          onConnect={() => { handleConnectData(); window.location.hash = '#settings/integrations'; }}
        />
      </div>
    </div>
  );
}
