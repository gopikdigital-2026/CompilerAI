import { useState } from 'react';
import {
  LayoutDashboard, Building2, Activity, DollarSign, Layers, Target,
} from 'lucide-react';
import { ExecutiveDashboard } from '../../components/enterprise/ExecutiveDashboard';
import { OrganizationOverview } from '../../components/enterprise/OrganizationOverview';
import { AIHealthMonitor } from '../../components/enterprise/AIHealthMonitor';
import { CostIntelligence } from '../../components/enterprise/CostIntelligence';
import { ArchitectureReview } from '../../components/enterprise/ArchitectureReview';
import { ReadinessScore } from '../../components/enterprise/ReadinessScore';
import { GLOBAL_KPIS, SYSTEM_STATUS, READINESS } from '../../lib/enterpriseMocks';

type Tab = 'executive' | 'org' | 'health' | 'cost' | 'arch' | 'readiness';

const TABS: { id: Tab; label: string; icon: React.ReactNode; description: string }[] = [
  { id: 'executive', label: 'Executive',     icon: <LayoutDashboard size={15} />, description: 'KPIs globales y estado del sistema' },
  { id: 'org',       label: 'Organización',  icon: <Building2 size={15} />,       description: 'Usuarios, orgs y actividad'        },
  { id: 'health',    label: 'AI Health',     icon: <Activity size={15} />,        description: 'Estado de módulos de IA'          },
  { id: 'cost',      label: 'Costes',        icon: <DollarSign size={15} />,      description: 'Cost Intelligence y predicciones' },
  { id: 'arch',      label: 'Arquitectura',  icon: <Layers size={15} />,          description: 'Módulos, dependencias y roadmap'  },
  { id: 'readiness', label: 'Readiness',     icon: <Target size={15} />,          description: 'Puntuaciones de madurez'          },
];

const overall = Math.round(READINESS.reduce((s, d) => s + d.score, 0) / READINESS.length);
const allOk   = SYSTEM_STATUS.every(s => s.status === 'operational');

export default function EnterpriseCenter() {
  const [tab, setTab] = useState<Tab>('executive');

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top stats bar */}
      <div className="flex items-center gap-4 px-6 py-3 bg-surface-900 border-b border-surface-800 flex-shrink-0">
        <div className="flex items-center gap-2 mr-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <LayoutDashboard size={14} className="text-white" />
          </div>
          <span className="text-sm font-bold text-neutral-200">Enterprise Center</span>
          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-900/40 text-amber-400 border border-amber-900/50 uppercase tracking-wider">Internal</span>
        </div>

        <div className="h-4 w-px bg-surface-700" />

        {/* Mini KPI chips */}
        {GLOBAL_KPIS.slice(0, 4).map(kpi => (
          <div key={kpi.id} className="hidden lg:flex flex-col items-center">
            <span className="text-xs font-bold text-neutral-100">{kpi.value}</span>
            <span className="text-[9px] text-neutral-600">{kpi.label}</span>
          </div>
        ))}

        <div className="h-4 w-px bg-surface-700 hidden lg:block" />

        {/* System health pill */}
        <div className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
          allOk
            ? 'bg-green-900/30 text-green-400 border-green-900/50'
            : 'bg-amber-900/30 text-amber-400 border-amber-900/50'
        }`}>
          <div className={`w-1.5 h-1.5 rounded-full ${allOk ? 'bg-green-400' : 'bg-amber-400'}`}
            style={{ boxShadow: allOk ? '0 0 6px #34d399' : undefined }} />
          {allOk ? 'Todos operacionales' : 'Degradación parcial'}
        </div>

        {/* Readiness score */}
        <div className="hidden xl:flex items-center gap-1.5 ml-auto px-3 py-1 bg-surface-800 rounded-xl border border-surface-700">
          <Target size={12} className="text-blue-400" />
          <span className="text-[10px] text-neutral-400">Readiness</span>
          <span className="text-xs font-bold text-blue-400">{overall}/100</span>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-0.5 px-4 pt-3 pb-0 bg-surface-900 border-b border-surface-800 flex-shrink-0 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-semibold whitespace-nowrap transition-all border-b-2 ${
              tab === t.id
                ? 'bg-surface-800 text-neutral-100 border-blue-500'
                : 'text-neutral-500 border-transparent hover:text-neutral-300 hover:bg-surface-800/50'
            }`}
          >
            <span className={tab === t.id ? 'text-blue-400' : ''}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-surface-950">
        {tab === 'executive'  && <ExecutiveDashboard />}
        {tab === 'org'        && <OrganizationOverview />}
        {tab === 'health'     && <AIHealthMonitor />}
        {tab === 'cost'       && <CostIntelligence />}
        {tab === 'arch'       && <ArchitectureReview />}
        {tab === 'readiness'  && <ReadinessScore />}
      </div>
    </div>
  );
}
