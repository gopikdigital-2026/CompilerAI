import { useState } from 'react';
import { DollarSign, TrendingUp, Zap } from 'lucide-react';
import {
  COSTS_BY_WORKFLOW, COSTS_BY_AGENT, COSTS_BY_MODEL, MONTHLY_PREDICTION,
} from '../../lib/enterpriseMocks';

type CostTab = 'workflow' | 'agent' | 'model' | 'prediction';

const PROVIDER_COLORS: Record<string, string> = {
  OpenAI: '#10a37f', Anthropic: '#d4a35a', Google: '#4285f4',
};

const PREDICTION_BAR_MAX = Math.max(...MONTHLY_PREDICTION.map(m => m.predictedUsd));

export function CostIntelligence() {
  const [tab, setTab] = useState<CostTab>('workflow');

  const totalMonth = COSTS_BY_WORKFLOW.reduce((s, w) => s + w.costUsd, 0);
  const topModel   = COSTS_BY_MODEL.sort((a, b) => b.costUsd - a.costUsd)[0];

  return (
    <div className="p-6 space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard label="Gasto total (mes)" value={`$${totalMonth.toFixed(0)}`}      color="#34d399" />
        <SummaryCard label="Modelo top"        value={topModel.model}                   color="#60a5fa" />
        <SummaryCard label="Predicción agosto" value={`$${MONTHLY_PREDICTION[6].predictedUsd.toLocaleString()}`} color="#a78bfa" />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-surface-950 border border-surface-800 p-1 rounded-xl w-fit">
        {([['workflow','Por Workflow'],['agent','Por Agente'],['model','Por Modelo'],['prediction','Predicción']] as [CostTab, string][]).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              tab === id ? 'bg-surface-700 text-neutral-100 shadow' : 'text-neutral-500 hover:text-neutral-300'
            }`}>{label}
          </button>
        ))}
      </div>

      {/* Workflow costs */}
      {tab === 'workflow' && (
        <div className="space-y-2">
          {COSTS_BY_WORKFLOW.map((w, i) => {
            const max = COSTS_BY_WORKFLOW[0].costUsd;
            const pct = (w.costUsd / max) * 100;
            return (
              <div key={w.id} className="bg-surface-800 border border-surface-700 rounded-xl px-4 py-3 hover:border-surface-600 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-xs font-semibold text-neutral-200">{w.name}</p>
                    <p className="text-[10px] text-neutral-600">{w.runs.toLocaleString()} ejecuciones · avg ${w.avgCostUsd.toFixed(3)}</p>
                  </div>
                  <span className="text-sm font-bold text-neutral-100">${w.costUsd.toFixed(0)}</span>
                </div>
                <div className="h-1.5 bg-surface-700 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Agent costs */}
      {tab === 'agent' && (
        <div className="space-y-2">
          {COSTS_BY_AGENT.map(a => {
            const max  = COSTS_BY_AGENT[0].costUsd;
            const pct  = (a.costUsd / max) * 100;
            return (
              <div key={a.id} className="bg-surface-800 border border-surface-700 rounded-xl px-4 py-3 hover:border-surface-600 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-xs font-semibold text-neutral-200">{a.name}</p>
                    <p className="text-[10px] text-neutral-600">{(a.tokensUsed / 1_000_000).toFixed(1)}M tokens</p>
                  </div>
                  <span className="text-sm font-bold text-neutral-100">${a.costUsd.toFixed(0)}</span>
                </div>
                <div className="h-1.5 bg-surface-700 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-violet-400 transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Model costs */}
      {tab === 'model' && (
        <div className="bg-surface-800 border border-surface-700 rounded-2xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-surface-700">
                <Th>Modelo</Th><Th>Proveedor</Th><Th>Tokens</Th><Th>Llamadas</Th><Th>Coste</Th>
              </tr>
            </thead>
            <tbody>
              {COSTS_BY_MODEL.map((m, i) => {
                const color = PROVIDER_COLORS[m.provider] ?? '#94a3b8';
                return (
                  <tr key={m.model} className="border-b border-surface-700/50 hover:bg-surface-700/30 transition-colors">
                    <td className="px-4 py-3 font-semibold text-neutral-200">{m.model}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold" style={{ background: `${color}18`, color }}>
                        {m.provider}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-400 font-mono">{(m.tokens / 1_000_000).toFixed(1)}M</td>
                    <td className="px-4 py-3 text-neutral-400 font-mono">{m.calls.toLocaleString()}</td>
                    <td className="px-4 py-3 font-bold text-neutral-100">${m.costUsd.toFixed(0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Prediction chart */}
      {tab === 'prediction' && (
        <div className="bg-surface-800 border border-surface-700 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-sm font-semibold text-neutral-200">Proyección de costes mensuales</p>
              <p className="text-[10px] text-neutral-600">Histórico + predicción basada en tendencia</p>
            </div>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-blue-500 rounded inline-block" /> Real</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-violet-500 border-dashed border-t border-violet-400 inline-block" /> Predicción</span>
            </div>
          </div>

          {/* Bar chart */}
          <div className="flex items-end gap-2 h-40">
            {MONTHLY_PREDICTION.map(m => {
              const isActual  = m.actualUsd !== null;
              const height    = ((isActual ? m.actualUsd! : m.predictedUsd) / PREDICTION_BAR_MAX) * 100;
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-[9px] text-neutral-500 font-mono">
                    ${isActual ? m.actualUsd!.toLocaleString() : m.predictedUsd.toLocaleString()}
                  </span>
                  <div className="w-full rounded-t-md transition-all"
                    style={{
                      height: `${height}%`,
                      background: isActual
                        ? 'linear-gradient(to top, #3b82f6, #60a5fa)'
                        : 'linear-gradient(to top, #7c3aed40, #7c3aed80)',
                      border: isActual ? 'none' : '1px dashed #7c3aed60',
                    }}
                  />
                  <span className="text-[9px] text-neutral-600">{m.month}</span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 p-3 bg-violet-900/20 border border-violet-900/40 rounded-xl">
            <p className="text-[11px] text-violet-300">
              <span className="font-semibold">Predicción Q3 2026:</span> Crecimiento estimado del 18% mensual si el ritmo de adopción se mantiene. Coste proyectado en septiembre: <span className="font-bold">$2,390</span>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-surface-800 border border-surface-700 rounded-xl px-4 py-3 text-center">
      <p className="text-base font-bold" style={{ color }}>{value}</p>
      <p className="text-[10px] text-neutral-500 mt-0.5">{label}</p>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-neutral-600">{children}</th>;
}
