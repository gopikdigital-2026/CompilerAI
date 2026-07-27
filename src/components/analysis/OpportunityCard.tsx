import { useState } from 'react';
import {
  CheckCircle, XCircle, MessageSquare, GitBranch, Eye,
  TrendingUp, Clock, ShieldAlert, AlertTriangle, DollarSign,
  Link2, FileText, BarChart3, ChevronDown, ChevronUp,
} from 'lucide-react';
import type { AnalysisOpportunity } from '../../types/analysis';
import { OPPORTUNITY_STATUS_INFO } from '../../lib/prioritizationEngine';
import { EvidencePanel } from './EvidencePanel';

interface OpportunityCardProps {
  opp: AnalysisOpportunity;
  onApprove: (id: string) => void;
  onDiscard: (id: string) => void;
  onSendToCopilot: (id: string) => void;
  onCreateAutomation: (id: string) => void;
  onViewDetail: (opp: AnalysisOpportunity) => void;
}

const priorityColors: Record<string, string> = {
  critical: 'bg-error-500/15 text-error-400 border-error-500/20',
  high: 'bg-warning-500/15 text-warning-400 border-warning-500/20',
  medium: 'bg-brand-500/15 text-brand-400 border-brand-500/20',
  low: 'bg-neutral-500/15 text-neutral-400 border-neutral-500/20',
};

const priorityLabels: Record<string, string> = {
  critical: 'Crítica',
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
};

const riskColors: Record<string, string> = {
  high: 'text-error-400',
  medium: 'text-warning-400',
  low: 'text-success-400',
};

type TabId = 'overview' | 'evidence' | 'priority';

export function OpportunityCard({
  opp, onApprove, onDiscard, onSendToCopilot, onCreateAutomation, onViewDetail,
}: OpportunityCardProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [priorityExpanded, setPriorityExpanded] = useState(false);
  const statusInfo = OPPORTUNITY_STATUS_INFO[opp.status];
  const canAct = opp.status === 'new' || opp.status === 'reviewed';

  const tabs: { id: TabId; label: string; icon: typeof FileText }[] = [
    { id: 'overview', label: 'Resumen', icon: FileText },
    { id: 'evidence', label: 'Evidencias', icon: BarChart3 },
    { id: 'priority', label: 'Prioridad', icon: TrendingUp },
  ];

  return (
    <div data-testid="opportunity-card" className="card p-4 hover:border-surface-600 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-neutral-200">{opp.title}</p>
            <span className={`text-[10px] px-2 py-0.5 rounded border flex-shrink-0 ${priorityColors[opp.priority] ?? priorityColors.medium}`}>
              {priorityLabels[opp.priority] ?? opp.priority}
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">{opp.description}</p>
        </div>
        <span className={`text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 ${statusInfo?.color ?? 'bg-surface-700 text-neutral-400'}`}>
          {statusInfo?.label ?? opp.status}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-3 border-b border-surface-700">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              data-testid={`opp-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1 px-2 py-1.5 text-xs border-b-2 transition-colors ${
                isActive
                  ? 'border-brand-500 text-brand-400'
                  : 'border-transparent text-neutral-500 hover:text-neutral-300'
              }`}
            >
              <Icon size={12} /> {tab.label}
              {tab.id === 'evidence' && opp.evidence.length > 0 && (
                <span className="text-[9px] px-1 rounded bg-surface-700 text-neutral-500">{opp.evidence.length}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div data-testid="opp-overview" className="space-y-2">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <DollarSign size={11} className="text-success-400 flex-shrink-0" />
              <div>
                <span className="text-neutral-600">Impacto económico</span>
                <p className="text-neutral-300">{opp.economicImpact}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <TrendingUp size={11} className="text-brand-400 flex-shrink-0" />
              <div>
                <span className="text-neutral-600">Impacto operativo</span>
                <p className="text-neutral-300">{opp.operationalImpact}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldAlert size={11} className={riskColors[opp.risk]} />
              <div>
                <span className="text-neutral-600">Riesgo</span>
                <p className={`capitalize ${riskColors[opp.risk]}`}>{opp.risk}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock size={11} className="text-accent-400 flex-shrink-0" />
              <div>
                <span className="text-neutral-600">Tiempo de implantación</span>
                <p className="text-neutral-300">{opp.implementationTime}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <TrendingUp size={11} className="text-brand-400 flex-shrink-0" />
              <div>
                <span className="text-neutral-600">ROI esperado</span>
                <p className="text-neutral-300">{opp.estimated_roi}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <AlertTriangle size={11} className="text-neutral-500 flex-shrink-0" />
              <div>
                <span className="text-neutral-600">Confianza</span>
                <p className="text-neutral-300">{opp.confidence}%</p>
              </div>
            </div>
          </div>

          {opp.dependencies.length > 0 && (
            <div className="flex items-center gap-1.5 pt-2 border-t border-surface-700">
              <Link2 size={11} className="text-neutral-500" />
              <span className="text-xs text-neutral-600">Dependencias:</span>
              {opp.dependencies.map((dep, i) => (
                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-surface-700 text-neutral-500 font-mono">{dep}</span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-700 text-neutral-500 font-mono">{opp.source}</span>
          </div>
        </div>
      )}

      {activeTab === 'evidence' && (
        <EvidencePanel evidence={opp.evidence} source={opp.source} />
      )}

      {activeTab === 'priority' && (
        <div data-testid="opp-priority-explanation" className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-neutral-600">Prioridad calculada</span>
              <p className={`text-sm font-bold ${priorityColors[opp.priority]?.replace('bg-', 'text-').replace('/15', '').replace(' border-', ' ')}`}>
                {priorityLabels[opp.priority]}
              </p>
            </div>
            <span className="text-xs text-neutral-500">Score: {opp.confidence}/100</span>
          </div>

          <button
            onClick={() => setPriorityExpanded(!priorityExpanded)}
            className="w-full flex items-center justify-between text-xs text-neutral-400 hover:text-neutral-300 py-1"
          >
            <span>Ver explicación del algoritmo</span>
            {priorityExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          {priorityExpanded && (
            <div className="p-3 rounded-lg bg-surface-800 border border-surface-700 animate-fade-in">
              <p className="text-xs text-neutral-400 leading-relaxed">{opp.priorityExplanation}</p>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap pt-3 mt-3 border-t border-surface-700">
        <button
          data-testid="approve-opportunity"
          onClick={() => onApprove(opp.id)}
          disabled={!canAct}
          className="text-xs text-success-400 hover:text-success-300 disabled:text-neutral-600 disabled:cursor-not-allowed flex items-center gap-1"
        >
          <CheckCircle size={12} /> Aprobar
        </button>
        <button
          data-testid="reject-opportunity"
          onClick={() => onDiscard(opp.id)}
          disabled={!canAct}
          className="text-xs text-neutral-500 hover:text-neutral-400 disabled:text-neutral-600 disabled:cursor-not-allowed flex items-center gap-1"
        >
          <XCircle size={12} /> Descartar
        </button>
        <button
          data-testid="send-to-copilot"
          onClick={() => onSendToCopilot(opp.id)}
          className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1"
        >
          <MessageSquare size={12} /> Copilot
        </button>
        <button
          data-testid="create-automation"
          onClick={() => onCreateAutomation(opp.id)}
          className="text-xs text-accent-400 hover:text-accent-300 flex items-center gap-1"
        >
          <GitBranch size={12} /> Automatizar
        </button>
        <button
          onClick={() => onViewDetail(opp)}
          className="text-xs text-neutral-500 hover:text-neutral-400 flex items-center gap-1"
        >
          <Eye size={12} /> Detalle
        </button>
      </div>
    </div>
  );
}
