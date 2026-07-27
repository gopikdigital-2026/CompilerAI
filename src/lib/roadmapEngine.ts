import type {
  AnalysisResult,
  AnalysisOpportunity,
  BusinessArea,
} from '../types/analysis';

export interface RoadmapPhase {
  phase: '7days' | '30days' | '90days';
  label: string;
  objective: string;
  actions: string[];
  expectedImpact: string;
  risks: string[];
  dependencies: string[];
  suggestedOwner: string;
  opportunities: AnalysisOpportunity[];
}

export interface Roadmap {
  phases: RoadmapPhase[];
  generatedAt: string;
}

const PHASE_LABELS = {
  '7days': 'Próximos 7 días',
  '30days': 'Próximos 30 días',
  '90days': 'Próximos 90 días',
};

const PHASE_OBJECTIVES = {
  '7days': 'Ejecutar ganancias rápidas y resolver problemas críticos inmediatos',
  '30days': 'Implementar oportunidades de alto impacto y construir fundamento de automatización',
  '90days': 'Transformación estratégica y escalado de automatizaciones exitosas',
};

const AREA_OWNERS: Record<BusinessArea, string> = {
  marketing: 'Director de Marketing',
  sales: 'Director de Ventas',
  finance: 'Director Financiero',
  operations: 'Director de Operaciones',
  customer_service: 'Jefe de Atención al Cliente',
  automation: 'Ingeniero de Automatización',
  technology: 'CTO / Director Técnico',
  seo: 'Especialista SEO',
};

function sortByPriority(opps: AnalysisOpportunity[]): AnalysisOpportunity[] {
  const order = { critical: 4, high: 3, medium: 2, low: 1 };
  return [...opps].sort((a, b) => order[b.priority] - order[a.priority]);
}

export function generateRoadmap(analysisResult: AnalysisResult): Roadmap {
  const allOpps = analysisResult.opportunities;

  // Quick wins: high impact, low effort → 7 days
  const quickWins = allOpps.filter((o) => o.impact === 'high' && o.effort === 'low');
  // Critical issues → 7 days
  const critical = allOpps.filter((o) => o.priority === 'critical' && !quickWins.includes(o));
  // High impact, medium effort → 30 days
  const strategic = allOpps.filter((o) => o.impact === 'high' && o.effort === 'medium');
  // Medium impact, low effort → 30 days
  const tactical = allOpps.filter((o) => o.impact === 'medium' && o.effort === 'low' && !quickWins.includes(o));
  // High effort → 90 days
  const longTerm = allOpps.filter((o) => o.effort === 'high');
  // Remaining → 90 days
  const remaining = allOpps.filter((o) =>
    !quickWins.includes(o) && !critical.includes(o) && !strategic.includes(o) && !tactical.includes(o) && !longTerm.includes(o)
  );

  const phase7Opps = sortByPriority([...quickWins, ...critical]);
  const phase30Opps = sortByPriority([...strategic, ...tactical]);
  const phase90Opps = sortByPriority([...longTerm, ...remaining]);

  function buildActions(opps: AnalysisOpportunity[]): string[] {
    return opps.map((o) => o.title);
  }

  function buildRisks(opps: AnalysisOpportunity[], analysisRisks: string[]): string[] {
    const oppRisks = opps.filter((o) => o.risk === 'high' || o.risk === 'medium').map((o) => `${o.title}: riesgo ${o.risk}`);
    return [...oppRisks, ...analysisRisks.slice(0, 2)];
  }

  function buildDependencies(opps: AnalysisOpportunity[]): string[] {
    const deps = new Set<string>();
    for (const o of opps) {
      for (const d of o.dependencies) deps.add(d);
    }
    return [...deps];
  }

  function pickOwner(opps: AnalysisOpportunity[]): string {
    if (opps.length === 0) return 'Director General';
    const areaCount: Record<string, number> = {};
    for (const o of opps) {
      areaCount[o.category] = (areaCount[o.category] ?? 0) + 1;
    }
    const topArea = Object.entries(areaCount).sort((a, b) => b[1] - a[1])[0]?.[0] as BusinessArea;
    return AREA_OWNERS[topArea] ?? 'Director General';
  }

  function impactSummary(opps: AnalysisOpportunity[]): string {
    if (opps.length === 0) return 'Sin oportunidades en esta fase';
    const high = opps.filter((o) => o.impact === 'high').length;
    const totalROI = opps.map((o) => o.economicImpact).join('; ');
    return `${opps.length} oportunidad(es), ${high} de alto impacto. ${totalROI}`;
  }

  const phases: RoadmapPhase[] = [
    {
      phase: '7days',
      label: PHASE_LABELS['7days'],
      objective: PHASE_OBJECTIVES['7days'],
      actions: buildActions(phase7Opps),
      expectedImpact: impactSummary(phase7Opps),
      risks: buildRisks(phase7Opps, analysisResult.risks),
      dependencies: buildDependencies(phase7Opps),
      suggestedOwner: pickOwner(phase7Opps),
      opportunities: phase7Opps,
    },
    {
      phase: '30days',
      label: PHASE_LABELS['30days'],
      objective: PHASE_OBJECTIVES['30days'],
      actions: buildActions(phase30Opps),
      expectedImpact: impactSummary(phase30Opps),
      risks: buildRisks(phase30Opps, analysisResult.risks),
      dependencies: buildDependencies(phase30Opps),
      suggestedOwner: pickOwner(phase30Opps),
      opportunities: phase30Opps,
    },
    {
      phase: '90days',
      label: PHASE_LABELS['90days'],
      objective: PHASE_OBJECTIVES['90days'],
      actions: buildActions(phase90Opps),
      expectedImpact: impactSummary(phase90Opps),
      risks: buildRisks(phase90Opps, analysisResult.risks),
      dependencies: buildDependencies(phase90Opps),
      suggestedOwner: pickOwner(phase90Opps),
      opportunities: phase90Opps,
    },
  ];

  return {
    phases,
    generatedAt: new Date().toISOString(),
  };
}
