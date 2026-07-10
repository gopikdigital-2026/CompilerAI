import React from 'react';
import {
  Wand2, Brain, Target, Layers, MessageSquarePlus, Activity,
  Sparkles, Loader2, CheckCircle2, AlertTriangle, Hash, Type,
} from 'lucide-react';
import { usePromptIntelligence } from '../../hooks/usePromptIntelligence';
import { PromptEditor } from '../../components/prompt/PromptEditor';
import { PromptAnalyzer } from '../../components/prompt/PromptAnalyzer';
import { PromptOptimizer } from '../../components/prompt/PromptOptimizer';
import { IntentDetection } from '../../components/prompt/IntentDetection';
import { AISuggestions } from '../../components/prompt/AISuggestions';
import { PromptScore } from '../../components/prompt/PromptScore';
import { SIMULATION_MODE } from '../../services/prompt.service';

type TabId = 'analyzer' | 'optimizer' | 'intent' | 'suggestions';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'analyzer',    label: 'Analyzer',    icon: <Brain size={13} /> },
  { id: 'optimizer',   label: 'Optimizer',   icon: <Layers size={13} /> },
  { id: 'intent',      label: 'Intent',      icon: <Target size={13} /> },
  { id: 'suggestions', label: 'Sugerencias', icon: <MessageSquarePlus size={13} /> },
];

export default function PromptIntelligence() {
  const pi = usePromptIntelligence();

  const pendingSuggestions = pi.suggestions.filter(s => !s.implemented).length;
  const criticalSuggestions = pi.suggestions.filter(s => !s.implemented && s.severity === 'critical').length;
  const primaryIntent = pi.intents.find(i => i.detected);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-surface-900">

      {/* ── Top bar ── */}
      <div className="flex items-center gap-4 px-5 py-3 border-b border-surface-700 flex-shrink-0 overflow-x-auto">
        {/* Brand */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <Wand2 size={16} className="text-amber-400" />
          </div>
          <div>
            <p className="text-[10px] text-neutral-600">Prompt Intelligence</p>
            <p className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
              {SIMULATION_MODE
                ? <><span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> Simulation Mode</>
                : <><span className="w-1.5 h-1.5 rounded-full bg-success-400 animate-pulse" /> Live Mode</>
              }
            </p>
          </div>
        </div>

        <div className="h-8 w-px bg-surface-700 flex-shrink-0" />

        {/* Live stats */}
        <div className="flex items-center gap-5 text-[11px] flex-shrink-0">
          <div className="text-center">
            <p className="text-neutral-600 mb-0.5">Caracteres</p>
            <p className="font-bold font-mono text-neutral-300 flex items-center gap-1">
              <Type size={9} className="text-neutral-600" /> {pi.chars.toLocaleString()}
            </p>
          </div>
          <div className="text-center">
            <p className="text-neutral-600 mb-0.5">Tokens</p>
            <p className={`font-bold font-mono flex items-center gap-1 ${pi.tokens > 1000 ? 'text-error-400' : pi.tokens > 500 ? 'text-warning-400' : 'text-success-400'}`}>
              <Hash size={9} /> ~{pi.tokens.toLocaleString()}
            </p>
          </div>
          {pi.analysis && (
            <div className="text-center">
              <p className="text-neutral-600 mb-0.5">Calidad</p>
              <p className={`font-bold font-mono ${pi.analysis.qualityScore >= 80 ? 'text-success-400' : pi.analysis.qualityScore >= 60 ? 'text-warning-400' : 'text-error-400'}`}>
                {pi.analysis.qualityScore}/100
              </p>
            </div>
          )}
          {primaryIntent && (
            <div className="text-center">
              <p className="text-neutral-600 mb-0.5">Intención</p>
              <p className="font-medium text-amber-400">{primaryIntent.label} {primaryIntent.confidence}%</p>
            </div>
          )}
          {pendingSuggestions > 0 && (
            <div className={`flex items-center gap-1.5 text-[10px] font-medium px-2.5 py-1 rounded-xl border
              ${criticalSuggestions > 0 ? 'text-error-400 bg-error-400/10 border-error-400/20' : 'text-warning-400 bg-warning-400/10 border-warning-400/20'}`}>
              <AlertTriangle size={10} />
              {pendingSuggestions} sugerencia{pendingSuggestions > 1 ? 's' : ''}
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
          {/* Optimize button */}
          <button
            onClick={pi.runOptimize}
            disabled={pi.isOptimizing || !pi.content.trim()}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all
              ${pi.isOptimizing || !pi.content.trim()
                ? 'border-surface-600 text-neutral-600 cursor-not-allowed'
                : 'border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 hover:border-amber-500/60 shadow-glow-brand'
              }`}
          >
            {pi.isOptimizing
              ? <><Loader2 size={14} className="animate-spin" /> Analizando...</>
              : <><Wand2 size={14} /> Optimize Prompt</>
            }
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: Prompt Editor */}
        <div className="w-80 border-r border-surface-700 flex-shrink-0 flex flex-col overflow-hidden">
          <PromptEditor
            content={pi.content}
            tokens={pi.tokens}
            chars={pi.chars}
            history={pi.history}
            onContentChange={pi.updateContent}
            onSaveVersion={pi.saveVersion}
            onRestoreVersion={pi.restoreVersion}
          />
        </div>

        {/* Center: Tabbed panels */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex items-center gap-0 px-3 border-b border-surface-700 flex-shrink-0">
            {TABS.map(tab => {
              const hasNotif = tab.id === 'suggestions' && criticalSuggestions > 0;
              return (
                <button
                  key={tab.id}
                  onClick={() => pi.setActiveTab(tab.id)}
                  className={`relative flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition-all whitespace-nowrap
                    ${pi.activeTab === tab.id
                      ? 'border-amber-500 text-amber-400'
                      : 'border-transparent text-neutral-500 hover:text-neutral-300 hover:border-surface-600'}`}
                >
                  {tab.icon}
                  {tab.label}
                  {hasNotif && (
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-error-500" />
                  )}
                </button>
              );
            })}

            {/* Status badge */}
            {pi.analysisStatus === 'ready' && (
              <div className="ml-auto mr-2 flex items-center gap-1.5 text-[10px] text-success-400">
                <CheckCircle2 size={10} /> Análisis completo
              </div>
            )}
          </div>

          {/* Panel content */}
          <div className="flex-1 overflow-hidden">
            {pi.activeTab === 'analyzer' && (
              <PromptAnalyzer status={pi.analysisStatus} analysis={pi.analysis} />
            )}
            {pi.activeTab === 'optimizer' && (
              <PromptOptimizer
                status={pi.optimizationStatus}
                variants={pi.variants}
                selectedVariant={pi.selectedVariant}
                onSelectVariant={pi.setSelectedVariant}
                onApplyVariant={pi.applyVariant}
              />
            )}
            {pi.activeTab === 'intent' && (
              <IntentDetection
                intents={pi.intents}
                loading={pi.analysisStatus === 'analyzing' && !pi.intents.length}
              />
            )}
            {pi.activeTab === 'suggestions' && (
              <AISuggestions
                suggestions={pi.suggestions}
                onDismiss={pi.dismissSuggestion}
              />
            )}
          </div>
        </div>

        {/* Right: Prompt Score */}
        <div className="w-56 border-l border-surface-700 flex-shrink-0 flex flex-col overflow-hidden">
          <PromptScore score={pi.score} />
        </div>
      </div>
    </div>
  );
}
