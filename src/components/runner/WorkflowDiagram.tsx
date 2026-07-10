import React from 'react';
import {
  CheckCircle2, XCircle, Loader2, Circle, Clock, ChevronRight, Bot,
} from 'lucide-react';
import type { ExecutionStep, StepStatus } from '../../types/execution';
import type { BlueprintWorkflowStep, BlueprintAgent } from '../../types/blueprint';

interface WorkflowDiagramProps {
  steps: BlueprintWorkflowStep[];
  execSteps: ExecutionStep[];
  agents: BlueprintAgent[];
  activeStepIndex: number;
  runStatus: string;
}

const STATUS_CONFIG: Record<StepStatus, {
  border: string;
  bg: string;
  text: string;
  connectorColor: string;
  icon: React.ReactNode;
}> = {
  pending: {
    border: 'border-surface-600',
    bg: 'bg-surface-800',
    text: 'text-neutral-500',
    connectorColor: 'bg-surface-600',
    icon: <Circle size={14} className="text-neutral-600" />,
  },
  preparing: {
    border: 'border-warning-500/40',
    bg: 'bg-warning-500/5',
    text: 'text-warning-300',
    connectorColor: 'bg-warning-500/30',
    icon: <Loader2 size={14} className="text-warning-400 animate-spin" />,
  },
  executing: {
    border: 'border-brand-500/60',
    bg: 'bg-brand-500/8',
    text: 'text-brand-300',
    connectorColor: 'bg-brand-500/40',
    icon: <Loader2 size={14} className="text-brand-400 animate-spin" />,
  },
  complete: {
    border: 'border-success-500/40',
    bg: 'bg-success-500/5',
    text: 'text-success-300',
    connectorColor: 'bg-success-500/40',
    icon: <CheckCircle2 size={14} className="text-success-400" />,
  },
  error: {
    border: 'border-error-500/50',
    bg: 'bg-error-500/8',
    text: 'text-error-300',
    connectorColor: 'bg-error-500/30',
    icon: <XCircle size={14} className="text-error-400" />,
  },
};

function formatDuration(ms?: number) {
  if (!ms) return '';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function WorkflowDiagram({ steps, execSteps, agents, activeStepIndex, runStatus }: WorkflowDiagramProps) {
  return (
    <div className="space-y-0 py-4 px-2">
      {steps.map((wfStep, i) => {
        const execStep = execSteps[i];
        const status: StepStatus = execStep?.status ?? 'pending';
        const cfg = STATUS_CONFIG[status];
        const agent = agents.find((a) => a.id === wfStep.agentId);
        const isActive = i === activeStepIndex && runStatus === 'running';
        const isLast = i === steps.length - 1;

        return (
          <div key={i} className="flex gap-3">
            {/* Vertical connector + step number */}
            <div className="flex flex-col items-center flex-shrink-0 w-8">
              <div className={`
                relative w-8 h-8 rounded-full flex items-center justify-center border-2 flex-shrink-0 transition-all duration-500
                ${cfg.border} ${cfg.bg}
                ${isActive ? 'shadow-[0_0_12px_rgba(99,102,241,0.4)]' : ''}
              `}>
                <span className={`text-xs font-bold ${status === 'pending' ? 'text-neutral-600' : cfg.text}`}>
                  {status === 'pending' ? i + 1 : cfg.icon}
                </span>
                {isActive && (
                  <span className="absolute -inset-1.5 rounded-full border border-brand-400/30 animate-ping" />
                )}
              </div>
              {!isLast && (
                <div className={`w-0.5 flex-1 min-h-[20px] transition-colors duration-500 ${cfg.connectorColor}`} />
              )}
            </div>

            {/* Step card */}
            <div className={`
              flex-1 mb-3 rounded-xl border p-3 transition-all duration-500
              ${cfg.border} ${cfg.bg}
              ${isActive ? 'shadow-card' : ''}
            `}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`text-sm font-semibold transition-colors duration-300 ${status === 'pending' ? 'text-neutral-500' : 'text-neutral-100'}`}>
                      {wfStep.name}
                    </p>
                    {agent && (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-surface-700/80 border border-surface-600 text-neutral-400 px-1.5 py-0.5 rounded-full">
                        <Bot size={9} />{agent.name}
                      </span>
                    )}
                  </div>
                  <p className={`text-xs mt-0.5 leading-relaxed ${status === 'pending' ? 'text-neutral-700' : 'text-neutral-500'}`}>
                    {wfStep.description}
                  </p>

                  {/* Input → Output when complete */}
                  {(status === 'complete' || status === 'executing') && (
                    <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-neutral-600">
                      <span className="truncate max-w-[120px]">{wfStep.input}</span>
                      <ChevronRight size={10} className="flex-shrink-0" />
                      <span className="truncate max-w-[120px]">{wfStep.output}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  {/* Status pill */}
                  <span className={`text-[10px] font-medium capitalize px-2 py-0.5 rounded-full border ${cfg.border} ${cfg.text}`}>
                    {status === 'preparing' ? 'Preparando' :
                     status === 'executing' ? 'Ejecutando' :
                     status === 'complete' ? 'Completado' :
                     status === 'error' ? 'Error' : 'Pendiente'}
                  </span>
                  {/* Duration */}
                  {execStep?.durationMs != null && (
                    <span className="flex items-center gap-1 text-[10px] text-neutral-600">
                      <Clock size={9} />{formatDuration(execStep.durationMs)}
                    </span>
                  )}
                  {/* Tokens */}
                  {execStep?.tokensUsed != null && execStep.tokensUsed > 0 && (
                    <span className="text-[10px] text-neutral-700">{execStep.tokensUsed.toLocaleString()} tok</span>
                  )}
                </div>
              </div>

              {/* Error message */}
              {status === 'error' && execStep?.error && (
                <div className="mt-2 text-[11px] text-error-400 bg-error-500/10 border border-error-500/20 rounded px-2 py-1">
                  {execStep.error}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
