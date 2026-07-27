import { Zap, Plug, MessageSquare, GitBranch, FileText, Target, UserPlus } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';

interface QuickActionsProps {
  onAnalyze: () => void;
  onConnectData: () => void;
  onAskCopilot: () => void;
  onCreateAutomation: () => void;
  onImportFiles: () => void;
  onReviewOpportunities: () => void;
  onInviteTeam: () => void;
}

export function QuickActions({
  onAnalyze,
  onConnectData,
  onAskCopilot,
  onCreateAutomation,
  onImportFiles,
  onReviewOpportunities,
  onInviteTeam,
}: QuickActionsProps) {
  const { t } = useTranslation();
  const d = t.dashboard;

  const actions = [
    { label: d.analyzeCompany, icon: Zap, onClick: onAnalyze, primary: true, testId: 'start-analysis-button' },
    { label: d.connectData, icon: Plug, onClick: onConnectData, primary: false, testId: 'quick-connect-data' },
    { label: d.askCopilot, icon: MessageSquare, onClick: onAskCopilot, primary: false, testId: 'quick-ask-copilot' },
    { label: d.createAutomation, icon: GitBranch, onClick: onCreateAutomation, primary: false, testId: 'quick-create-automation' },
    { label: d.importFiles, icon: FileText, onClick: onImportFiles, primary: false, testId: 'quick-import-files' },
    { label: d.reviewOpportunities, icon: Target, onClick: onReviewOpportunities, primary: false, testId: 'quick-review-opportunities' },
    { label: d.inviteTeam, icon: UserPlus, onClick: onInviteTeam, primary: false, testId: 'quick-invite-team' },
  ];

  return (
    <div data-testid="quick-actions" className="card p-5">
      <h3 className="text-sm font-semibold text-neutral-100 mb-4">{d.quickActions}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.testId}
              data-testid={action.testId}
              onClick={action.onClick}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all hover:scale-[1.02] hover:border-brand-500/30 ${
                action.primary
                  ? 'bg-brand-600/15 border-brand-500/30 text-brand-300 hover:bg-brand-600/20'
                  : 'bg-surface-750 border-surface-600 text-neutral-300 hover:bg-surface-700'
              }`}
            >
              <Icon size={20} />
              <span className="text-xs font-medium text-center">{action.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
