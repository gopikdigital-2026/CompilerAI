import React from 'react';
import {
  Brain, CheckCircle2, GitBranch, Layers, Shield, TrendingUp,
  Zap, AlertTriangle, Activity, Target,
} from 'lucide-react';
import { useBrain } from '../../hooks/useBrain';
import type { BrainModule } from '../../types/brain';
import { DecisionCenter } from '../../components/brain/DecisionCenter';
import { PlanningEngine } from '../../components/brain/PlanningEngine';
import { ReasoningEngine } from '../../components/brain/ReasoningEngine';
import { StrategyEngine } from '../../components/brain/StrategyEngine';
import { RiskAnalyzer } from '../../components/brain/RiskAnalyzer';
import { OptimizationCenter } from '../../components/brain/OptimizationCenter';
import { DecisionTimeline } from '../../components/brain/DecisionTimeline';
import { WhyModal } from '../../components/brain/WhyModal';

const MODULE_TABS: { id: BrainModule; label: string; icon: React.ReactNode; shortLabel: string }[] = [
  { id: 'decision',     label: 'Decision Center',     shortLabel: 'Decisión',     icon: <CheckCircle2 size={14} /> },
  { id: 'planning',     label: 'Planning Engine',     shortLabel: 'Planning',     icon: <Target size={14} /> },
  { id: 'reasoning',    label: 'Reasoning Engine',    shortLabel: 'Reasoning',    icon: <Brain size={14} /> },
  { id: 'strategy',     label: 'Strategy Engine',     shortLabel: 'Estrategia',   icon: <Layers size={14} /> },
  { id: 'risk',         label: 'Risk Analyzer',       shortLabel: 'Riesgo',       icon: <Shield size={14} /> },
  { id: 'optimization', label: 'Optimization Center', shortLabel: 'Optimización', icon: <TrendingUp size={14} /> },
];

function ConfidenceGauge({ value }: { value: number }) {
  const r = 22;
  const circumference = 2 * Math.PI * r;
  const dash = (value / 100) * circumference;
  const color = value >= 90 ? '#22c55e' : value >= 70 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative w-14 h-14 flex-shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 50 50">
        <circle cx="25" cy="25" r={r} fill="none" strokeWidth="4" stroke="rgba(255,255,255,0.06)" />
        <circle
          cx="25" cy="25" r={r} fill="none" strokeWidth="4"
          stroke={color}
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[10px] font-bold font-mono" style={{ color }}>{value}</span>
        <span className="text-[7px] text-neutral-700">%</span>
      </div>
    </div>
  );
}

export default function AIBrain() {
  const brain = useBrain();
  const {
    activeModule, setActiveModule,
    decisions, allDecisions, masterPlan, reasoningChain,
    strategies, risks, optimizations, stats,
    decisionFilter, setDecisionFilter,
    selectedDecision, showWhyModal, openWhy, closeWhy,
  } = brain;

  function renderModule() {
    switch (activeModule) {
      case 'decision':
        return (
          <DecisionCenter
            decisions={decisions}
            filter={decisionFilter}
            onFilterChange={f => setDecisionFilter(f as any)}
            onOpenWhy={openWhy}
          />
        );
      case 'planning':
        return <PlanningEngine plan={masterPlan} />;
      case 'reasoning':
        return <ReasoningEngine chain={reasoningChain} />;
      case 'strategy':
        return <StrategyEngine strategies={strategies} />;
      case 'risk':
        return <RiskAnalyzer risks={risks} />;
      case 'optimization':
        return <OptimizationCenter optimizations={optimizations} />;
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-surface-900">
      {/* ── Top stats bar ── */}
      <div className="flex items-center gap-4 px-5 py-3 border-b border-surface-700 flex-shrink-0 overflow-x-auto">
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20">
            <Brain size={16} className="text-sky-400" />
          </div>
          <div>
            <p className="text-[10px] text-neutral-600">AI Brain</p>
            <p className="text-xs font-bold text-neutral-200">Simulation Mode</p>
          </div>
        </div>

        <div className="h-8 w-px bg-surface-700 flex-shrink-0" />

        {/* Stats */}
        <div className="flex items-center gap-5 text-[11px] flex-shrink-0">
          <div className="text-center">
            <p className="text-neutral-600 mb-0.5">Decisiones</p>
            <p className="font-bold font-mono text-neutral-200">{stats.totalDecisions}</p>
          </div>
          <div className="text-center">
            <p className="text-neutral-600 mb-0.5">Hoy</p>
            <p className="font-bold font-mono text-sky-400">{stats.decisionsToday}</p>
          </div>
          <div className="text-center">
            <p className="text-neutral-600 mb-0.5">Riesgos</p>
            <p className="font-bold font-mono text-error-400">{stats.openRisks} abiertos</p>
          </div>
          <div className="text-center">
            <p className="text-neutral-600 mb-0.5">Optimizaciones</p>
            <p className="font-bold font-mono text-amber-400">{stats.optimizationsFound}</p>
          </div>
        </div>

        <div className="h-8 w-px bg-surface-700 flex-shrink-0" />

        {/* Confidence gauge */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <ConfidenceGauge value={stats.confidenceAvg} />
          <div>
            <p className="text-[10px] text-neutral-600">Confianza</p>
            <p className="text-[10px] text-neutral-500">promedio global</p>
          </div>
        </div>

        <div className="h-8 w-px bg-surface-700 flex-shrink-0" />

        {/* Overall risk */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl border
            ${stats.overallRisk === 'medium' ? 'text-warning-400 bg-warning-400/10 border-warning-400/20' :
              stats.overallRisk === 'high' ? 'text-orange-400 bg-orange-400/10 border-orange-400/20' :
              stats.overallRisk === 'critical' ? 'text-error-400 bg-error-400/10 border-error-400/20' :
              'text-success-400 bg-success-400/10 border-success-400/20'}`}>
            <AlertTriangle size={12} />
            Riesgo Global: {stats.overallRisk === 'medium' ? 'Medio' : stats.overallRisk === 'high' ? 'Alto' : stats.overallRisk === 'critical' ? 'Crítico' : 'Bajo'}
          </div>
        </div>
      </div>

      {/* ── Module tabs ── */}
      <div className="flex items-center gap-0 px-3 border-b border-surface-700 flex-shrink-0 overflow-x-auto">
        {MODULE_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveModule(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition-all whitespace-nowrap
              ${activeModule === tab.id
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-300 hover:border-surface-600'}`}
          >
            {tab.icon}
            {tab.shortLabel}
          </button>
        ))}
      </div>

      {/* ── Body: Module content + Decision Timeline sidebar ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Module content */}
        <div className="flex-1 overflow-hidden">
          {renderModule()}
        </div>

        {/* Decision timeline sidebar */}
        <div className="w-56 border-l border-surface-700 flex-shrink-0 overflow-hidden flex flex-col">
          <DecisionTimeline
            decisions={allDecisions}
            onSelect={openWhy}
            selectedId={selectedDecision?.id}
          />
        </div>
      </div>

      {/* Why modal */}
      {showWhyModal && (
        <WhyModal decision={selectedDecision} onClose={closeWhy} />
      )}
    </div>
  );
}
