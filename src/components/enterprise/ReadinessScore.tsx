import { Rocket, TrendingUp, Shield, Sparkles, Eye } from 'lucide-react';
import { READINESS } from '../../lib/enterpriseMocks';

const ICONS: Record<string, React.ReactNode> = {
  Rocket:    <Rocket size={18} />,
  TrendingUp:<TrendingUp size={18} />,
  Shield:    <Shield size={18} />,
  Sparkles:  <Sparkles size={18} />,
  Eye:       <Eye size={18} />,
};

function scoreColor(s: number) {
  if (s >= 85) return '#34d399';
  if (s >= 65) return '#60a5fa';
  if (s >= 45) return '#f59e0b';
  return '#f87171';
}

function scoreLabel(s: number) {
  if (s >= 85) return 'Listo';
  if (s >= 65) return 'Avanzado';
  if (s >= 45) return 'Progreso';
  return 'Inicial';
}

function RadialGauge({ score, size = 96, color }: { score: number; size?: number; color: string }) {
  const r      = size / 2 - 8;
  const circ   = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="7"
        strokeDasharray={`${circ}`} strokeDashoffset={offset}
        strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
    </svg>
  );
}

const overall = Math.round(READINESS.reduce((s, d) => s + d.score, 0) / READINESS.length);

export function ReadinessScore() {
  return (
    <div className="p-6 space-y-6">
      {/* Overall score */}
      <div className="bg-surface-800 border border-surface-700 rounded-2xl p-6 flex items-center gap-8">
        <div className="relative flex-shrink-0">
          <RadialGauge score={overall} size={120} color={scoreColor(overall)} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-neutral-100">{overall}</span>
            <span className="text-[10px] text-neutral-500">/ 100</span>
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold text-neutral-100">Readiness Score</h2>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: `${scoreColor(overall)}18`, color: scoreColor(overall) }}>
              {scoreLabel(overall)}
            </span>
          </div>
          <p className="text-sm text-neutral-400 max-w-md leading-relaxed">
            Puntuación compuesta de 5 dimensiones críticas para el despliegue en producción de CompilerAI.
            Refleja el estado actual del proyecto en julio de 2026.
          </p>
          <div className="flex items-center gap-4 mt-3">
            {READINESS.map(d => (
              <div key={d.id} className="text-center">
                <p className="text-sm font-bold" style={{ color: scoreColor(d.score) }}>{d.score}</p>
                <p className="text-[9px] text-neutral-600">{d.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dimension cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {READINESS.map(dim => {
          const color = scoreColor(dim.score);
          return (
            <div key={dim.id} className="bg-surface-800 border border-surface-700 rounded-2xl overflow-hidden hover:border-surface-600 transition-all hover:shadow-lg"
              style={{ borderTopColor: color, borderTopWidth: 2 }}>
              <div className="p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${color}18`, color }}>
                      {ICONS[dim.icon]}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-neutral-200">{dim.label}</p>
                      <span className="text-[9px] font-semibold" style={{ color }}>{scoreLabel(dim.score)}</span>
                    </div>
                  </div>
                  <div className="relative flex-shrink-0">
                    <RadialGauge score={dim.score} size={56} color={color} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-bold text-neutral-200">{dim.score}</span>
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-neutral-500 leading-relaxed mb-3">{dim.description}</p>

                {/* Score bar */}
                <div className="h-1.5 bg-surface-700 rounded-full overflow-hidden mb-3">
                  <div className="h-full rounded-full transition-all" style={{ width: `${dim.score}%`, background: color }} />
                </div>

                {/* Findings */}
                <div className="space-y-1">
                  {dim.findings.map((f, i) => {
                    const positive = !f.startsWith('Sin') && !f.startsWith('Falta') && !f.startsWith('No hay');
                    return (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-[10px] flex-shrink-0 mt-0.5" style={{ color: positive ? '#34d399' : '#f59e0b' }}>
                          {positive ? '✓' : '○'}
                        </span>
                        <p className="text-[10px] text-neutral-400 leading-snug">{f}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}

        {/* Overall summary card */}
        <div className="bg-gradient-to-br from-blue-900/20 to-violet-900/20 border border-blue-900/30 rounded-2xl p-4">
          <p className="text-xs font-semibold text-blue-300 mb-2">Análisis Global</p>
          <p className="text-[10px] text-neutral-400 leading-relaxed mb-3">
            CompilerAI se encuentra en un estado avanzado de desarrollo con una arquitectura sólida y modular.
            Los principales vectores de mejora son la integración con modelos de IA reales, la implementación
            de observabilidad distribuida y un pipeline de CI/CD robusto.
          </p>
          <div className="space-y-1.5">
            <PriorityItem color="#34d399" label="UX y diseño — lista para demo/pitch" />
            <PriorityItem color="#60a5fa" label="Seguridad básica implementada (RLS)" />
            <PriorityItem color="#f59e0b" label="Pendiente: LLMs reales y CI/CD" />
            <PriorityItem color="#f87171" label="Observabilidad — requiere inversión" />
          </div>
        </div>
      </div>
    </div>
  );
}

function PriorityItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
      <p className="text-[10px] text-neutral-400">{label}</p>
    </div>
  );
}
