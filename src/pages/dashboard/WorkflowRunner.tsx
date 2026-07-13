import { useState } from 'react';
import {
  Play, Square, RotateCcw, PlayCircle, Layers, Bot,
  ChevronRight, Sparkles, Zap, AlertTriangle,
} from 'lucide-react';
import { WorkflowDiagram } from '../../components/runner/WorkflowDiagram';
import { AgentPanel } from '../../components/runner/AgentPanel';
import { LogPanel } from '../../components/runner/LogPanel';
import { ExecutionSummary } from '../../components/runner/ExecutionSummary';
import { useWorkflowRunner } from '../../hooks/useWorkflowRunner';
import { useTranslation } from '../../hooks/useTranslation';
import type { Blueprint } from '../../types/blueprint';

// ─── Blueprint list panel ─────────────────────────────────────────────────────

const COMPLEXITY_CONFIG = {
  simple:  { dot: 'bg-success-400', label: 'Simple',   color: 'text-success-400' },
  medium:  { dot: 'bg-warning-400', label: 'Media',    color: 'text-warning-400' },
  complex: { dot: 'bg-error-400',   label: 'Compleja', color: 'text-error-400' },
};

function BlueprintList({
  blueprints,
  selected,
  onSelect,
  runStatus,
  lang,
}: {
  blueprints: Blueprint[];
  selected: Blueprint | null;
  onSelect: (bp: Blueprint) => void;
  runStatus: string;
  lang: string;
}) {
  const isEs = lang === 'es';
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-surface-700 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Layers size={14} className="text-neutral-500" />
          <p className="text-xs font-semibold text-neutral-300">
            {isEs ? 'Blueprints' : 'Blueprints'}
          </p>
          <span className="ml-auto text-[10px] text-neutral-600">{blueprints.length}</span>
        </div>
        <p className="text-[11px] text-neutral-600 mt-1">
          {isEs ? 'Selecciona un Blueprint para ejecutar' : 'Select a Blueprint to execute'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {blueprints.map((bp, i) => {
          const isSelected = selected?.id === bp.id;
          const cx = COMPLEXITY_CONFIG[bp.complexity];
          return (
            <button
              key={bp.id}
              onClick={() => onSelect(bp)}
              disabled={runStatus === 'running'}
              className={`w-full text-left rounded-xl border p-3 transition-all duration-200 group
                ${isSelected
                  ? 'border-brand-500/50 bg-brand-500/8 shadow-[0_0_12px_rgba(99,102,241,0.15)]'
                  : 'border-surface-600 bg-surface-750 hover:border-surface-500 hover:bg-surface-700'
                }
                ${runStatus === 'running' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div className="flex items-start gap-2">
                <div className={`
                  w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5
                  ${isSelected ? 'bg-brand-gradient shadow-glow-brand' : 'bg-surface-700 border border-surface-600'}
                `}>
                  <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-neutral-500'}`}>{i + 1}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-semibold leading-tight mb-1 ${isSelected ? 'text-brand-200' : 'text-neutral-200'}`}>
                    {bp.summary.slice(0, 60)}{bp.summary.length > 60 ? '…' : ''}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${cx.dot}`} />
                      <span className={`text-[10px] ${cx.color}`}>{cx.label}</span>
                    </div>
                    <span className="text-[10px] text-neutral-600">
                      <Bot size={9} className="inline mr-0.5" />{bp.agents.length} {isEs ? 'agentes' : 'agents'}
                    </span>
                    <span className="text-[10px] text-neutral-600">
                      {bp.workflow.length} {isEs ? 'pasos' : 'steps'}
                    </span>
                  </div>
                </div>
                {isSelected && <ChevronRight size={12} className="text-brand-400 flex-shrink-0 mt-1" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Center header (blueprint info + run controls) ────────────────────────────

function CenterHeader({
  blueprint,
  runStatus,
  onStart,
  onStop,
  onReset,
  lang,
}: {
  blueprint: Blueprint | null;
  runStatus: string;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  lang: string;
}) {
  const isEs = lang === 'es';

  if (!blueprint) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-8 animate-fade-in">
        <div className="w-14 h-14 rounded-2xl bg-surface-700 border border-surface-600 flex items-center justify-center mb-5">
          <PlayCircle size={24} className="text-neutral-600" />
        </div>
        <h3 className="text-base font-semibold text-neutral-300 mb-2">
          {isEs ? 'Selecciona un Blueprint' : 'Select a Blueprint'}
        </h3>
        <p className="text-sm text-neutral-600 max-w-sm leading-relaxed">
          {isEs
            ? 'Elige un Blueprint del panel izquierdo para ver su workflow y ejecutar la simulación.'
            : 'Choose a Blueprint from the left panel to see its workflow and run the simulation.'}
        </p>
      </div>
    );
  }

  const isRunning = runStatus === 'running';
  const isComplete = runStatus === 'complete' || runStatus === 'error';

  return (
    <div className="px-4 py-3 border-b border-surface-700 flex items-center gap-3 flex-shrink-0 flex-wrap">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-neutral-100 truncate">{blueprint.summary.slice(0, 70)}…</p>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          <span className="text-[10px] text-neutral-600">
            {blueprint.workflow.length} {isEs ? 'pasos' : 'steps'}
          </span>
          <span className="text-[10px] text-neutral-600">
            {blueprint.agents.length} {isEs ? 'agentes' : 'agents'}
          </span>
          <span className="text-[10px] text-neutral-600">
            ~{blueprint.time.perExecutionSeconds}s
          </span>
          <span className="text-[10px] text-neutral-600">
            ${blueprint.cost.perExecution.min}–${blueprint.cost.perExecution.max}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isComplete && (
          <button onClick={onReset} className="btn-ghost text-xs px-3 py-1.5 text-neutral-500">
            <RotateCcw size={13} /> {isEs ? 'Limpiar' : 'Clear'}
          </button>
        )}
        {isRunning ? (
          <button onClick={onStop} className="btn-secondary text-xs px-4 py-1.5 border-error-500/30 text-error-400 hover:bg-error-500/10">
            <Square size={12} /> {isEs ? 'Detener' : 'Stop'}
          </button>
        ) : (
          <button
            onClick={onStart}
            disabled={isRunning}
            className="btn-primary text-xs px-4 py-1.5 disabled:opacity-50"
          >
            {isRunning
              ? <><Zap size={12} className="animate-pulse" /> {isEs ? 'Ejecutando...' : 'Running...'}</>
              : <><Play size={12} /> {isEs ? 'Ejecutar simulación' : 'Run simulation'}</>
            }
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function WorkflowRunner() {
  const { lang } = useTranslation();
  const isEs = lang === 'es';
  const [logHeight] = useState(200);

  const {
    selectedBlueprint,
    selectBlueprint,
    execState,
    summary,
    startExecution,
    stopExecution,
    reset,
    elapsedMs,
    mockBlueprints,
  } = useWorkflowRunner();

  const showSummary = (execState.status === 'complete' || execState.status === 'error') && summary;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* ── Page header ── */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-surface-700 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-brand-gradient flex items-center justify-center shadow-glow-brand flex-shrink-0">
          <PlayCircle size={16} className="text-white" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-neutral-100">
            {isEs ? 'Workflow Runner' : 'Workflow Runner'}
          </h2>
          <p className="text-[11px] text-neutral-500">
            {isEs ? 'Simulación extremadamente realista — arquitectura lista para producción' : 'Hyper-realistic simulation — production-ready architecture'}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="badge-accent text-[10px]">
            <Sparkles size={9} /> {isEs ? 'Simulación' : 'Simulation'}
          </span>
          {execState.status === 'running' && (
            <div className="flex items-center gap-1.5 text-brand-400">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
              <span className="text-xs font-medium">{isEs ? 'En ejecución' : 'Running'}</span>
            </div>
          )}
          {execState.status === 'error' && (
            <div className="flex items-center gap-1.5 text-warning-400">
              <AlertTriangle size={12} />
              <span className="text-xs font-medium">{isEs ? 'Completado con errores' : 'Completed with errors'}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Main body (3 columns + bottom logs) ── */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* Left: Blueprint list */}
        <div className="w-64 flex-shrink-0 border-r border-surface-700 overflow-hidden flex flex-col bg-surface-900">
          <BlueprintList
            blueprints={mockBlueprints}
            selected={selectedBlueprint}
            onSelect={selectBlueprint}
            runStatus={execState.status}
            lang={lang}
          />
        </div>

        {/* Center: Workflow diagram or empty state */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <CenterHeader
            blueprint={selectedBlueprint}
            runStatus={execState.status}
            onStart={startExecution}
            onStop={stopExecution}
            onReset={reset}
            lang={lang}
          />
          <div className="flex-1 overflow-y-auto bg-surface-900 px-2">
            {selectedBlueprint && (
              <WorkflowDiagram
                steps={selectedBlueprint.workflow}
                execSteps={execState.steps}
                agents={selectedBlueprint.agents}
                activeStepIndex={execState.activeStepIndex}
                runStatus={execState.status}
              />
            )}
          </div>
        </div>

        {/* Right: Agent panel or summary */}
        <div className="w-72 flex-shrink-0 border-l border-surface-700 overflow-hidden flex flex-col bg-surface-900">
          {showSummary ? (
            <ExecutionSummary
              summary={summary}
              blueprintName={selectedBlueprint?.summary ?? ''}
              lang={lang}
              onReset={reset}
              onRunAgain={startExecution}
            />
          ) : (
            <>
              <div className="px-4 py-3 border-b border-surface-700 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Bot size={13} className="text-neutral-500" />
                  <p className="text-xs font-semibold text-neutral-400">
                    {isEs ? 'Agente activo' : 'Active Agent'}
                  </p>
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                <AgentPanel
                  agent={execState.activeAgent}
                  elapsedMs={elapsedMs}
                  runStatus={execState.status}
                  lang={lang}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom: Live logs */}
      <div
        className="flex-shrink-0 border-t border-surface-700 bg-surface-950"
        style={{ height: `${logHeight}px` }}
      >
        <LogPanel logs={execState.logs} lang={lang} />
      </div>
    </div>
  );
}
