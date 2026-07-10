import React from 'react';
import { Bot, Cpu, Zap, DollarSign, Clock, Layers, Activity, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import type { ActiveAgentSnapshot } from '../../types/execution';

interface AgentPanelProps {
  agent: ActiveAgentSnapshot | null;
  elapsedMs: number;
  runStatus: string;
  lang: string;
}

const MODEL_COLORS: Record<string, string> = {
  'gpt-4o':            'text-green-400 bg-green-400/10 border-green-400/20',
  'gpt-4o-mini':       'text-green-300 bg-green-300/10 border-green-300/20',
  'claude-3-5-sonnet': 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  'claude-3-haiku':    'text-orange-300 bg-orange-300/10 border-orange-300/20',
  'gemini-1.5-pro':    'text-blue-400 bg-blue-400/10 border-blue-400/20',
};

function StatRow({ icon, label, value, accent = false }: {
  icon: React.ReactNode; label: string; value: string; accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-surface-700 last:border-0">
      <div className="flex items-center gap-2 text-neutral-500">
        <span className="text-neutral-600">{icon}</span>
        <span className="text-xs">{label}</span>
      </div>
      <span className={`text-xs font-mono font-medium ${accent ? 'text-brand-300' : 'text-neutral-200'}`}>
        {value}
      </span>
    </div>
  );
}

function StatusIndicator({ status }: { status: string }) {
  if (status === 'executing') {
    return (
      <div className="flex items-center gap-1.5 text-brand-400">
        <Loader2 size={12} className="animate-spin" />
        <span className="text-xs font-medium">Ejecutando</span>
      </div>
    );
  }
  if (status === 'preparing') {
    return (
      <div className="flex items-center gap-1.5 text-warning-400">
        <Loader2 size={12} className="animate-spin" />
        <span className="text-xs font-medium">Preparando</span>
      </div>
    );
  }
  if (status === 'complete') {
    return (
      <div className="flex items-center gap-1.5 text-success-400">
        <CheckCircle2 size={12} />
        <span className="text-xs font-medium">Completado</span>
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div className="flex items-center gap-1.5 text-error-400">
        <XCircle size={12} />
        <span className="text-xs font-medium">Error</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 text-neutral-600">
      <Activity size={12} />
      <span className="text-xs font-medium">En espera</span>
    </div>
  );
}

export function AgentPanel({ agent, elapsedMs, runStatus, lang }: AgentPanelProps) {
  const isEs = lang === 'es';

  if (!agent || runStatus === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4 py-12">
        <div className="w-12 h-12 rounded-xl bg-surface-700 border border-surface-600 flex items-center justify-center mb-4">
          <Bot size={20} className="text-neutral-600" />
        </div>
        <p className="text-xs font-medium text-neutral-500 mb-1">
          {isEs ? 'Agente activo' : 'Active Agent'}
        </p>
        <p className="text-[11px] text-neutral-700 leading-relaxed">
          {isEs
            ? 'Aquí aparecerá el agente en ejecución durante la simulación.'
            : 'The active agent will appear here during simulation.'}
        </p>
      </div>
    );
  }

  const elapsedSec = (elapsedMs / 1000).toFixed(1);
  const modelColor = MODEL_COLORS[agent.model] ?? 'text-neutral-400 bg-surface-700 border-surface-600';

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Agent header */}
      <div className="p-4 border-b border-surface-700">
        <div className="flex items-start gap-3">
          <div className={`
            relative w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
            ${agent.status === 'executing' ? 'bg-brand-gradient shadow-glow-brand' : 'bg-surface-700 border border-surface-600'}
          `}>
            <Bot size={18} className={agent.status === 'executing' ? 'text-white' : 'text-neutral-400'} />
            {agent.status === 'executing' && (
              <span className="absolute -inset-1 rounded-2xl border border-brand-400/30 animate-ping" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-neutral-100 truncate">{agent.name}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${modelColor}`}>
                {agent.model}
              </span>
              <span className="text-[10px] text-neutral-600 capitalize">{agent.role}</span>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="mt-3 flex items-center justify-between">
          <StatusIndicator status={agent.status} />
          <span className="text-[11px] text-neutral-600 truncate max-w-[120px]">{agent.stepName}</span>
        </div>
      </div>

      {/* Live metrics */}
      <div className="p-4 border-b border-surface-700">
        <p className="text-[10px] uppercase tracking-wider text-neutral-600 font-medium mb-2">
          {isEs ? 'Métricas en vivo' : 'Live Metrics'}
        </p>
        <StatRow icon={<Clock size={12} />} label={isEs ? 'Tiempo' : 'Time'} value={`${elapsedSec}s`} accent />
        <StatRow icon={<Zap size={12} />} label="Tokens" value={agent.tokensUsed.toLocaleString()} accent />
        <StatRow icon={<DollarSign size={12} />} label={isEs ? 'Coste' : 'Cost'} value={`$${agent.costUsd.toFixed(5)}`} />
        <StatRow icon={<Cpu size={12} />} label="Modelo" value={agent.model} />
      </div>

      {/* Capabilities */}
      <div className="p-4">
        <p className="text-[10px] uppercase tracking-wider text-neutral-600 font-medium mb-2">
          {isEs ? 'Capacidades' : 'Capabilities'}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {agent.capabilities.map((cap) => (
            <span
              key={cap}
              className="text-[10px] bg-surface-750 border border-surface-600 text-neutral-500 px-2 py-0.5 rounded-full"
            >
              {cap}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
