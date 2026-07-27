import type {
  PrioritizationFactors,
  PrioritizationResult,
  OpportunityPriority,
  OpportunityRisk,
  AnalysisOpportunity,
  MatrixPosition,
  MatrixQuadrant,
  BusinessArea,
} from '../types/analysis';

function impactScore(impact: 'high' | 'medium' | 'low'): number {
  return impact === 'high' ? 100 : impact === 'medium' ? 60 : 30;
}

function effortToCost(effort: 'high' | 'medium' | 'low'): number {
  return effort === 'low' ? 100 : effort === 'medium' ? 60 : 30;
}

function timeToScore(time: string): number {
  const lower = time.toLowerCase();
  if (lower.includes('día') || lower.includes('day') || lower.includes('horas') || lower.includes('hour')) return 100;
  if (lower.includes('semana') || lower.includes('week')) return 70;
  if (lower.includes('mes') || lower.includes('month')) return 40;
  if (lower.includes('trimestre') || lower.includes('quarter')) return 20;
  return 50;
}

function dependencyScore(dependencies: string[]): number {
  if (dependencies.length === 0) return 100;
  if (dependencies.length === 1) return 70;
  if (dependencies.length === 2) return 40;
  return 20;
}

function riskToScore(risk: OpportunityRisk): number {
  return risk === 'low' ? 100 : risk === 'medium' ? 60 : 30;
}

const WEIGHTS = {
  impact: 0.30,
  confidence: 0.20,
  cost: 0.15,
  time: 0.15,
  dependency: 0.10,
  risk: 0.10,
};

export function calculatePriority(factors: PrioritizationFactors): PrioritizationResult {
  const iScore = impactScore(factors.impact);
  const cScore = Math.min(100, factors.confidence);
  const costScore = effortToCost(factors.effort);
  const tScore = timeToScore(factors.implementationTime);
  const dScore = dependencyScore(factors.dependencies);
  const rScore = riskToScore(factors.risk);

  const total =
    iScore * WEIGHTS.impact +
    cScore * WEIGHTS.confidence +
    costScore * WEIGHTS.cost +
    tScore * WEIGHTS.time +
    dScore * WEIGHTS.dependency +
    rScore * WEIGHTS.risk;

  const score = Math.round(total);

  let priority: OpportunityPriority;
  if (score >= 80) priority = 'critical';
  else if (score >= 60) priority = 'high';
  else if (score >= 40) priority = 'medium';
  else priority = 'low';

  const parts: string[] = [];
  parts.push(`Impacto ${factors.impact} (${iScore}/100, peso ${Math.round(WEIGHTS.impact * 100)}%)`);
  parts.push(`Confianza ${factors.confidence}% (${cScore}/100, peso ${Math.round(WEIGHTS.confidence * 100)}%)`);
  parts.push(`Coste de implementación: esfuerzo ${factors.effort} (${costScore}/100, peso ${Math.round(WEIGHTS.cost * 100)}%)`);
  parts.push(`Tiempo requerido: ${factors.implementationTime} (${tScore}/100, peso ${Math.round(WEIGHTS.time * 100)}%)`);
  parts.push(`Dependencias: ${factors.dependencies.length === 0 ? 'sin dependencias' : factors.dependencies.join(', ')} (${dScore}/100, peso ${Math.round(WEIGHTS.dependency * 100)}%)`);
  parts.push(`Riesgo ${factors.risk} (${rScore}/100, peso ${Math.round(WEIGHTS.risk * 100)}%)`);
  parts.push(`Puntuación ponderada: ${score}/100 → prioridad ${priority.toUpperCase()}`);

  const explanation = parts.join('. ');

  return {
    priority,
    explanation,
    score,
    factors: {
      impactScore: iScore,
      confidenceScore: cScore,
      costScore,
      timeScore: tScore,
      dependencyScore: dScore,
      riskScore: rScore,
    },
  };
}

// ── Impact/Effort Matrix Positioning ────────────────────────────────────────

export function calculateMatrixPosition(opp: AnalysisOpportunity): MatrixPosition {
  const impactNum = opp.impact === 'high' ? 0.85 : opp.impact === 'medium' ? 0.55 : 0.25;
  const effortNum = opp.effort === 'low' ? 0.2 : opp.effort === 'medium' ? 0.5 : 0.8;

  // Add jitter based on confidence to spread points within quadrants
  const jitter = (opp.confidence - 50) / 200;
  const x = Math.max(0.05, Math.min(0.95, effortNum + jitter));
  const y = Math.max(0.05, Math.min(0.95, impactNum + jitter));

  let quadrant: MatrixQuadrant;
  if (impactNum >= 0.5 && effortNum < 0.5) quadrant = 'quick_wins';
  else if (impactNum >= 0.5 && effortNum >= 0.5) quadrant = 'strategic';
  else if (impactNum < 0.5 && effortNum < 0.5) quadrant = 'fill_ins';
  else quadrant = 'time_sinks';

  return { x, y, quadrant };
}

export const QUADRANT_INFO: Record<MatrixQuadrant, { label: string; description: string; color: string }> = {
  quick_wins: {
    label: 'Ganancias rápidas',
    description: 'Alto impacto, bajo esfuerzo. Ejecutar primero.',
    color: 'text-success-400 bg-success-500/10 border-success-500/20',
  },
  strategic: {
    label: 'Iniciativas estratégicas',
    description: 'Alto impacto, alto esfuerzo. Planificar a medio plazo.',
    color: 'text-brand-400 bg-brand-500/10 border-brand-500/20',
  },
  fill_ins: {
    label: 'Rellenos',
    description: 'Bajo impacto, bajo esfuerzo. Hacer cuando haya tiempo.',
    color: 'text-neutral-400 bg-neutral-500/10 border-neutral-500/20',
  },
  time_sinks: {
    label: 'Sumideros de tiempo',
    description: 'Bajo impacto, alto esfuerzo. Evitar o delegar.',
    color: 'text-warning-400 bg-warning-500/10 border-warning-500/20',
  },
};

// ── Filter definitions ──────────────────────────────────────────────────────

export const AREA_FILTERS: { id: BusinessArea; label: string }[] = [
  { id: 'marketing', label: 'Marketing' },
  { id: 'sales', label: 'Ventas' },
  { id: 'finance', label: 'Finanzas' },
  { id: 'operations', label: 'Operaciones' },
  { id: 'seo', label: 'SEO' },
  { id: 'automation', label: 'Automatización' },
  { id: 'customer_service', label: 'Atención al cliente' },
  { id: 'technology', label: 'Tecnología' },
];

export const QUICK_FILTERS = [
  { id: 'all' as const, label: 'Todas', filter: {} },
  { id: 'critical_only' as const, label: 'Solo críticas', filter: { priority: 'critical' as const } },
  { id: 'pending_only' as const, label: 'Solo pendientes', filter: { status: 'new' as const } },
  { id: 'approved_only' as const, label: 'Solo aprobadas', filter: { status: 'approved' as const } },
  { id: 'executed_only' as const, label: 'Solo ejecutadas', filter: { status: 'in_progress' as const } },
  { id: 'marketing' as const, label: 'Marketing', filter: { area: 'marketing' as const } },
  { id: 'sales' as const, label: 'Ventas', filter: { area: 'sales' as const } },
  { id: 'finance' as const, label: 'Finanzas', filter: { area: 'finance' as const } },
  { id: 'operations' as const, label: 'Operaciones', filter: { area: 'operations' as const } },
  { id: 'seo' as const, label: 'SEO', filter: { area: 'seo' as const } },
  { id: 'automation' as const, label: 'Automatización', filter: { area: 'automation' as const } },
  { id: 'customer_service' as const, label: 'Atención al cliente', filter: { area: 'customer_service' as const } },
  { id: 'technology' as const, label: 'Tecnología', filter: { area: 'technology' as const } },
];

export function filterOpportunities(
  opportunities: AnalysisOpportunity[],
  filters: { area?: string; priority?: string; status?: string; assignedTo?: string },
): AnalysisOpportunity[] {
  return opportunities.filter((opp) => {
    if (filters.area && filters.area !== 'all' && opp.category !== filters.area) return false;
    if (filters.priority && filters.priority !== 'all' && opp.priority !== filters.priority) return false;
    if (filters.status && filters.status !== 'all' && opp.status !== filters.status) return false;
    if (filters.assignedTo && filters.assignedTo !== 'all' && opp.assignedTo !== filters.assignedTo) return false;
    return true;
  });
}

export const OPPORTUNITY_STATUS_INFO: Record<string, { label: string; color: string }> = {
  new: { label: 'Nueva', color: 'text-brand-400 bg-brand-500/10' },
  reviewed: { label: 'Revisada', color: 'text-accent-400 bg-accent-500/10' },
  approved: { label: 'Aprobada', color: 'text-success-400 bg-success-500/10' },
  in_progress: { label: 'En ejecución', color: 'text-warning-400 bg-warning-500/10' },
  completed: { label: 'Completada', color: 'text-success-400 bg-success-500/10' },
  discarded: { label: 'Descartada', color: 'text-neutral-500 bg-neutral-500/10' },
  sent_to_copilot: { label: 'Enviada al Copilot', color: 'text-brand-400 bg-brand-500/10' },
  automated: { label: 'Automatizada', color: 'text-accent-400 bg-accent-500/10' },
};
