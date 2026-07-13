import React from 'react';
import {
  Target, ArrowDownCircle, ArrowUpCircle, Bot, Wrench,
  Plug, GitBranch, AlertTriangle, DollarSign, Clock, TrendingUp,
  CheckCircle2, XCircle, AlertCircle, ChevronRight, Zap, Download,
} from 'lucide-react';
import type { Blueprint, BlueprintWorkflowStep, RiskLevel, ComplexityLevel } from '../../types/blueprint';

interface BlueprintViewProps {
  blueprint: Blueprint;
  lang: string;
  onExportJson: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RISK_CONFIG: Record<RiskLevel, { color: string; icon: React.ReactNode; bg: string }> = {
  low:    { color: 'text-success-400', bg: 'bg-success-500/10 border-success-500/20', icon: <CheckCircle2 size={14} /> },
  medium: { color: 'text-warning-400', bg: 'bg-warning-500/10 border-warning-500/20', icon: <AlertCircle size={14} /> },
  high:   { color: 'text-error-400',   bg: 'bg-error-500/10 border-error-500/20',     icon: <XCircle size={14} /> },
};

const COMPLEXITY_CONFIG: Record<ComplexityLevel, { label: string; labelEn: string; color: string }> = {
  simple:  { label: 'Simple',   labelEn: 'Simple',  color: 'text-success-400 bg-success-500/10 border-success-500/20' },
  medium:  { label: 'Media',    labelEn: 'Medium',  color: 'text-warning-400 bg-warning-500/10 border-warning-500/20' },
  complex: { label: 'Compleja', labelEn: 'Complex', color: 'text-error-400   bg-error-500/10   border-error-500/20'   },
};

const MODEL_COLORS: Record<string, string> = {
  'gpt-4o':             'text-green-400  bg-green-400/10  border-green-400/20',
  'gpt-4o-mini':        'text-green-300  bg-green-300/10  border-green-300/20',
  'claude-3-5-sonnet':  'text-orange-400 bg-orange-400/10 border-orange-400/20',
  'claude-3-haiku':     'text-orange-300 bg-orange-300/10 border-orange-300/20',
  'gemini-1.5-pro':     'text-blue-400   bg-blue-400/10   border-blue-400/20',
};

function ConfidenceRing({ value }: { value: number }) {
  const r = 30;
  const circ = 2 * Math.PI * r;
  const fill = (value / 100) * circ;
  const color = value >= 80 ? '#22c55e' : value >= 60 ? '#f59e0b' : '#ef4444';
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" className="flex-shrink-0">
      <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
      <circle
        cx="40" cy="40" r={r} fill="none"
        stroke={color} strokeWidth="7"
        strokeDasharray={`${fill} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 40 40)"
        style={{ transition: 'stroke-dasharray 0.8s ease' }}
      />
      <text x="40" y="44" textAnchor="middle" fill={color} fontSize="14" fontWeight="700">{value}%</text>
    </svg>
  );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-brand-400">{icon}</span>
      <h4 className="text-sm font-semibold text-neutral-200 uppercase tracking-wide">{title}</h4>
    </div>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-surface-700 border border-surface-600 text-neutral-400">
      {label}
    </span>
  );
}

function WorkflowStep({ step, isLast }: { step: BlueprintWorkflowStep; isLast: boolean }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="w-7 h-7 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-bold text-brand-400">{step.step}</span>
        </div>
        {!isLast && <div className="w-px flex-1 bg-surface-600 mt-1 mb-1" />}
      </div>
      <div className="pb-4 min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <p className="text-sm font-semibold text-neutral-100">{step.name}</p>
          {step.agentId && (
            <span className="text-[10px] bg-brand-500/10 border border-brand-500/20 text-brand-400 px-1.5 py-0.5 rounded-full">
              <Bot size={9} className="inline mr-0.5" />{step.agentId.replace('agent-', '')}
            </span>
          )}
          <span className="text-[10px] text-neutral-600">{step.estimatedMs}ms</span>
        </div>
        <p className="text-xs text-neutral-500 leading-relaxed mb-2">{step.description}</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-neutral-600">In</span>
            <p className="text-xs text-neutral-400">{step.input}</p>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-neutral-600">Out</span>
            <p className="text-xs text-neutral-400">{step.output}</p>
          </div>
        </div>
        {step.condition && (
          <p className="text-[11px] text-neutral-600 mt-1 italic">⚡ {step.condition}</p>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function BlueprintView({ blueprint: bp, lang, onExportJson }: BlueprintViewProps) {
  const isEs = lang === 'es';
  const cx = COMPLEXITY_CONFIG[bp.complexity];

  const fmt = (n: number) => n < 0.1 ? `$${(n * 100).toFixed(1)}¢` : `$${n.toFixed(2)}`;

  return (
    <div className="animate-fade-in space-y-4">
      {/* ── Blueprint header card ── */}
      <div className="card p-5">
        <div className="flex items-start gap-5">
          <ConfidenceRing value={bp.confidence} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cx.color}`}>
                {isEs ? cx.label : cx.labelEn}
              </span>
              <span className="text-xs text-neutral-600 font-mono">v{bp.version}</span>
              <span className="text-xs text-neutral-600">
                {new Date(bp.generatedAt).toLocaleString(isEs ? 'es-ES' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
            </div>
            <p className="text-sm text-neutral-200 leading-relaxed">{bp.summary}</p>
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {bp.tags.map((tag) => <Tag key={tag} label={tag} />)}
            </div>
          </div>
          <button
            onClick={onExportJson}
            className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-100 border border-surface-600 hover:border-surface-500 rounded-lg px-3 py-1.5 transition-all flex-shrink-0"
          >
            <Download size={12} /> JSON
          </button>
        </div>
      </div>

      {/* ── Summary grid: Objective + Inputs/Outputs ── */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-5">
          <SectionHeader icon={<Target size={15} />} title={isEs ? 'Objetivo' : 'Objective'} />
          <p className="text-sm text-neutral-400 leading-relaxed">{bp.objective}</p>
        </div>
        <div className="card p-5 space-y-4">
          <div>
            <SectionHeader icon={<ArrowDownCircle size={15} />} title={isEs ? 'Entradas' : 'Inputs'} />
            <ul className="space-y-1">
              {bp.inputs.map((inp, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-neutral-400">
                  <ChevronRight size={12} className="text-brand-500 mt-0.5 flex-shrink-0" />{inp}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <SectionHeader icon={<ArrowUpCircle size={15} />} title={isEs ? 'Salidas' : 'Outputs'} />
            <ul className="space-y-1">
              {bp.outputs.map((out, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-neutral-400">
                  <ChevronRight size={12} className="text-accent-500 mt-0.5 flex-shrink-0" />{out}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ── Agents ── */}
      <div className="card p-5">
        <SectionHeader icon={<Bot size={15} />} title={isEs ? 'Agentes necesarios' : 'Required Agents'} />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {bp.agents.map((agent) => (
            <div key={agent.id} className="bg-surface-750 border border-surface-600 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-neutral-100">{agent.name}</p>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${MODEL_COLORS[agent.model] ?? 'text-neutral-400 bg-surface-700 border-surface-600'}`}>
                  {agent.model}
                </span>
              </div>
              <p className="text-[10px] text-neutral-600 capitalize">{agent.role}</p>
              <div className="flex flex-wrap gap-1">
                {agent.capabilities.slice(0, 3).map((cap) => (
                  <span key={cap} className="text-[9px] bg-surface-700 text-neutral-500 px-1.5 py-0.5 rounded">{cap}</span>
                ))}
              </div>
              <p className="text-[10px] text-neutral-600">~{agent.estimatedTokens.toLocaleString()} tokens/run</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tools + Integrations ── */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-5">
          <SectionHeader icon={<Wrench size={15} />} title={isEs ? 'Herramientas' : 'Tools'} />
          <div className="space-y-2">
            {bp.tools.map((tool) => (
              <div key={tool.name} className="flex items-start justify-between gap-3 py-2 border-b border-surface-700 last:border-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-xs font-medium text-neutral-200">{tool.name}</p>
                    <span className="text-[9px] uppercase bg-surface-700 text-neutral-500 px-1 rounded">{tool.type}</span>
                  </div>
                  <p className="text-[11px] text-neutral-500">{tool.description}</p>
                </div>
                {tool.required
                  ? <span className="text-[10px] text-brand-400 flex-shrink-0">{isEs ? 'Req.' : 'Req.'}</span>
                  : <span className="text-[10px] text-neutral-600 flex-shrink-0">{isEs ? 'Opc.' : 'Opt.'}</span>
                }
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <SectionHeader icon={<Plug size={15} />} title={isEs ? 'Integraciones' : 'Integrations'} />
          <div className="space-y-2">
            {bp.integrations.map((intg) => (
              <div key={intg.service} className="flex items-center justify-between py-2 border-b border-surface-700 last:border-0">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-neutral-200">{intg.service}</p>
                    <span className={`text-[9px] uppercase px-1 rounded ${intg.role === 'trigger' ? 'bg-accent-500/10 text-accent-400' : 'bg-brand-500/10 text-brand-400'}`}>
                      {intg.role}
                    </span>
                  </div>
                  <p className="text-[10px] text-neutral-600 mt-0.5">auth: {intg.authType} · setup: {intg.setupTime}</p>
                </div>
                {intg.required
                  ? <span className="text-[10px] text-brand-400">{isEs ? 'Req.' : 'Req.'}</span>
                  : <span className="text-[10px] text-neutral-600">{isEs ? 'Opc.' : 'Opt.'}</span>
                }
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Workflow ── */}
      <div className="card p-5">
        <SectionHeader icon={<GitBranch size={15} />} title={isEs ? 'Workflow paso a paso' : 'Step-by-step Workflow'} />
        <div className="mt-2">
          {bp.workflow.map((step, i) => (
            <WorkflowStep key={step.step} step={step} isLast={i === bp.workflow.length - 1} />
          ))}
        </div>
      </div>

      {/* ── Risks ── */}
      <div className="card p-5">
        <SectionHeader icon={<AlertTriangle size={15} />} title={isEs ? 'Riesgos' : 'Risks'} />
        <div className="space-y-3">
          {bp.risks.map((risk, i) => {
            const cfg = RISK_CONFIG[risk.level];
            return (
              <div key={i} className={`rounded-lg border p-3 ${cfg.bg}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={cfg.color}>{cfg.icon}</span>
                  <p className={`text-xs font-semibold ${cfg.color}`}>{risk.title}</p>
                </div>
                <p className="text-xs text-neutral-400 mb-1.5">{risk.description}</p>
                <div className="flex items-start gap-1.5">
                  <Zap size={11} className="text-neutral-600 mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] text-neutral-500 italic">{risk.mitigation}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Cost / Time / Confidence ── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4">
          <SectionHeader icon={<DollarSign size={14} />} title={isEs ? 'Coste' : 'Cost'} />
          <p className="text-lg font-bold text-neutral-100">
            {fmt(bp.cost.perExecution.min)}–{fmt(bp.cost.perExecution.max)}
          </p>
          <p className="text-[11px] text-neutral-500 mb-3">{isEs ? 'por ejecución' : 'per execution'}</p>
          <p className="text-xs text-neutral-400">
            ${bp.cost.monthly.min}–${bp.cost.monthly.max}
            <span className="text-neutral-600"> / {isEs ? 'mes' : 'mo'}</span>
          </p>
          <div className="mt-3 space-y-1">
            {bp.cost.breakdown.map((b) => (
              <div key={b.item} className="flex items-center justify-between text-[10px]">
                <span className="text-neutral-600">{b.item}</span>
                <span className="text-neutral-400 font-mono">{b.cost}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-4">
          <SectionHeader icon={<Clock size={14} />} title={isEs ? 'Tiempo' : 'Time'} />
          <p className="text-lg font-bold text-neutral-100">{bp.time.perExecutionSeconds}s</p>
          <p className="text-[11px] text-neutral-500 mb-3">{isEs ? 'por ejecución' : 'per execution'}</p>
          <div className="space-y-2">
            <div>
              <p className="text-[10px] text-neutral-600">{isEs ? 'Setup' : 'Setup'}</p>
              <p className="text-xs text-neutral-300">{bp.time.setupDays} {isEs ? 'días' : 'days'}</p>
            </div>
            <div>
              <p className="text-[10px] text-neutral-600">{isEs ? 'Testing' : 'Testing'}</p>
              <p className="text-xs text-neutral-300">{bp.time.testingDays} {isEs ? 'días' : 'days'}</p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <SectionHeader icon={<TrendingUp size={14} />} title={isEs ? 'Confianza' : 'Confidence'} />
          <div className="flex flex-col items-center">
            <ConfidenceRing value={bp.confidence} />
            <p className="text-xs text-neutral-500 mt-2 text-center">
              {bp.confidence >= 80
                ? (isEs ? 'Alta viabilidad' : 'High viability')
                : bp.confidence >= 60
                  ? (isEs ? 'Revisar dependencias' : 'Review dependencies')
                  : (isEs ? 'Requiere refinamiento' : 'Needs refinement')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
